import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

const FORM_TYPES = ['SMS_SAMPLE_ORDER','TNA_PLAN','BULK_FABRIC_ORDER'] as const;
type CompanyFormType = typeof FORM_TYPES[number];
const FORM_STATUSES = ['DRAFT','PLANNING_PENDING','READY_TO_PRINT','APPROVED'] as const;
const MERCH_ROLES = ['MERCH_SAMPLE','MERCH_BULK','MERCH_BOTH','MERCH_HEAD'];

type StoredForm = {
  id: string;
  type: CompanyFormType;
  templateVersion: string;
  status: typeof FORM_STATUSES[number];
  revision: number;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
  createdByName?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  data: Record<string, any>;
};

class CreateFormDto {
  @IsIn(FORM_TYPES) type!: CompanyFormType;
  @IsOptional() @IsString() productionLotId?: string;
}
class UpdateFormDto {
  @IsOptional() @IsIn(FORM_STATUSES) status?: typeof FORM_STATUSES[number];
  @IsOptional() @IsObject() data?: Record<string, any>;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function ymd(v: any) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
function text(v: any) { return v === null || v === undefined ? '' : String(v); }
function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function formId() {
  return `FORM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
function roleAllowed(userRoles: string[], type: CompanyFormType, editing = false) {
  if (userRoles.includes('ADMIN') || userRoles.includes('MERCH_HEAD')) return true;
  if (type === 'SMS_SAMPLE_ORDER') return userRoles.includes('MERCH_SAMPLE') || userRoles.includes('MERCH_BOTH');
  if (type === 'BULK_FABRIC_ORDER') return userRoles.includes('MERCH_BULK') || userRoles.includes('MERCH_BOTH');
  if (type === 'TNA_PLAN') {
    if (userRoles.includes('PLANNING')) return true;
    return userRoles.includes('MERCH_BULK') || userRoles.includes('MERCH_BOTH');
  }
  return !editing;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private prisma: PrismaService) {}

  @Get('styles')
  async searchStyles(@Query('q') qRaw: string | undefined, @Req() req: any) {
    const q = text(qRaw).trim();
    const roles: string[] = req.user.roles || [];
    const ownOnly = roles.some(r => MERCH_ROLES.includes(r)) && !roles.includes('MERCH_HEAD') && !roles.includes('ADMIN');
    const where: any = {};
    if (ownOnly) where.order = { OR: [{ merchandiserId: req.user.id }, { merchandiserId: null, createdById: req.user.id }] };
    if (q) {
      const or = [
        { styleNo: { contains: q, mode: 'insensitive' } },
        { itemDescription: { contains: q, mode: 'insensitive' } },
        { order: { jobNo: { contains: q, mode: 'insensitive' } } },
        { order: { buyer: { name: { contains: q, mode: 'insensitive' } } } },
      ];
      where.AND = [{ OR: or }];
    }
    const rows = await this.prisma.style.findMany({
      where,
      include: {
        order: { include: { buyer: true, factory: true } },
        purchaseOrders: { include: { breakdowns: true } },
        productionLots: { where: { status: { not: 'CANCELLED' } }, select: { id: true, code: true, name: true, totalQty: true, shipmentDate: true, status: true }, orderBy: { createdAt: 'asc' } },
        breakdowns: true,
      },
      orderBy: { order: { createdAt: 'desc' } },
      take: q ? 50 : 30,
    });
    return rows.map(style => ({
      id: style.id,
      styleNo: style.styleNo,
      itemDescription: style.itemDescription,
      quantity: style.quantity,
      collection: style.collection,
      season: style.season,
      sourceMetadata: style.sourceMetadata,
      breakdowns: style.breakdowns,
      purchaseOrders: style.purchaseOrders,
      productionLots: style.productionLots,
      order: {
        id: style.order.id,
        jobNo: style.order.jobNo,
        totalQty: style.order.totalQty,
        merchandiserId: style.order.merchandiserId,
        sourceMetadata: style.order.sourceMetadata,
        buyer: style.order.buyer,
        factory: style.order.factory,
      },
    }));
  }

  @Get('styles/:styleId/forms')
  async listForms(@Param('styleId') styleId: string, @Req() req: any) {
    const style = await this.loadStyle(styleId);
    this.assertView(style, req);
    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    return { style: this.context(style), forms: Array.isArray(sm.companyForms) ? sm.companyForms : [] };
  }

  @Get('styles/:styleId/forms/:formId')
  async getForm(@Param('styleId') styleId: string, @Param('formId') id: string, @Req() req: any) {
    const style = await this.loadStyle(styleId);
    this.assertView(style, req);
    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    const form = (Array.isArray(sm.companyForms) ? sm.companyForms : []).find((x: any) => x.id === id);
    if (!form) throw new BadRequestException('Company form not found');
    return { style: this.context(style), form };
  }

  @Post('styles/:styleId/forms')
  async createForm(@Param('styleId') styleId: string, @Body() dto: CreateFormDto, @Req() req: any) {
    const style = await this.loadStyle(styleId);
    this.assertView(style, req);
    const roles: string[] = req.user.roles || [];
    if (!roleAllowed(roles, dto.type)) throw new ForbiddenException('This document type is not available for your role');

    if (dto.productionLotId && !style.productionLots.some((x: any) => x.id === dto.productionLotId)) throw new BadRequestException('Production Lot not found for this style');
    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    const existing: StoredForm[] = Array.isArray(sm.companyForms) ? sm.companyForms : [];
    const now = new Date().toISOString();
    const form: StoredForm = {
      id: formId(),
      type: dto.type,
      templateVersion: 'NFL-COMPANY-STANDARD-2026.09',
      status: 'DRAFT',
      revision: 1,
      createdAt: now,
      updatedAt: now,
      createdByUserId: req.user.id,
      createdByName: req.user.name,
      updatedByUserId: req.user.id,
      updatedByName: req.user.name,
      data: this.defaultData(style, dto.type, dto.productionLotId ? style.productionLots.find((x: any) => x.id === dto.productionLotId) : undefined),
    };
    const next = [...existing, form];
    await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: jsonValue({ ...sm, companyForms: next }) } });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'COMPANY_FORM_CREATED', entityType: 'STYLE', entityId: style.id, after: jsonValue(form) } });
    return form;
  }

  @Post('styles/:styleId/forms/:formId/sync-order-data')
  async syncOrderData(@Param('styleId') styleId: string, @Param('formId') id: string, @Req() req: any) {
    const style = await this.loadStyle(styleId);
    this.assertView(style, req);
    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    const forms: StoredForm[] = Array.isArray(sm.companyForms) ? sm.companyForms : [];
    const index = forms.findIndex(x => x.id === id);
    if (index < 0) throw new BadRequestException('Company form not found');
    const before = forms[index];
    const roles: string[] = req.user.roles || [];
    if (!roleAllowed(roles, before.type, true)) throw new ForbiddenException('You cannot update this document type');

    const productionLotId = text(before.data?.productionLotId);
    const productionLot = productionLotId ? style.productionLots.find((x: any) => x.id === productionLotId) : undefined;
    const fresh = this.defaultData(style, before.type, productionLot);
    // Only refresh fields owned by Order Entry / Production Lot. Document-specific manual fields remain untouched.
    const autoKeys = [
      'buyer','buyerCode','jobNo','styleNo','styleName','garmentDescription','collection','season','merchandiser',
      'totalOrderQty','productionLotId','productionLotCode','productionLotName','poRows','sizeColumns','sizeBreakdown',
    ];
    const nextData = { ...(before.data || {}) } as Record<string, any>;
    for (const key of autoKeys) nextData[key] = (fresh as any)[key];
    const now = new Date().toISOString();
    const nextForm: StoredForm = {
      ...before,
      data: nextData,
      revision: before.revision + 1,
      updatedAt: now,
      updatedByUserId: req.user.id,
      updatedByName: req.user.name,
    };
    const nextForms = forms.map((x, i) => i === index ? nextForm : x);
    await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: jsonValue({ ...sm, companyForms: nextForms }) } });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'COMPANY_FORM_ORDER_DATA_SYNCED', entityType: 'STYLE', entityId: style.id, before: jsonValue(before), after: jsonValue(nextForm) } });
    return nextForm;
  }

  @Patch('styles/:styleId/forms/:formId')
  async updateForm(@Param('styleId') styleId: string, @Param('formId') id: string, @Body() dto: UpdateFormDto, @Req() req: any) {
    const style = await this.loadStyle(styleId);
    this.assertView(style, req);
    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    const forms: StoredForm[] = Array.isArray(sm.companyForms) ? sm.companyForms : [];
    const index = forms.findIndex(x => x.id === id);
    if (index < 0) throw new BadRequestException('Company form not found');
    const before = forms[index];
    const roles: string[] = req.user.roles || [];
    if (!roleAllowed(roles, before.type, true)) throw new ForbiddenException('You cannot update this document type');

    const now = new Date().toISOString();
    const nextForm: StoredForm = {
      ...before,
      status: dto.status || before.status,
      data: dto.data ? { ...before.data, ...dto.data } : before.data,
      revision: before.revision + 1,
      updatedAt: now,
      updatedByUserId: req.user.id,
      updatedByName: req.user.name,
    };
    const nextForms = forms.map((x, i) => i === index ? nextForm : x);
    await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: jsonValue({ ...sm, companyForms: nextForms }) } });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'COMPANY_FORM_UPDATED', entityType: 'STYLE', entityId: style.id, before: jsonValue(before), after: jsonValue(nextForm) } });
    return nextForm;
  }

  private assertView(style: any, req: any) {
    const roles: string[] = req.user.roles || [];
    const ownOnly = roles.some(r => MERCH_ROLES.includes(r)) && !roles.includes('MERCH_HEAD') && !roles.includes('ADMIN');
    if (ownOnly && style.order.merchandiserId !== req.user.id && !(style.order.merchandiserId === null && style.order.createdById === req.user.id)) {
      throw new ForbiddenException('You can access only your assigned jobs');
    }
  }

  private async loadStyle(styleId: string) {
    const style = await this.prisma.style.findUnique({
      where: { id: styleId },
      include: {
        order: { include: { buyer: true, factory: true } },
        purchaseOrders: { include: { breakdowns: true } },
        productionLots: { include: { allocations: true }, orderBy: { createdAt: 'asc' } },
        breakdowns: true,
      },
    });
    if (!style) throw new BadRequestException('Style not found');
    return style;
  }

  private context(style: any) {
    return {
      id: style.id, styleNo: style.styleNo, itemDescription: style.itemDescription, quantity: style.quantity,
      collection: style.collection, season: style.season, sourceMetadata: style.sourceMetadata,
      breakdowns: style.breakdowns, purchaseOrders: style.purchaseOrders, productionLots: style.productionLots,
      order: { id: style.order.id, jobNo: style.order.jobNo, totalQty: style.order.totalQty, sourceMetadata: style.order.sourceMetadata, buyer: style.order.buyer, factory: style.order.factory },
    };
  }

  private defaultData(style: any, type: CompanyFormType, productionLot?: any) {
    const order = style.order;
    const sm = (style.sourceMetadata || {}) as Record<string, any>;
    const osm = (order.sourceMetadata || {}) as Record<string, any>;
    const production = sm.production || {};
    const planning = sm.planning || {};
    const fabricProfile = sm.fabricProfile || {};
    const followUp = sm.merchandisingFollowUp || {};
    const merchandiser = followUp.merchandiser || fabricProfile.merchandiser || sm.ieBulletin?.merchandiser || '';
    const lotAllocations = Array.isArray(productionLot?.allocations) ? productionLot.allocations : [];
    const lotRefQty = new Map<string, number>();
    for (const a of lotAllocations) lotRefQty.set(a.purchaseOrderId, (lotRefQty.get(a.purchaseOrderId) || 0) + num(a.qty));
    const poSource = productionLot ? (style.purchaseOrders || []).filter((po: any) => lotRefQty.has(po.id)) : (style.purchaseOrders || []);
    const poRows = poSource.map((po: any) => ({
      poNumber: po.referenceType === 'MARKET' ? '' : po.poNumber,
      reference: po.poNumber,
      referenceType: po.referenceType || 'PO',
      market: po.market || '',
      qty: productionLot ? (lotRefQty.get(po.id) || 0) : po.totalQty,
      shipDate: ymd(productionLot?.shipmentDate || po.shipmentDate || po.ccd),
    }));
    const styleBreakdowns = Array.isArray(style.breakdowns) ? style.breakdowns : [];
    const referenceBreakdowns = (style.purchaseOrders || []).flatMap((po: any) => Array.isArray(po.breakdowns) ? po.breakdowns : []);
    const breakdownSource = productionLot ? lotAllocations : (styleBreakdowns.length ? styleBreakdowns : referenceBreakdowns);
    const sizeNames = Array.from(new Set(breakdownSource.map((x: any) => text(x.size)).filter(Boolean)));
    const sizeBreakdownMap = new Map<string, any>();
    for (const b of breakdownSource) {
      const key = `${text(b.color)}|||${text(b.colorCode)}`;
      if (!sizeBreakdownMap.has(key)) sizeBreakdownMap.set(key, { colorCode: [text(b.colorCode), text(b.color)].filter(Boolean).join(' '), buyerColorCode: text(b.colorCode), color: text(b.color), sizes: {}, total: 0, packingAssort: 'Solid' });
      const row = sizeBreakdownMap.get(key)!;
      row.sizes[text(b.size)] = (row.sizes[text(b.size)] || 0) + num(b.qty);
      row.total += num(b.qty);
    }
    const sizeBreakdown = Array.from(sizeBreakdownMap.values());
    const cadRows = Array.isArray(osm.cadConsumption?.rows) ? osm.cadConsumption.rows.filter((r: any) => r.styleId === style.id) : [];
    const common = {
      dateOfIssue: ymd(new Date()),
      buyer: order.buyer?.name || '',
      buyerCode: order.buyer?.code || '',
      jobNo: order.jobNo,
      styleNo: style.styleNo,
      styleName: style.itemDescription || '',
      garmentDescription: style.itemDescription || '',
      collection: style.collection || '',
      season: style.season || '',
      merchandiser,
      totalOrderQty: productionLot?.totalQty || style.quantity,
      productionLotId: productionLot?.id || '',
      productionLotCode: productionLot?.code || '',
      productionLotName: productionLot?.name || '',
      totalFabricQtyKg: num(production.fabricRequired),
      fabricDescription: fabricProfile.fabricDescription || '',
      gsm: fabricProfile.gsm || '',
      widthDia: fabricProfile.widthDia || '',
      poRows,
      sizeColumns: sizeNames.length ? sizeNames : ['Size'],
      sizeBreakdown: sizeBreakdown.length ? sizeBreakdown : [{ colorCode: '', buyerColorCode: '', color: '', sizes: { Size: '' }, total: '', packingAssort: '' }],
      specificInstructions: 'Fabric Quality should be as per buyer quality requirement.',
      remarks: '',
    };

    if (type === 'SMS_SAMPLE_ORDER') {
      const sampleRows = cadRows.length ? cadRows.map((r: any) => ({
        styleRef: style.styleNo,
        styleName: style.itemDescription || '',
        part: r.fabricType || 'Body',
        gsmFabricDescription: [r.gsm, r.fabricDescription].filter(Boolean).join(' '),
        composition: '',
        colorCode: r.color || '',
        garmentDescription: style.itemDescription || '',
        bodyFabricQty: '',
        totalKgs: r.requiredKg || '',
        size: '',
        sampleQty: '',
        exFactoryDate: '',
        remarks: '',
      })) : [{ styleRef: style.styleNo, styleName: style.itemDescription || '', part: 'Body + Sleeve', gsmFabricDescription: fabricProfile.fabricDescription || '', composition: '', colorCode: fabricProfile.color || '', garmentDescription: style.itemDescription || '', bodyFabricQty: '', totalKgs: '', size: '', sampleQty: '', exFactoryDate: '', remarks: '' }];
      return {
        ...common,
        sampleType: 'SMS',
        buyerSampleOrders: poRows.length ? poRows.map((p: any) => ({ receivedDate: common.dateOfIssue, orderNo: p.reference || p.poNumber, qty: p.qty })) : [{ receivedDate: '', orderNo: '', qty: '' }],
        receivedBy: '',
        fabricRows: sampleRows,
        sampleTa: ['Knitting','Dyeing','AOP','Cutting','Print','Sewing'].map(activity => ({ activity, start: '', end: '' })),
        preparedBy: merchandiser,
        checkedBy: '',
        authorisedBy: '',
      };
    }

    if (type === 'TNA_PLAN') {
      const planRows = [
        ['Yarn Dyeing (Y/D)','yarnDyeingStart','yarnDyeingEnd'],
        ['Knitting','knittingStart','knittingEnd'],
        ['Dyeing – Finishing','dyeingFinishingStart','dyeingFinishingEnd'],
        ['All Over Print (AOP)','aopStart','aopEnd'],
        ['Trims & Accessories','trimsInhouseDate','trimsInhouseDate'],
        ['Production & Other File Handover','fileHandoverDate','fileHandoverDate'],
        ['PP Meeting','ppMeetingDate','ppMeetingDate'],
        ['Cutting','cuttingStart','cuttingEnd'],
        ['Printing','printingStart','printingEnd'],
        ['Stone Attach','stoneAttachStart','stoneAttachEnd'],
        ['Embroidery/ Sequence','embroideryStart','embroideryEnd'],
        ['Sewing,Ironing, Folding, Packing & Finishing','sewingStartDate','finishingEnd'],
        ['Garment Washing / Dyeing','garmentWashStart','garmentWashEnd'],
        ['Cartoning','cartoningStart','cartoningEnd'],
        ['Pre-final Inspection','preFinalInspection','preFinalInspection'],
        ['Final Inspection','finalInspection','finalInspection'],
        ['Ex-Factory Date','exFactoryDate','exFactoryDate'],
      ].map(([activity,s,e]) => ({ activity, start: ymd(planning[s]), end: ymd(planning[e]), processingDays: '', slackDays: '' }));
      return {
        ...common,
        orderBasis: 'FINISHED_GOODS',
        poReceivedDate: '',
        collNo: style.collection || '',
        printEmb: sm.printEmbDescription || '',
        planRows,
        planningDepartment: '',
        merchandiserSign: merchandiser,
      };
    }

    const widthColMap = new Map<string, any>();
    const widthMeta = (rawWidth:any, fabricType:any) => {
      const width = text(rawWidth).trim(); const rib = /rib/i.test(text(fabricType)); const requirement = rib ? 'Rib Req. (Kgs)' : 'Body Fabric Req. (Kgs)';
      const numeric = Number(width.replace(/[^0-9.]/g,'')); const cm = Number.isFinite(numeric) && numeric>0 ? `${(numeric*2.54).toFixed(2)} cm` : '';
      const key = `${width||'UNSPECIFIED'}|${requirement}`; if(!widthColMap.has(key)) widthColMap.set(key,{key:`W${widthColMap.size+1}`,width,cm,requirement}); return widthColMap.get(key);
    };
    if(cadRows.length) for(const r of cadRows) widthMeta(r.dia, r.fabricType);
    else widthMeta(fabricProfile.widthDia || '', /rib/i.test(text(fabricProfile.fabricDescription))?'Rib':'Body');
    const fabricWidthColumns = Array.from(widthColMap.values());
    const fabricRows = cadRows.length ? cadRows.map((r: any) => { const col=widthMeta(r.dia,r.fabricType); return {
      part: r.fabricType || '', gsmFabricDescription: [r.gsm, r.fabricDescription].filter(Boolean).join(' '), composition: '', colorCode: r.color || '', widthQty: { [col.key]: num(r.requiredKg) || '' }, totalKg: num(r.requiredKg) || ''
    }}) : [{ part: 'Body', gsmFabricDescription: [fabricProfile.gsm, fabricProfile.fabricDescription].filter(Boolean).join(' '), composition: '', colorCode: fabricProfile.color || '', widthQty: { [fabricWidthColumns[0]?.key || 'W1']: '' }, totalKg: num(production.fabricRequired) || '' }];
    const allBodyCons = cadRows.filter((r: any) => /body/i.test(text(r.fabricType))).reduce((s: number, r: any) => s + num(r.consumptionValue), 0);
    const neckTapeCons = cadRows.filter((r: any) => /neck|tape/i.test(text(r.fabricType))).reduce((s: number, r: any) => s + num(r.consumptionValue), 0);
    return {
      ...common,
      orderBasis: 'STOCK_FABRIC',
      toDepartment: 'Knitting & Dyeing',
      deliveryClosingDate: ymd(poRows.map((p: any) => p.shipDate).filter(Boolean).sort()[0]),
      poReceivedDate: '',
      collNo: style.collection || '',
      fabricWidthColumns,
      fabricRows,
      consumption: { allBody: allBodyCons || '', neckTape: neckTapeCons || '', neckBinding: '', avgConsumption: allBodyCons || '' },
      preparedBy: merchandiser,
      checkedBy: '',
      authorisedBy: '',
    };
  }
}
