import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

const MERCH_EDIT_ROLES = ['ADMIN', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'];
const MERCH_ROLES = ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'];
const ACTIVE_LOT_STATUSES = ['DRAFT', 'APPROVED', 'RELEASED', 'CLOSED'] as const;

type RequestedAllocation = { purchaseOrderId: string; color: string; size: string; qty: number };

type BreakdownRow = {
  purchaseOrderId: string;
  color: string;
  colorCode?: string | null;
  size: string;
  qty: number;
  ean?: string | null;
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function ymd(value?: Date | string | null) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function allocationKey(poId: string, color: string, size: string) {
  return `${poId}|||${color.trim().toUpperCase()}|||${size.trim().toUpperCase()}`;
}
function aggregateMatrix(rows: Array<{ color: string; colorCode?: string | null; size: string; qty: number }>) {
  const map = new Map<string, { color: string; colorCode?: string | null; sizes: Record<string, number>; totalQty: number }>();
  for (const row of rows) {
    const key = `${row.color}|||${row.colorCode || ''}`;
    const target = map.get(key) || { color: row.color, colorCode: row.colorCode, sizes: {}, totalQty: 0 };
    target.sizes[row.size] = (target.sizes[row.size] || 0) + row.qty;
    target.totalQty += row.qty;
    map.set(key, target);
  }
  const colors = [...map.values()];
  const sizes = Array.from(new Set(colors.flatMap((x) => Object.keys(x.sizes))));
  return { colors, sizes, totalQty: colors.reduce((s, x) => s + x.totalQty, 0) };
}

@Controller('production-lots')
@UseGuards(JwtAuthGuard)
export class ProductionLotsController {
  constructor(private prisma: PrismaService) {}


  @Get('styles')
  async searchStyles(@Query('q') qRaw: string | undefined, @Req() req: any) {
    const q = String(qRaw || '').trim();
    const roles: string[] = req.user.roles || [];
    const isMerch = roles.some(r => MERCH_ROLES.includes(r));
    const canSeeTeam = roles.includes('ADMIN') || roles.includes('MERCH_HEAD');
    const where: any = {};
    const and: any[] = [];
    if (isMerch && !canSeeTeam) and.push({ order: { OR: [{ merchandiserId: req.user.id }, { merchandiserId: null, createdById: req.user.id }] } });
    if (q) and.push({ OR: [
      { styleNo: { contains: q, mode: 'insensitive' } },
      { itemDescription: { contains: q, mode: 'insensitive' } },
      { order: { jobNo: { contains: q, mode: 'insensitive' } } },
      { order: { buyer: { name: { contains: q, mode: 'insensitive' } } } },
    ] });
    if (and.length) where.AND = and;
    const rows = await this.prisma.style.findMany({
      where,
      select: {
        id: true, styleNo: true, itemDescription: true, quantity: true,
        order: { select: { id: true, jobNo: true, merchandiserId: true, createdById: true, buyer: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { order: { createdAt: 'desc' } },
      take: q ? 80 : 40,
    });
    return rows.map(style => ({ style: { id: style.id, styleNo: style.styleNo, itemDescription: style.itemDescription, quantity: style.quantity }, order: style.order }));
  }

  @Get('styles/:styleId/overview')
  async overview(@Param('styleId') styleId: string, @Req() req: any) {
    const style = await this.loadStyle(styleId);
    this.assertView(style, req);

    const allocatedRows = await this.prisma.productionLotAllocation.findMany({
      where: {
        purchaseOrder: { styleId },
        lot: { status: { in: [...ACTIVE_LOT_STATUSES] as any } },
      },
      select: { purchaseOrderId: true, color: true, size: true, qty: true, lotId: true },
    });
    const allocatedByKey = new Map<string, number>();
    for (const row of allocatedRows) {
      const key = allocationKey(row.purchaseOrderId, row.color, row.size);
      allocatedByKey.set(key, (allocatedByKey.get(key) || 0) + row.qty);
    }

    const refs = style.purchaseOrders.map((po: any) => {
      let sourceRows: BreakdownRow[] = (po.breakdowns || []).map((b: any) => ({
        purchaseOrderId: po.id, color: b.color, colorCode: b.colorCode, size: b.size, qty: b.qty, ean: b.ean,
      }));
      let breakdownSource: 'REFERENCE' | 'STYLE_FALLBACK' | 'MISSING' = sourceRows.length ? 'REFERENCE' : 'MISSING';
      if (!sourceRows.length && style.purchaseOrders.length === 1 && po.totalQty === style.quantity && style.breakdowns?.length) {
        sourceRows = style.breakdowns.map((b: any) => ({ purchaseOrderId: po.id, color: b.color, colorCode: b.colorCode, size: b.size, qty: b.qty, ean: b.ean }));
        breakdownSource = 'STYLE_FALLBACK';
      }
      const breakdown = sourceRows.map((b) => {
        const allocatedQty = allocatedByKey.get(allocationKey(po.id, b.color, b.size)) || 0;
        return { ...b, allocatedQty, remainingQty: Math.max(0, b.qty - allocatedQty) };
      });
      const allocFromRows = breakdown.reduce((s, x) => s + x.allocatedQty, 0);
      const allocatedQty = sourceRows.length ? allocFromRows : allocatedRows.filter(x => x.purchaseOrderId === po.id).reduce((s, x) => s + x.qty, 0);
      return {
        id: po.id,
        reference: po.poNumber,
        referenceType: po.referenceType,
        market: po.market,
        destination: po.destination,
        totalQty: po.totalQty,
        allocatedQty,
        remainingQty: Math.max(0, po.totalQty - allocatedQty),
        ccd: ymd(po.ccd),
        shipmentDate: ymd(po.shipmentDate || po.ccd),
        breakdownSource,
        breakdown,
      };
    });

    const lots = style.productionLots.map((lot: any) => {
      const matrix = aggregateMatrix(lot.allocations || []);
      const referenceIds = Array.from(new Set((lot.allocations || []).map((a: any) => a.purchaseOrderId)));
      return { ...lot, shipmentDate: ymd(lot.shipmentDate), referenceIds, matrix };
    });
    const buyerName = style.order?.buyer?.name || '';
    return {
      style: {
        id: style.id,
        styleNo: style.styleNo,
        itemDescription: style.itemDescription,
        quantity: style.quantity,
        jobNo: style.order.jobNo,
        buyer: style.order.buyer,
      },
      selectorMode: /\bOVS\b/i.test(buyerName) ? 'MARKET' : 'PO',
      selectorLabel: /\bOVS\b/i.test(buyerName) ? 'Country / Market' : 'PO / Order Reference',
      references: refs,
      lots,
      overallMatrix: aggregateMatrix((style.breakdowns || []).length ? style.breakdowns : style.purchaseOrders.flatMap((po: any) => po.breakdowns || [])),
      allocatedQty: refs.reduce((s: number, x: any) => s + x.allocatedQty, 0),
      remainingQty: Math.max(0, style.quantity - refs.reduce((s: number, x: any) => s + x.allocatedQty, 0)),
    };
  }

  @Post('styles/:styleId')
  async create(@Param('styleId') styleId: string, @Body() body: {
    code?: string;
    name?: string;
    shipmentDate?: string;
    notes?: string;
    purchaseOrderIds?: string[];
    allocations?: RequestedAllocation[];
  }, @Req() req: any) {
    this.assertEdit(req);
    const style = await this.loadStyle(styleId);
    this.assertView(style, req);

    const selectedIds = Array.from(new Set((body.purchaseOrderIds || []).filter(Boolean)));
    const customRaw = Array.isArray(body.allocations) ? body.allocations.filter(x => x && x.purchaseOrderId && x.color && x.size && Number(x.qty) > 0) : [];
    const customMap = new Map<string, RequestedAllocation>();
    for (const row of customRaw) {
      const key = allocationKey(row.purchaseOrderId, row.color, row.size);
      const existing = customMap.get(key);
      customMap.set(key, existing ? { ...existing, qty: existing.qty + Number(row.qty) } : { ...row, qty: Number(row.qty) });
    }
    const custom = [...customMap.values()];
    if (!selectedIds.length && !custom.length) throw new BadRequestException('Select at least one PO / Market or enter an allocation');

    const poMap = new Map(style.purchaseOrders.map((po: any) => [po.id, po]));
    const ids = Array.from(new Set([...selectedIds, ...custom.map(x => x.purchaseOrderId)]));
    for (const id of ids) if (!poMap.has(id)) throw new BadRequestException('Selected PO / Market does not belong to this style');

    const existingAllocations = await this.prisma.productionLotAllocation.findMany({
      where: { purchaseOrderId: { in: ids }, lot: { status: { in: [...ACTIVE_LOT_STATUSES] as any } } },
      select: { purchaseOrderId: true, color: true, size: true, qty: true },
    });
    const used = new Map<string, number>();
    for (const row of existingAllocations) {
      const key = allocationKey(row.purchaseOrderId, row.color, row.size);
      used.set(key, (used.get(key) || 0) + row.qty);
    }

    const allocations: Array<BreakdownRow & { qty: number }> = [];
    if (custom.length) {
      for (const row of custom) {
        const po: any = poMap.get(row.purchaseOrderId);
        let source = (po.breakdowns || []).find((b: any) => b.color === row.color && b.size === row.size);
        if (!source && style.purchaseOrders.length === 1 && po.totalQty === style.quantity) {
          source = (style.breakdowns || []).find((b: any) => b.color === row.color && b.size === row.size);
        }
        if (!source) throw new BadRequestException(`${po.poNumber}: ${row.color} / ${row.size} is not available in the source breakdown`);
        const key = allocationKey(po.id, row.color, row.size);
        const already = used.get(key) || 0;
        if (already + Number(row.qty) > source.qty) throw new BadRequestException(`${po.poNumber}: ${row.color} / ${row.size} exceeds remaining quantity ${Math.max(0, source.qty - already)}`);
        allocations.push({ purchaseOrderId: po.id, color: source.color, colorCode: source.colorCode, size: source.size, qty: Number(row.qty), ean: source.ean });
        used.set(key, already + Number(row.qty));
      }
    } else {
      for (const id of selectedIds) {
        const po: any = poMap.get(id);
        let rows = po.breakdowns || [];
        if (!rows.length && style.purchaseOrders.length === 1 && po.totalQty === style.quantity && style.breakdowns?.length) rows = style.breakdowns;
        if (!rows.length) throw new BadRequestException(`${po.poNumber}: Color × Size breakdown is missing. Re-import the original buyer PO/PDF with the latest parser or enter a manual allocation.`);
        for (const source of rows) {
          const already = used.get(allocationKey(po.id, source.color, source.size)) || 0;
          const remaining = Math.max(0, source.qty - already);
          if (remaining > 0) allocations.push({ purchaseOrderId: po.id, color: source.color, colorCode: source.colorCode, size: source.size, qty: remaining, ean: source.ean });
        }
      }
    }
    if (!allocations.length) throw new BadRequestException('Selected PO / Market has no remaining quantity to allocate');

    const usedCodes = new Set((style.productionLots || []).map((x: any) => String(x.code || '').toUpperCase()));
    let nextNo = 1;
    while (usedCodes.has(`LOT-${String(nextNo).padStart(2, '0')}`)) nextNo += 1;
    const code = (body.code || `LOT-${String(nextNo).padStart(2, '0')}`).trim().toUpperCase();
    if (!code) throw new BadRequestException('Production Lot code is required');
    if (usedCodes.has(code)) throw new BadRequestException(`Production Lot code ${code} already exists for this style`);

    const uniqueShipDates = Array.from(new Set(ids.map(id => {
      const po: any = poMap.get(id);
      return ymd(po.shipmentDate || po.ccd);
    }).filter(Boolean)));
    if (!body.shipmentDate && uniqueShipDates.length > 1) throw new BadRequestException('Selected references have different shipment dates. Choose the Production Lot shipment date explicitly.');
    const shipmentDate = body.shipmentDate || uniqueShipDates[0] || undefined;
    const totalQty = allocations.reduce((s, x) => s + x.qty, 0);
    const matrix = aggregateMatrix(allocations);

    const lot = await this.prisma.productionLot.create({
      data: {
        styleId,
        code,
        name: body.name?.trim() || null,
        shipmentDate: shipmentDate ? new Date(`${shipmentDate}T00:00:00.000Z`) : null,
        totalQty,
        notes: body.notes?.trim() || null,
        createdByUserId: req.user.id,
        createdByName: req.user.name,
        sourceMetadata: jsonValue({ referenceIds: ids, selectorMode: /\bOVS\b/i.test(style.order.buyer.name) ? 'MARKET' : 'PO' }),
        allocations: { create: allocations.map(x => ({ purchaseOrderId: x.purchaseOrderId, color: x.color, colorCode: x.colorCode || null, size: x.size, qty: x.qty, ean: x.ean || null })) },
      },
      include: { allocations: true },
    });
    await this.prisma.auditLog.create({
      data: { userId: req.user.id, action: 'PRODUCTION_LOT_CREATED', entityType: 'PRODUCTION_LOT', entityId: lot.id, after: jsonValue({ styleId, code, totalQty, shipmentDate, referenceIds: ids, matrix }) },
    });
    return { ...lot, shipmentDate: ymd(lot.shipmentDate), matrix };
  }

  @Patch(':lotId/status')
  async status(@Param('lotId') lotId: string, @Body() body: { status: 'DRAFT'|'APPROVED'|'RELEASED'|'CLOSED'|'CANCELLED' }, @Req() req: any) {
    this.assertEdit(req);
    const allowed = ['DRAFT','APPROVED','RELEASED','CLOSED','CANCELLED'];
    if (!allowed.includes(body.status)) throw new BadRequestException('Invalid Production Lot status');
    const before = await this.prisma.productionLot.findUnique({ where: { id: lotId }, include: { style: { include: { order: true } } } });
    if (!before) throw new BadRequestException('Production Lot not found');
    this.assertView(before.style, req);
    const transitions: Record<string, string[]> = {
      DRAFT: ['DRAFT','APPROVED','CANCELLED'],
      APPROVED: ['APPROVED','DRAFT','RELEASED','CANCELLED'],
      RELEASED: ['RELEASED','CLOSED'],
      CLOSED: ['CLOSED'],
      CANCELLED: ['CANCELLED'],
    };
    if (!(transitions[String(before.status)] || []).includes(body.status)) throw new BadRequestException(`Production Lot cannot move from ${before.status} to ${body.status}`);
    const now = new Date();
    const updated = await this.prisma.productionLot.update({
      where: { id: lotId },
      data: {
        status: body.status as any,
        approvedAt: body.status === 'APPROVED' ? now : before.approvedAt,
        approvedByName: body.status === 'APPROVED' ? req.user.name : before.approvedByName,
        releasedAt: body.status === 'RELEASED' ? now : before.releasedAt,
      },
    });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'PRODUCTION_LOT_STATUS', entityType: 'PRODUCTION_LOT', entityId: lotId, before: jsonValue({ status: before.status }), after: jsonValue({ status: body.status }) } });
    return updated;
  }

  private assertEdit(req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some(r => MERCH_EDIT_ROLES.includes(r))) throw new ForbiddenException('Production Lot update is not allowed for this user');
  }

  private assertView(style: any, req: any) {
    const roles: string[] = req.user.roles || [];
    const isMerch = roles.some(r => MERCH_ROLES.includes(r));
    const canSeeTeam = roles.includes('ADMIN') || roles.includes('MERCH_HEAD');
    if (isMerch && !canSeeTeam && style.order?.merchandiserId !== req.user.id && !(style.order?.merchandiserId === null && style.order?.createdById === req.user.id)) {
      throw new ForbiddenException('You can access only your assigned jobs');
    }
  }

  private async loadStyle(styleId: string) {
    const style = await this.prisma.style.findUnique({
      where: { id: styleId },
      include: {
        breakdowns: true,
        purchaseOrders: { include: { breakdowns: true } },
        productionLots: { include: { allocations: true }, orderBy: { createdAt: 'asc' } },
        order: { include: { buyer: true } },
      },
    });
    if (!style) throw new BadRequestException('Style not found');
    return style;
  }
}
