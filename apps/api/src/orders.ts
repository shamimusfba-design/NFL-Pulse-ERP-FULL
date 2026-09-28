import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';
import { resolveJobNumber } from './job-number';

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const MERCH_ROLES = ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'];
const BULK_MERCH_EDIT_ROLES = ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD', 'ADMIN'];
const ACTION_STATUS = ['DONE', 'PENDING', 'OVERDUE', 'NA'] as const;

class BreakdownDto {
  @IsString() color!: string;
  @IsString() size!: string;
  @IsInt() @Min(0) qty!: number;
}
class PoDto {
  @IsString() poNumber!: string;
  @IsInt() @Min(1) totalQty!: number;
  @IsDateString() ccd!: string;
  @IsOptional() @IsDateString() shipmentDate?: string;
  @IsOptional() @IsString() referenceType?: string;
  @IsOptional() @IsString() destination?: string;
  @IsOptional() @IsString() market?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BreakdownDto) breakdowns?: BreakdownDto[];
}
class StyleDto {
  @IsString() styleNo!: string;
  @IsOptional() @IsString() itemDescription?: string;
  @IsOptional() @IsString() itemImageUrl?: string;
  @IsOptional() @IsNumber() fobPrice?: number;
  @IsInt() @Min(1) quantity!: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => BreakdownDto) breakdowns!: BreakdownDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => PoDto) pos!: PoDto[];
}
export class CreateOrderDto {
  @IsString() buyerId!: string;
  @IsOptional() @IsString() merchandiserId?: string;
  @IsOptional() @IsIn(['NEW', 'REPEAT']) jobType?: 'NEW' | 'REPEAT';
  @IsOptional() @IsString() repeatBaseJobNo?: string;
  @IsOptional() @IsString() repeatLotNo?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => StyleDto) styles!: StyleDto[];
}
class JobSequenceDto {
  @IsInt() @Min(1) lastJobNo!: number;
}

class MerchFollowUpDto {
  @IsOptional() @IsIn(ACTION_STATUS) fabricOrderSheetStatus?: typeof ACTION_STATUS[number];
  @IsOptional() @IsIn(ACTION_STATUS) labDipStatus?: typeof ACTION_STATUS[number];
  @IsOptional() @IsIn(ACTION_STATUS) printStrikeOffStatus?: typeof ACTION_STATUS[number];
  @IsOptional() @IsIn(ACTION_STATUS) trimsOrderingStatus?: typeof ACTION_STATUS[number];
  @IsOptional() @IsIn(ACTION_STATUS) fileHandoverStatus?: typeof ACTION_STATUS[number];
  @IsOptional() @IsIn(ACTION_STATUS) workOrderStatus?: typeof ACTION_STATUS[number];
  @IsOptional() @IsDateString() fabricOrderSheetActualDate?: string;
  @IsOptional() @IsDateString() labDipActualDate?: string;
  @IsOptional() @IsDateString() printStrikeOffActualDate?: string;
  @IsOptional() @IsDateString() trimsOrderingActualDate?: string;
  @IsOptional() @IsDateString() fileHandoverActualDate?: string;
  @IsOptional() @IsDateString() workOrderActualDate?: string;
  @IsOptional() @IsString() presentStatus?: string;
  @IsOptional() @IsString() merchandiser?: string;
  @IsOptional() @IsString() remarks?: string;
}

class ReviseStyleQuantityDto {
  @IsInt() @Min(1) newQuantity!: number;
  @IsString() reason!: string;
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private prisma: PrismaService) {}

  @Get('job-sequence')
  async jobSequence() {
    const factory = await this.prisma.factory.findUnique({ where: { code: 'NFL' } });
    if (!factory) throw new BadRequestException('NFL factory master is missing');
    const year = 0;
    const seq = await this.prisma.jobSequence.findUnique({ where: { factoryId_year: { factoryId: factory.id, year } } });
    const lastValue = seq?.lastValue || 0;
    return { year, lastJobNo: lastValue, nextJobNo: lastValue + 1 };
  }

  @Post('job-sequence')
  async setJobSequence(@Body() dto: JobSequenceDto, @Req() req: any) {
    if (!req.user.roles?.includes('ADMIN')) throw new ForbiddenException('Only an administrator can set the current running Job No');
    const factory = await this.prisma.factory.findUnique({ where: { code: 'NFL' } });
    if (!factory) throw new BadRequestException('NFL factory master is missing');
    const year = 0;
    const current = await this.prisma.jobSequence.findUnique({ where: { factoryId_year: { factoryId: factory.id, year } } });
    if (current && dto.lastJobNo < current.lastValue) throw new BadRequestException(`Current sequence is already ${current.lastValue}. It cannot be moved backward.`);
    const seq = await this.prisma.jobSequence.upsert({
      where: { factoryId_year: { factoryId: factory.id, year } },
      update: { lastValue: dto.lastJobNo },
      create: { factoryId: factory.id, year, lastValue: dto.lastJobNo },
    });
    return { year, lastJobNo: seq.lastValue, nextJobNo: seq.lastValue + 1 };
  }

  @Get('repeat-bases')
  async repeatBases(@Req() req: any) {
    const roles: string[] = req.user.roles || [];
    const isMerch = roles.some((role) => MERCH_ROLES.includes(role));
    const canSeeTeam = roles.includes('ADMIN') || roles.includes('MERCH_HEAD');
    const rows = await this.prisma.order.findMany({
      where: isMerch && !canSeeTeam ? { OR: [{ merchandiserId: req.user.id }, { merchandiserId: null, createdById: req.user.id }] } : undefined,
      select: { jobNo: true },
      orderBy: { createdAt: 'desc' },
    });
    return Array.from(new Set(rows.map((o) => String(o.jobNo || '').split(' ')[0]).filter((x) => /^\d+$/.test(x))));
  }

  @Get('dashboard-summary')
  async dashboardSummary(@Req() req:any) {
    const roles:string[]=req.user.roles||[];const isMerch=roles.some((role)=>MERCH_ROLES.includes(role));const canSeeTeam=roles.includes('ADMIN')||roles.includes('MERCH_HEAD');
    const where:any=isMerch&&!canSeeTeam?{OR:[{merchandiserId:req.user.id},{merchandiserId:null,createdById:req.user.id}]}:undefined;
    const [jobCount,qty,buyerGroups]=await Promise.all([
      this.prisma.order.count({where}),
      this.prisma.order.aggregate({where,_sum:{totalQty:true}}),
      this.prisma.order.groupBy({by:['buyerId'],where,_sum:{totalQty:true},orderBy:{_sum:{totalQty:'desc'}},take:8}),
    ]);
    const buyers=await this.prisma.buyer.findMany({where:{id:{in:buyerGroups.map(x=>x.buyerId)}}});const names=new Map(buyers.map(x=>[x.id,x.name]));
    return {jobCount,totalQty:Number(qty._sum.totalQty||0),buyers:buyerGroups.map(x=>({name:names.get(x.buyerId)||'Unknown',qty:Number(x._sum.totalQty||0)}))};
  }

  @Get()
  list(@Req() req: any) {
    const roles: string[] = req.user.roles || [];
    const isMerch = roles.some((role) => MERCH_ROLES.includes(role));
    const canSeeTeam = roles.includes('ADMIN') || roles.includes('MERCH_HEAD');
    return this.prisma.order.findMany({
      where: isMerch && !canSeeTeam ? { OR: [{ merchandiserId: req.user.id }, { merchandiserId: null, createdById: req.user.id }] } : undefined,
      include: { buyer: true, factory: true, styles: { include: { purchaseOrders: { include: { breakdowns: true } }, breakdowns: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: true,
        factory: true,
        styles: { include: { purchaseOrders: { include: { breakdowns: true } }, breakdowns: true } },
      },
    });
    if (!order) throw new BadRequestException('Order not found');
    const roles: string[] = req.user.roles || [];
    const isMerch = roles.some((role) => MERCH_ROLES.includes(role));
    const canSeeTeam = roles.includes('ADMIN') || roles.includes('MERCH_HEAD');
    if (isMerch && !canSeeTeam && order.merchandiserId !== req.user.id && !(order.merchandiserId === null && order.createdById === req.user.id)) {
      throw new ForbiddenException('You can view only your assigned jobs');
    }
    return order;
  }

  @Patch('styles/:styleId/merchandising-followup')
  async updateMerchandisingFollowUp(@Param('styleId') styleId: string, @Body() dto: MerchFollowUpDto, @Req() req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((role) => BULK_MERCH_EDIT_ROLES.includes(role))) {
      throw new ForbiddenException('Bulk merchandising follow-up update is not allowed for this user');
    }

    const style = await this.prisma.style.findUnique({
      where: { id: styleId },
      include: { order: true },
    });
    if (!style) throw new BadRequestException('Style not found');

    const canEditTeam = roles.includes('ADMIN') || roles.includes('MERCH_HEAD');
    if (!canEditTeam && style.order.merchandiserId !== req.user.id && !(style.order.merchandiserId === null && style.order.createdById === req.user.id)) {
      throw new ForbiddenException('You can update only your assigned jobs');
    }

    const existing = (style.sourceMetadata || {}) as Record<string, any>;
    const before = existing.merchandisingFollowUp || {};
    const nowIso = new Date().toISOString();
    const cleanDate = (v?: string) => (v ? new Date(v).toISOString() : undefined);

    const nextFollowUp = {
      ...before,
      ...Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined)),
      fabricOrderSheetActualDate: cleanDate(dto.fabricOrderSheetActualDate) ?? before.fabricOrderSheetActualDate,
      labDipActualDate: cleanDate(dto.labDipActualDate) ?? before.labDipActualDate,
      printStrikeOffActualDate: cleanDate(dto.printStrikeOffActualDate) ?? before.printStrikeOffActualDate,
      trimsOrderingActualDate: cleanDate(dto.trimsOrderingActualDate) ?? before.trimsOrderingActualDate,
      fileHandoverActualDate: cleanDate(dto.fileHandoverActualDate) ?? before.fileHandoverActualDate,
      workOrderActualDate: cleanDate(dto.workOrderActualDate) ?? before.workOrderActualDate,
      updatedByUserId: req.user.id,
      updatedByName: req.user.name,
      updatedAt: nowIso,
    };

    const nextMetadata = {
      ...existing,
      merchandisingFollowUp: nextFollowUp,
    };

    const updated = await this.prisma.style.update({
      where: { id: styleId },
      data: { sourceMetadata: toPrismaJson(nextMetadata) },
      include: { order: { include: { buyer: true } }, purchaseOrders: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'MERCH_FOLLOWUP_UPDATED',
        entityType: 'STYLE',
        entityId: styleId,
        before: toPrismaJson(before),
        after: toPrismaJson(nextFollowUp),
      },
    });

    return updated;
  }

  @Patch('styles/:styleId/quantity')
  async reviseStyleQuantity(@Param('styleId') styleId: string, @Body() dto: ReviseStyleQuantityDto, @Req() req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((role) => BULK_MERCH_EDIT_ROLES.includes(role))) {
      throw new ForbiddenException('Order quantity revision is not allowed for this user');
    }
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException('Revision reason is required');

    const style = await this.prisma.style.findUnique({
      where: { id: styleId },
      include: { order: true, breakdowns: true, purchaseOrders: true, productionLots: { where: { status: { not: 'CANCELLED' } }, include: { allocations: true } } },
    });
    if (!style) throw new BadRequestException('Style not found');

    const canEditTeam = roles.includes('ADMIN') || roles.includes('MERCH_HEAD');
    if (!canEditTeam && style.order.merchandiserId !== req.user.id && !(style.order.merchandiserId === null && style.order.createdById === req.user.id)) {
      throw new ForbiddenException('You can revise only your assigned jobs');
    }
    if (style.quantity === dto.newQuantity) throw new BadRequestException('New quantity is the same as the current quantity');
    const allocatedToProductionLots = (style.productionLots || []).reduce((sum, lot) => sum + (lot.allocations || []).reduce((s, row) => s + row.qty, 0), 0);
    if (dto.newQuantity < allocatedToProductionLots) throw new BadRequestException(`Revised quantity cannot be below ${allocatedToProductionLots} pcs already reserved in active Production Lots`);

    const existing = (style.sourceMetadata || {}) as Record<string, any>;
    const history = Array.isArray(existing.qtyRevisionHistory) ? existing.qtyRevisionHistory : [];
    const breakdownTotal = style.breakdowns.reduce((sum, row) => sum + row.qty, 0);
    const poTotal = style.purchaseOrders.reduce((sum, po) => sum + po.totalQty, 0);
    const revision = {
      oldQuantity: style.quantity,
      newQuantity: dto.newQuantity,
      reason,
      breakdownTotalAtRevision: breakdownTotal,
      poTotalAtRevision: poTotal,
      productionLotAllocatedAtRevision: allocatedToProductionLots,
      detailsAligned: breakdownTotal === dto.newQuantity && poTotal === dto.newQuantity,
      revisedByUserId: req.user.id,
      revisedByName: req.user.name,
      revisedAt: new Date().toISOString(),
    };
    const nextMetadata = {
      ...existing,
      qtyRevisionHistory: [...history, revision],
      qtyRevisionReviewRequired: !revision.detailsAligned,
      qtyRevisionLastAt: revision.revisedAt,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedStyle = await tx.style.update({
        where: { id: styleId },
        data: { quantity: dto.newQuantity, sourceMetadata: toPrismaJson(nextMetadata) },
        include: { breakdowns: true, purchaseOrders: true },
      });

      const siblingStyles = await tx.style.findMany({
        where: { orderId: style.orderId, id: { not: styleId } },
        select: { quantity: true },
      });
      const revisedOrderTotal = dto.newQuantity + siblingStyles.reduce((sum, row) => sum + row.quantity, 0);
      await tx.order.update({ where: { id: style.orderId }, data: { totalQty: revisedOrderTotal } });

      const cadUser = await tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'CAD' } } } } });
      await tx.task.create({
        data: {
          title: `CAD consumption re-check: ${style.order.jobNo} / ${style.styleNo} (${style.quantity} → ${dto.newQuantity})`,
          module: 'CAD',
          entityType: 'STYLE',
          entityId: styleId,
          orderId: style.orderId,
          ownerUserId: cadUser?.id,
          ownerRoleCode: 'CAD',
          priority: 'HIGH',
          blockedReason: revision.detailsAligned ? null : 'Order quantity revised; PO and/or color-size totals need review',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'ORDER_QTY_REVISED',
          entityType: 'STYLE',
          entityId: styleId,
          before: toPrismaJson({ quantity: style.quantity, breakdownTotal, poTotal }),
          after: toPrismaJson(revision),
        },
      });
      return { updatedStyle, revisedOrderTotal };
    });

    return {
      ...result,
      revision,
      warning: revision.detailsAligned ? null : `Revised qty is ${dto.newQuantity}; color-size total is ${breakdownTotal} and PO total is ${poTotal}. Review the revised PO/color-size details.`,
      cadTaskCreated: true,
    };
  }

  @Post()
  async create(@Body() dto: CreateOrderDto, @Req() req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((role) => ['ADMIN', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'].includes(role))) {
      throw new ForbiddenException('Bulk Order Entry is not allowed for this user');
    }
    if (!dto.styles.length) throw new BadRequestException('At least one style is required');
    const warnings: string[] = [];
    dto.styles.forEach((style) => {
      const breakdownTotal = style.breakdowns.reduce((s, x) => s + x.qty, 0);
      const poTotal = style.pos.reduce((s, x) => s + x.totalQty, 0);
      if (breakdownTotal !== style.quantity) warnings.push(`${style.styleNo}: color/size total ${breakdownTotal} ≠ style qty ${style.quantity}`);
      if (poTotal !== style.quantity) warnings.push(`${style.styleNo}: PO / Market total ${poTotal} ≠ style qty ${style.quantity}`);
      style.pos.forEach((po) => {
        const refBreakdownTotal = (po.breakdowns || []).reduce((sum, row) => sum + row.qty, 0);
        if ((po.breakdowns || []).length && refBreakdownTotal !== po.totalQty) warnings.push(`${style.styleNo} / ${po.poNumber}: Color × Size total ${refBreakdownTotal} ≠ reference qty ${po.totalQty}`);
      });
      if (style.pos.length > 1 && style.pos.some((po) => !(po.breakdowns || []).length)) warnings.push(`${style.styleNo}: one or more PO / Market references have no reference-level Color × Size breakdown. Exact partial Production Lot allocation will require that breakdown.`);
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const factory = await tx.factory.findUnique({ where: { code: 'NFL' } });
      if (!factory) throw new BadRequestException('NFL factory master is missing');
      const buyer = await tx.buyer.findUnique({ where: { id: dto.buyerId } });
      if (!buyer) throw new BadRequestException('Buyer not found');

      const job = await resolveJobNumber(tx, factory.id, dto, buyer.code || buyer.name);
      const totalQty = dto.styles.reduce((s, x) => s + x.quantity, 0);
      const userIsMerch = roles.some((role) => MERCH_ROLES.includes(role));
      const merchandiserId = userIsMerch && !roles.includes('MERCH_HEAD') ? req.user.id : dto.merchandiserId;

      const order = await tx.order.create({
        data: {
          jobNo: job.jobNo,
          factoryId: factory.id,
          buyerId: buyer.id,
          merchandiserId,
          totalQty,
          createdById: req.user.id,
          sourceMetadata: toPrismaJson({ jobType: job.jobType, baseJobNo: job.baseJobNo, lotNo: job.lotNo, buyerShortCode: job.buyerShortCode }),
          styles: {
            create: dto.styles.map((style) => ({
              styleNo: style.styleNo,
              itemDescription: style.itemDescription,
              quantity: style.quantity,
              sourceMetadata: toPrismaJson({ itemImageUrl: style.itemImageUrl || null, fobPrice: style.fobPrice ?? null, merchandisingFollowUp: {} }),
              breakdowns: { create: style.breakdowns },
              purchaseOrders: { create: style.pos.map((po) => ({
                poNumber: po.poNumber,
                referenceType: po.referenceType || 'PO',
                totalQty: po.totalQty,
                ccd: new Date(po.ccd),
                shipmentDate: po.shipmentDate ? new Date(po.shipmentDate) : new Date(po.ccd),
                destination: po.destination || undefined,
                market: po.market || undefined,
                breakdowns: (po.breakdowns || []).length ? { create: po.breakdowns } : undefined,
              })) },
            })),
          },
        },
        include: { buyer: true, factory: true, styles: { include: { breakdowns: true, purchaseOrders: true } } },
      });

      const [ieUser, cadUser, planningUser] = await Promise.all([
        tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'IE' } } } } }),
        tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'CAD' } } } } }),
        tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'PLANNING' } } } } }),
      ]);
      await tx.task.createMany({ data: [
        ...order.styles.map((style) => ({ title: `Complete IE / Operation Bulletin for ${job.jobNo} / ${style.styleNo}`, module: 'IE', entityType: 'STYLE', entityId: style.id, orderId: order.id, ownerUserId: ieUser?.id, ownerRoleCode: 'IE', priority: 'HIGH' as const })),
        { title: `CAD consumption required for ${job.jobNo}`, module: 'CAD', entityType: 'ORDER', entityId: order.id, orderId: order.id, ownerUserId: cadUser?.id, ownerRoleCode: 'CAD', priority: 'HIGH' },
        { title: `Generate / approve T&A for ${job.jobNo}`, module: 'T&A', entityType: 'ORDER', entityId: order.id, orderId: order.id, ownerUserId: planningUser?.id, ownerRoleCode: 'PLANNING', priority: 'HIGH' },
      ] });
      await tx.auditLog.create({
        data: { userId: req.user.id, action: 'ORDER_CREATED', entityType: 'ORDER', entityId: order.id, after: toPrismaJson({ jobNo: job.jobNo, totalQty, jobType: job.jobType, baseJobNo: job.baseJobNo, lotNo: job.lotNo }) },
      });
      return order;
    });

    return { order: result, warnings };
  }
}
