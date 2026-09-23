import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const PLANNING_ROLES = ['ADMIN', 'PLANNING'];
const SEWING_FLOOR_MACHINE_CAPACITY: Record<string, number> = {
  'NFL|SEW-1': 450,
  'NFL|SEW-2': 330,
  'NFL|SEW-3': 450,
};
const SEWING_FLOOR_LABEL: Record<string, string> = {
  'NFL|SEW-1': 'NFL Sewing-1',
  'NFL|SEW-2': 'NFL Sewing-2',
  'NFL|SEW-3': 'NFL Sewing-3',
};
const TA_DATE_FIELDS = [
  'yarnDyeingStart', 'yarnDyeingEnd', 'knittingStart', 'knittingEnd',
  'dyeingFinishingStart', 'dyeingFinishingEnd', 'aopStart', 'aopEnd',
  'trimsInhouseDate', 'fileHandoverDate', 'ppMeetingDate',
  'cuttingStart', 'cuttingEnd', 'printingStart', 'printingEnd',
  'stoneStart', 'stoneEnd', 'embroideryStart', 'embroideryEnd',
  'sewingStartDate', 'sewingEnd', 'garmentWashStart', 'garmentWashEnd',
  'finishingEnd', 'preFinalInspection', 'finalInspection', 'exFactoryDate', 'cargoClosingDate',
] as const;

type TaDateField = typeof TA_DATE_FIELDS[number];

class TaStylePlanDto {
  @IsString() styleId!: string;
  @IsOptional() @IsDateString() yarnDyeingStart?: string;
  @IsOptional() @IsDateString() yarnDyeingEnd?: string;
  @IsOptional() @IsDateString() knittingStart?: string;
  @IsOptional() @IsDateString() knittingEnd?: string;
  @IsOptional() @IsDateString() dyeingFinishingStart?: string;
  @IsOptional() @IsDateString() dyeingFinishingEnd?: string;
  @IsOptional() @IsDateString() aopStart?: string;
  @IsOptional() @IsDateString() aopEnd?: string;
  @IsOptional() @IsDateString() trimsInhouseDate?: string;
  @IsOptional() @IsDateString() fileHandoverDate?: string;
  @IsOptional() @IsDateString() ppMeetingDate?: string;
  @IsOptional() @IsDateString() cuttingStart?: string;
  @IsOptional() @IsDateString() cuttingEnd?: string;
  @IsOptional() @IsDateString() printingStart?: string;
  @IsOptional() @IsDateString() printingEnd?: string;
  @IsOptional() @IsDateString() stoneStart?: string;
  @IsOptional() @IsDateString() stoneEnd?: string;
  @IsOptional() @IsDateString() embroideryStart?: string;
  @IsOptional() @IsDateString() embroideryEnd?: string;
  @IsOptional() @IsDateString() sewingStartDate?: string;
  @IsOptional() @IsDateString() sewingEnd?: string;
  @IsOptional() @IsDateString() garmentWashStart?: string;
  @IsOptional() @IsDateString() garmentWashEnd?: string;
  @IsOptional() @IsDateString() finishingEnd?: string;
  @IsOptional() @IsDateString() preFinalInspection?: string;
  @IsOptional() @IsDateString() finalInspection?: string;
  @IsOptional() @IsDateString() exFactoryDate?: string;
  @IsOptional() @IsDateString() cargoClosingDate?: string;
  @IsOptional() @IsBoolean() printOutsidePlan?: boolean;
  @IsOptional() @IsBoolean() embroideryOutsidePlan?: boolean;
  @IsOptional() @IsIn(['PRINTING', 'EMBROIDERY', 'BOTH', 'OTHER']) outsideProcessType?: 'PRINTING' | 'EMBROIDERY' | 'BOTH' | 'OTHER';
  @IsOptional() @IsString() outsideVendor?: string;
  @IsOptional() @IsString() outsideDescription?: string;
  @IsOptional() @IsString() remarks?: string;
}

class SaveTaPlanDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => TaStylePlanDto) styles!: TaStylePlanDto[];
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsBoolean() approve?: boolean;
  @IsOptional() @IsBoolean() capacityOverride?: boolean;
}

class GanttUpdateDto {
  @IsOptional() @IsString() lineId?: string;
  @IsOptional() @IsString() lineCode?: string;
  @IsOptional() @IsString() factoryCode?: string;
  @IsOptional() @IsString() floorCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(24) workingHours?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() finishDate?: string;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsIn(['DRAFT', 'REVIEWED']) status?: 'DRAFT' | 'REVIEWED';
}

class GanttApproveDto {
  @IsOptional() @IsArray() styleIds?: string[];
}

const DEFAULT_CAPACITY_POLICIES = {
  thresholds: { greenMax: 85, amberMax: 100 },
  bulk: {
    knitting: {
      label: 'Knitting', unit: 'KG', dailyCapacity: 8500, sundayFactor: 0.5,
      workingHours: 23, normalShifts: 2, sundayShifts: 1,
      machineRules: [
        { dia: '30–32', fabric: 'Rib', minCount: 20, maxCount: 40, highKg: 200, lowKg: 200 },
        { dia: '30–32', fabric: 'Single Jersey', minCount: 25, maxCount: 40, highKg: 250, lowKg: 200 },
        { dia: '30–32', fabric: 'Terry', minCount: 20, maxCount: 40, highKg: 250, lowKg: 250 },
        { dia: '34–38', fabric: 'Rib', minCount: 20, maxCount: 40, highKg: 250, lowKg: 250 },
        { dia: '34–38', fabric: 'Single Jersey', minCount: 25, maxCount: 40, highKg: 400, lowKg: 300 },
        { dia: '34–38', fabric: 'Terry', minCount: 25, maxCount: 40, highKg: 400, lowKg: 300 },
      ],
    },
    dyeing: { label: 'Dyeing', unit: 'KG', dailyCapacity: 9500, sundayFactor: 1 },
    cutting: { label: 'Cutting', unit: 'PCS', dailyCapacity: 60000, sundayFactor: 1 },
    printing: { label: 'Printing', unit: 'PCS', dailyCapacity: 30000, sundayFactor: 1 },
    embroidery: { label: 'Embroidery', unit: 'PCS', dailyCapacity: 25000, sundayFactor: 1 },
    sewing: { label: 'Sewing', unit: 'PCS', dailyCapacity: 42000, sundayFactor: 1 },
    finishing: { label: 'Finishing & Packing', unit: 'PCS', dailyCapacity: 45000, sundayFactor: 1 },
  },
  sample: {
    knitting: { label: 'Sample Knitting', primaryUnit: 'KG', dailyKg: 350, secondaryUnit: 'COLOR', dailyColors: 40 },
    dyeing: { label: 'Sample Dyeing', primaryUnit: 'BATCH/COLOR', slotCapacity: 185, ppDevelopmentSlot: 80, smsSlot: 105 },
    printing: { label: 'Sample Printing', dailyStyles: 60, dailyPcs: 800, monthlyPcsMin: 20000, monthlyPcsMax: 30000 },
    making: { label: 'Sample Making', monthlyStyles: 800 },
  },
};

function cleanPlan(input: TaStylePlanDto) {
  const result: Record<string, any> = {};
  for (const field of TA_DATE_FIELDS) {
    const value = input[field as TaDateField];
    if (value) result[field] = new Date(value).toISOString();
  }
  result.printOutsidePlan = Boolean(input.printOutsidePlan);
  result.embroideryOutsidePlan = Boolean(input.embroideryOutsidePlan);
  if (input.outsideProcessType) result.outsideProcessType = input.outsideProcessType;
  if (input.outsideVendor?.trim()) result.outsideVendor = input.outsideVendor.trim();
  if (input.outsideDescription?.trim()) result.outsideDescription = input.outsideDescription.trim();
  if (input.remarks?.trim()) result.remarks = input.remarks.trim();
  const outsideRequired = Boolean(input.printOutsidePlan || input.embroideryOutsidePlan || input.outsideProcessType);
  result.outsidePlan = outsideRequired;
  result.outsideProcess = {
    required: outsideRequired,
    process: input.outsideProcessType || (input.printOutsidePlan && input.embroideryOutsidePlan ? 'BOTH' : input.printOutsidePlan ? 'PRINTING' : input.embroideryOutsidePlan ? 'EMBROIDERY' : ''),
    vendor: input.outsideVendor?.trim() || '',
    description: input.outsideDescription?.trim() || '',
  };
  return result;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function iso(date: Date) { return date.toISOString(); }
function dateOnly(value?: string | Date | null) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
function firstCcd(style: any) {
  const values = (style.purchaseOrders || []).map((p: any) => p.ccd || p.shipmentDate).filter(Boolean).map((v: any) => new Date(v));
  values.sort((a: Date, b: Date) => a.getTime() - b.getTime());
  return values[0] || null;
}
function scheduleFromCcd(ccdInput: Date | null) {
  const ccd = ccdInput || addDays(new Date(), 45);
  return {
    yarnDyeingStart: iso(addDays(ccd, -44)), yarnDyeingEnd: iso(addDays(ccd, -39)),
    knittingStart: iso(addDays(ccd, -38)), knittingEnd: iso(addDays(ccd, -32)),
    dyeingFinishingStart: iso(addDays(ccd, -31)), dyeingFinishingEnd: iso(addDays(ccd, -25)),
    aopStart: iso(addDays(ccd, -25)), aopEnd: iso(addDays(ccd, -23)),
    ppMeetingDate: iso(addDays(ccd, -25)), fileHandoverDate: iso(addDays(ccd, -23)),
    trimsInhouseDate: iso(addDays(ccd, -20)), cuttingStart: iso(addDays(ccd, -22)), cuttingEnd: iso(addDays(ccd, -19)),
    printingStart: iso(addDays(ccd, -19)), printingEnd: iso(addDays(ccd, -16)),
    embroideryStart: iso(addDays(ccd, -19)), embroideryEnd: iso(addDays(ccd, -15)),
    sewingStartDate: iso(addDays(ccd, -16)), sewingEnd: iso(addDays(ccd, -7)),
    garmentWashStart: iso(addDays(ccd, -7)), garmentWashEnd: iso(addDays(ccd, -5)),
    finishingEnd: iso(addDays(ccd, -4)), preFinalInspection: iso(addDays(ccd, -3)), finalInspection: iso(addDays(ccd, -2)),
    exFactoryDate: iso(addDays(ccd, -1)), cargoClosingDate: iso(ccd),
  };
}

function slotForDate(date: Date) {
  const day = date.getUTCDate();
  return day <= 10 ? 1 : day <= 20 ? 2 : 3;
}
function monthKey(date: Date) { return date.toISOString().slice(0, 7); }
function daysInMonth(year: number, monthIndex: number) { return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate(); }
function daysInSlot(year: number, monthIndex: number, slot: number, sundayFactor = 1) {
  const maxDay = daysInMonth(year, monthIndex);
  const start = slot === 1 ? 1 : slot === 2 ? 11 : 21;
  const end = slot === 1 ? 10 : slot === 2 ? 20 : maxDay;
  let equivalent = 0;
  for (let day = start; day <= end; day += 1) {
    const d = new Date(Date.UTC(year, monthIndex, day));
    equivalent += d.getUTCDay() === 0 ? sundayFactor : 1;
  }
  return equivalent;
}
function unitDemand(style: any, section: string) {
  const sm = (style.sourceMetadata || {}) as any;
  const production = sm.production || {};
  const sectionData = sm.sectionData || {};
  const qty = Number(style.quantity || 0);
  const fabricKg = Number(production.fabricRequired || sectionData.knitting?.requiredKg || Math.max(0, qty * 0.22));
  if (section === 'knitting' || section === 'dyeing') return fabricKg;
  if (section === 'printing') return sectionData.printing?.applicable === false ? 0 : Number(production.printQty || (sm.planning?.printOutsidePlan ? qty : qty * 0.35));
  if (section === 'embroidery') return sectionData.embroidery?.applicable === false ? 0 : Number(production.embroideryQty || (sm.planning?.embroideryOutsidePlan ? qty : qty * 0.2));
  return qty;
}
function planDateForSection(style: any, section: string) {
  const p = ((style.sourceMetadata || {}) as any).planning || {};
  const map: Record<string, string> = {
    knitting: 'knittingStart', dyeing: 'dyeingFinishingStart', cutting: 'cuttingStart', printing: 'printingStart',
    embroidery: 'embroideryStart', sewing: 'sewingStartDate', finishing: 'finishingEnd',
  };
  const value = p[map[section]] || p.sewingStartDate;
  return value ? new Date(value) : null;
}

@Controller('planning')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(private prisma: PrismaService) {}

  private ensurePlanning(req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((r) => PLANNING_ROLES.includes(r))) throw new ForbiddenException('Central Planning access is required');
  }

  private ensurePlanningView(req: any) {
    const roles: string[] = req.user.roles || [];
    if (!roles.some((r) => [...PLANNING_ROLES, 'MANAGEMENT'].includes(r))) throw new ForbiddenException('Planning / management view access is required');
  }

  private async capacityPolicies() {
    const latest = await this.prisma.auditLog.findFirst({
      where: { entityType: 'SYSTEM_SETTING', entityId: 'CAPACITY_POLICIES', action: 'CAPACITY_POLICIES_UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    return (latest?.after as any)?.policies || DEFAULT_CAPACITY_POLICIES;
  }

  private async heatmap(month?: string) {
    const policies: any = await this.capacityPolicies();
    const target = /^\d{4}-\d{2}$/.test(month || '') ? `${month}-01T00:00:00.000Z` : new Date().toISOString();
    const base = new Date(target);
    const year = base.getUTCFullYear();
    const monthIndex = base.getUTCMonth();
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const sections = Object.keys(policies.bulk || {});
    const rows: Record<string, any> = {};
    for (const section of sections) {
      const p = policies.bulk[section];
      rows[section] = { section, label: p.label || section, unit: p.unit || 'PCS', slots: [1, 2, 3].map((slot) => ({ slot, demand: 0, capacity: Number(p.dailyCapacity || 0) * daysInSlot(year, monthIndex, slot, Number(p.sundayFactor ?? 1)), loadPct: 0, jobs: 0 })) };
    }
    const orders = await this.prisma.order.findMany({ include: { buyer: true, styles: { include: { purchaseOrders: true } } }, take: 500 });
    for (const order of orders) {
      for (const style of order.styles) {
        for (const section of sections) {
          const d = planDateForSection(style, section);
          if (!d || monthKey(d) !== key) continue;
          const slot = slotForDate(d);
          const cell = rows[section].slots[slot - 1];
          const demand = unitDemand(style, section);
          cell.demand += demand;
          if (demand > 0) cell.jobs += 1;
        }
      }
    }
    const greenMax = Number(policies.thresholds?.greenMax ?? 85);
    const amberMax = Number(policies.thresholds?.amberMax ?? 100);
    const list = Object.values(rows).map((row: any) => ({
      ...row,
      slots: row.slots.map((cell: any) => {
        const loadPct = cell.capacity > 0 ? Number(((cell.demand / cell.capacity) * 100).toFixed(1)) : 0;
        const status = loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD';
        return { ...cell, demand: Number(cell.demand.toFixed(2)), capacity: Number(cell.capacity.toFixed(2)), loadPct, status };
      }),
    }));

    const sampleAgg: Record<string, any[]> = {
      knitting: [1, 2, 3].map((slot) => ({ slot, kg: 0, colors: 0, jobs: 0 })),
      dyeing: [1, 2, 3].map((slot) => ({ slot, batches: 0, jobs: 0 })),
      printing: [1, 2, 3].map((slot) => ({ slot, styles: 0, pcs: 0, jobs: 0 })),
      making: [1, 2, 3].map((slot) => ({ slot, styles: 0, jobs: 0 })),
    };
    for (const order of orders) {
      for (const style of order.styles) {
        const sm = (style.sourceMetadata || {}) as any;
        const sample = sm.sectionData?.sample;
        if (!sample) continue;
        const p = sm.planning || {};
        const dt = p.ppMeetingDate ? new Date(p.ppMeetingDate) : p.fileHandoverDate ? new Date(p.fileHandoverDate) : null;
        if (!dt || monthKey(dt) !== key) continue;
        const idx = slotForDate(dt) - 1;
        sampleAgg.knitting[idx].kg += Number(sample.knittingKg || 0); sampleAgg.knitting[idx].colors += Number(sample.knittingColors || 0); sampleAgg.knitting[idx].jobs += 1;
        sampleAgg.dyeing[idx].batches += Number(sample.dyeingBatches || 0); sampleAgg.dyeing[idx].jobs += 1;
        sampleAgg.printing[idx].styles += Number(sample.printStyles || 0); sampleAgg.printing[idx].pcs += Number(sample.printPcs || 0); sampleAgg.printing[idx].jobs += 1;
        sampleAgg.making[idx].styles += Number(sample.makingStyles || 0); sampleAgg.making[idx].jobs += 1;
      }
    }
    const sampleRows = [
      { section: 'sampleKnitting', label: 'Sample Knitting', unit: 'KG + COLOR', slots: sampleAgg.knitting.map((c: any) => { const days = daysInSlot(year, monthIndex, c.slot, 1); const kgCap = Number(policies.sample.knitting.dailyKg || 350) * days; const colorCap = Number(policies.sample.knitting.dailyColors || 40) * days; const kgPct = kgCap ? c.kg / kgCap * 100 : 0; const colorPct = colorCap ? c.colors / colorCap * 100 : 0; const loadPct = Number(Math.max(kgPct, colorPct).toFixed(1)); return { ...c, capacityText: `${kgCap} KG / ${colorCap} colors`, demandText: `${c.kg.toFixed(1)} KG / ${c.colors} colors`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'sampleDyeing', label: 'Sample Dyeing', unit: 'BATCH/COLOR', slots: sampleAgg.dyeing.map((c: any) => { const cap = Number(policies.sample.dyeing.slotCapacity || 185); const loadPct = Number((c.batches / cap * 100).toFixed(1)); return { ...c, capacityText: `${cap} batch`, demandText: `${c.batches} batch`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'samplePrinting', label: 'Sample Printing', unit: 'STYLE + PCS', slots: sampleAgg.printing.map((c: any) => { const days = daysInSlot(year, monthIndex, c.slot, 1); const styleCap = Number(policies.sample.printing.dailyStyles || 60) * days; const pcsCap = Number(policies.sample.printing.dailyPcs || 800) * days; const loadPct = Number(Math.max(styleCap ? c.styles/styleCap*100 : 0, pcsCap ? c.pcs/pcsCap*100 : 0).toFixed(1)); return { ...c, capacityText: `${styleCap} styles / ${pcsCap} pcs`, demandText: `${c.styles} styles / ${c.pcs} pcs`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'sampleMaking', label: 'Sample Making', unit: 'STYLE', slots: sampleAgg.making.map((c: any) => { const cap = Number(policies.sample.making.monthlyStyles || 800) / 3; const loadPct = Number((c.styles / cap * 100).toFixed(1)); return { ...c, capacityText: `${Math.round(cap)} styles`, demandText: `${c.styles} styles`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
    ];
    return { month: key, thresholds: policies.thresholds, rows: list, sampleRows, samplePolicies: policies.sample, bulkPolicies: policies.bulk };
  }

  private async autoLoadGanttForOrder(orderId: string, user: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { buyer: true, styles: { include: { purchaseOrders: true } } } });
    if (!order) return;
    const lineRows = await this.prisma.line.findMany({
      where: { active: true, floor: { active: true, section: { active: true, code: { startsWith: 'SEW' }, factory: { active: true } } } },
      include: { floor: { include: { section: { include: { factory: true } } } } },
    });
    const lineNumber = (v: string) => Number(String(v || '').match(/(\d+)/)?.[1] || 999);
    lineRows.sort((a: any, b: any) => {
      const af = a.floor.section.factory.code; const bf = b.floor.section.factory.code;
      if (af !== bf) return af.localeCompare(bf);
      return lineNumber(a.code || a.name) - lineNumber(b.code || b.name);
    });
    if (!lineRows.length) return;

    const existingStyles = await this.prisma.style.findMany({ where: { sourceMetadata: { not: Prisma.DbNull } }, select: { sourceMetadata: true } });
    const availability = new Map<string, Date>();
    for (const line of lineRows) availability.set(line.id, new Date('2000-01-01T00:00:00.000Z'));
    for (const s of existingStyles) {
      const g = ((s.sourceMetadata || {}) as any).ganttPlan;
      if (!g?.finishDate) continue;
      let lineId = g.lineId as string | undefined;
      if (!lineId) {
        const factoryCode = g.factoryCode || 'NFL';
        const n = lineNumber(g.lineCode);
        lineId = lineRows.find((line: any) => line.floor.section.factory.code === factoryCode && lineNumber(line.code || line.name) === n)?.id;
      }
      if (!lineId || !availability.has(lineId)) continue;
      const end = new Date(g.finishDate);
      const current = availability.get(lineId);
      if (!current || end > current) availability.set(lineId, end);
    }

    for (const style of order.styles) {
      const sm = (style.sourceMetadata || {}) as any;
      const p = sm.planning || {};
      if (p.taStatus !== 'APPROVED' || sm.ganttPlan?.lineCode) continue;
      const preferred = p.sewingStartDate ? new Date(p.sewingStartDate) : addDays(firstCcd(style) || new Date(), -16);
      const sorted = lineRows.map((line: any) => ({ line, free: availability.get(line.id)! })).sort((a: any, b: any) => a.free.getTime() - b.free.getTime());
      const choice = sorted.find((x: any) => x.free < preferred) || sorted[0];
      const start = choice.free >= preferred ? addDays(choice.free, 1) : preferred;
      const ie = sm.ieBulletin || {};
      const baseDailyTarget = Math.max(500, Number(ie.dailyTarget || sm.sectionData?.sewing?.target || 1400));
      const workingHours = 8;
      const effectiveDailyTarget = Math.round(baseDailyTarget * workingHours / 8);
      const days = Math.max(1, Math.ceil(Number(style.quantity || 0) / effectiveDailyTarget));
      const finish = addDays(start, days - 1);
      const ccd = firstCcd(style);
      const bufferDays = ccd ? Math.floor((ccd.getTime() - finish.getTime()) / 86400000) : null;
      const line: any = choice.line;
      const next = {
        ...(sm.ganttPlan || {}), status: 'DRAFT',
        factoryCode: line.floor.section.factory.code, factoryName: line.floor.section.factory.name,
        floorCode: line.floor.code, floorName: line.floor.name, lineId: line.id, lineCode: line.name || line.code,
        startDate: iso(start), finishDate: iso(finish), workingHours, baseDailyTarget, dailyTarget: effectiveDailyTarget,
        bufferDays, risk: bufferDays === null ? 'UNKNOWN' : bufferDays < 0 ? 'CRITICAL' : bufferDays <= 2 ? 'RISK' : 'ON_TRACK',
        version: Number(sm.ganttPlan?.version || 0) + 1, generatedAt: new Date().toISOString(), generatedByUserId: user.id, generatedByName: user.name,
      };
      await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: next }) } });
      availability.set(line.id, finish);
    }
  }

  @Get('ta/workqueue')
  async workqueue(@Req() req: any) {
    this.ensurePlanning(req);
    const orders = await this.prisma.order.findMany({ include: { buyer: true, styles: { include: { purchaseOrders: true, breakdowns: true } } }, orderBy: { createdAt: 'desc' }, take: 300 });
    const tasks = await this.prisma.task.findMany({ where: { module: 'T&A', status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, OR: [{ ownerUserId: req.user.id }, { ownerRoleCode: 'PLANNING' }] }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
    const taskByOrder = new Map(tasks.filter((t) => t.orderId).map((t) => [t.orderId as string, t]));
    return orders.map((order) => {
      const styles = order.styles.map((style) => { const sm = (style.sourceMetadata || {}) as Record<string, any>; return { ...style, planning: sm.planning || {}, ganttPlan: sm.ganttPlan || null }; });
      const approved = styles.length > 0 && styles.every((s) => s.planning?.taStatus === 'APPROVED');
      const draft = styles.some((s) => s.planning?.taStatus === 'DRAFT');
      return { ...order, styles, taStatus: approved ? 'APPROVED' : draft ? 'DRAFT' : 'PENDING', taTask: taskByOrder.get(order.id) || null };
    });
  }

  @Get('ta/orders/:orderId')
  async getTa(@Param('orderId') orderId: string, @Req() req: any) {
    this.ensurePlanning(req);
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { buyer: true, styles: { include: { purchaseOrders: true, breakdowns: true } } } });
    if (!order) throw new BadRequestException('Order not found');
    return { ...order, styles: order.styles.map((style) => { const sm = (style.sourceMetadata || {}) as any; return { ...style, planning: sm.planning || {}, ganttPlan: sm.ganttPlan || null }; }) };
  }

  @Post('ta/generate-pending')
  async generatePending(@Req() req: any) {
    this.ensurePlanning(req);
    const orders = await this.prisma.order.findMany({ include: { styles: { include: { purchaseOrders: true } } }, orderBy: { createdAt: 'asc' }, take: 500 });
    let generatedOrders = 0;
    let generatedStyles = 0;
    const nowIso = new Date().toISOString();
    for (const order of orders) {
      let changed = false;
      for (const style of order.styles) {
        const sm = (style.sourceMetadata || {}) as any;
        if (sm.planning?.taStatus === 'APPROVED') continue;
        const suggested = scheduleFromCcd(firstCcd(style));
        const next = { ...(sm.planning || {}), ...suggested, taStatus: 'DRAFT', taTemplateGenerated: true, autoSuggested: true, taTemplateGeneratedAt: sm.planning?.taTemplateGeneratedAt || nowIso, taLastUpdatedAt: nowIso, taLastUpdatedByUserId: req.user.id, taLastUpdatedByName: req.user.name };
        await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: toPrismaJson({ ...sm, planning: next }) } });
        generatedStyles += 1; changed = true;
      }
      if (changed) {
        generatedOrders += 1;
        const om = (order.sourceMetadata || {}) as any;
        await this.prisma.order.update({ where: { id: order.id }, data: { sourceMetadata: toPrismaJson({ ...om, taPlan: { ...(om.taPlan || {}), status: 'DRAFT', autoSuggested: true, updatedAt: nowIso, updatedByUserId: req.user.id } }) } });
      }
    }
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'TA_BULK_AUTO_GENERATED', entityType: 'PLANNING', entityId: 'T&A', after: toPrismaJson({ generatedOrders, generatedStyles }) } });
    return { ok: true, generatedOrders, generatedStyles, message: `${generatedOrders} pending Jobs generated with suggested T&A dates. Review the capacity heatmap before approval.` };
  }

  @Post('ta/orders/:orderId/generate')
  async generateTa(@Param('orderId') orderId: string, @Req() req: any) {
    this.ensurePlanning(req);
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { styles: { include: { purchaseOrders: true } } } });
    if (!order) throw new BadRequestException('Order not found');
    const nowIso = new Date().toISOString();
    await this.prisma.$transaction(async (tx) => {
      for (const style of order.styles) {
        const sm = (style.sourceMetadata || {}) as Record<string, any>;
        const planning = sm.planning || {};
        if (planning.taStatus === 'APPROVED') continue;
        const suggested = scheduleFromCcd(firstCcd(style));
        const next = { ...planning, ...suggested, taStatus: 'DRAFT', taTemplateGenerated: true, autoSuggested: true, taTemplateGeneratedAt: planning.taTemplateGeneratedAt || nowIso, taLastUpdatedAt: nowIso, taLastUpdatedByUserId: req.user.id, taLastUpdatedByName: req.user.name };
        await tx.style.update({ where: { id: style.id }, data: { sourceMetadata: toPrismaJson({ ...sm, planning: next }) } });
      }
      const orderMeta = (order.sourceMetadata || {}) as Record<string, any>;
      await tx.order.update({ where: { id: orderId }, data: { sourceMetadata: toPrismaJson({ ...orderMeta, taPlan: { ...(orderMeta.taPlan || {}), status: 'DRAFT', templateGenerated: true, autoSuggested: true, templateGeneratedAt: orderMeta.taPlan?.templateGeneratedAt || nowIso, updatedAt: nowIso, updatedByUserId: req.user.id, updatedByName: req.user.name } }) } });
      const existingTaTask = await tx.task.findFirst({ where: { orderId, module: 'T&A', status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } } });
      if (!existingTaTask) {
        const planningUser = await tx.user.findFirst({ where: { active: true, roles: { some: { role: { code: 'PLANNING' } } } } });
        await tx.task.create({ data: { title: `Review / approve T&A for ${order.jobNo}`, module: 'T&A', entityType: 'ORDER', entityId: orderId, orderId, ownerUserId: planningUser?.id, ownerRoleCode: 'PLANNING', priority: 'HIGH' } });
      }
      await tx.auditLog.create({ data: { userId: req.user.id, action: 'TA_TEMPLATE_GENERATED', entityType: 'ORDER', entityId: orderId, after: toPrismaJson({ jobNo: order.jobNo, styleCount: order.styles.length, autoSuggested: true }) } });
    });
    return { ok: true, status: 'DRAFT', message: 'T&A draft generated with suggested dates. Review capacity heatmap, adjust where needed, then approve and release.' };
  }

  @Get('capacity/policies')
  async getCapacityPolicies(@Req() req: any) { this.ensurePlanningView(req); return this.capacityPolicies(); }

  @Put('capacity/policies')
  async updateCapacityPolicies(@Body() body: any, @Req() req: any) {
    this.ensurePlanning(req);
    if (!body || typeof body !== 'object') throw new BadRequestException('Capacity policy object is required');
    const current = await this.capacityPolicies();
    const next = { ...current, ...body, thresholds: { ...(current as any).thresholds, ...(body.thresholds || {}) }, bulk: { ...(current as any).bulk, ...(body.bulk || {}) }, sample: { ...(current as any).sample, ...(body.sample || {}) } };
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'CAPACITY_POLICIES_UPDATED', entityType: 'SYSTEM_SETTING', entityId: 'CAPACITY_POLICIES', before: toPrismaJson({ policies: current }), after: toPrismaJson({ policies: next }) } });
    return next;
  }

  @Get('capacity/heatmap')
  async capacityHeatmap(@Query('month') month: string | undefined, @Req() req: any) { this.ensurePlanningView(req); return this.heatmap(month); }

  @Get('ta/orders/:orderId/capacity-check')
  async capacityCheck(@Param('orderId') orderId: string, @Req() req: any) {
    this.ensurePlanning(req);
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { styles: true } });
    if (!order) throw new BadRequestException('Order not found');
    const months = Array.from(new Set(order.styles.flatMap((s) => { const p = ((s.sourceMetadata || {}) as any).planning || {}; return TA_DATE_FIELDS.map((f) => p[f] ? String(p[f]).slice(0, 7) : null).filter(Boolean); }))) as string[];
    const checks = [];
    for (const month of months.length ? months : [new Date().toISOString().slice(0, 7)]) {
      const map = await this.heatmap(month);
      const max = Math.max(0, ...map.rows.flatMap((r: any) => r.slots.map((s: any) => s.loadPct)));
      checks.push({ month, maxLoadPct: max, ok: max <= Number(map.thresholds?.amberMax ?? 100), rows: map.rows });
    }
    return { orderId, checks, ok: checks.every((c) => c.ok), maxLoadPct: Math.max(0, ...checks.map((c) => c.maxLoadPct)) };
  }

  @Put('ta/orders/:orderId')
  async saveTa(@Param('orderId') orderId: string, @Body() dto: SaveTaPlanDto, @Req() req: any) {
    this.ensurePlanning(req);
    if (!dto.styles.length) throw new BadRequestException('At least one style plan is required');
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { buyer: true, styles: { include: { purchaseOrders: true } } } });
    if (!order) throw new BadRequestException('Order not found');
    const styleMap = new Map(order.styles.map((s) => [s.id, s]));
    if (dto.styles.some((s) => !styleMap.has(s.styleId))) throw new BadRequestException('One or more styles do not belong to this Job');
    if (dto.approve) {
      for (const item of dto.styles) {
        if (!item.fileHandoverDate || !item.trimsInhouseDate || !item.sewingStartDate) {
          const style: any = styleMap.get(item.styleId); throw new BadRequestException(`${style?.styleNo || 'Style'}: File Handover, Trims In-house and Sewing Start dates are required before approval`);
        }
      }
      const check = await this.capacityCheck(orderId, req);
      if (!check.ok && !dto.capacityOverride) throw new BadRequestException(`Capacity heatmap is overloaded (max ${check.maxLoadPct}%). Review dates or use Planning override.`);
    }
    const now = new Date(); const nowIso = now.toISOString(); const status = dto.approve ? 'APPROVED' : 'DRAFT';
    await this.prisma.$transaction(async (tx) => {
      for (const input of dto.styles) {
        const current = await tx.style.findUnique({ where: { id: input.styleId } }); if (!current) continue;
        const sm = (current.sourceMetadata || {}) as Record<string, any>; const before = sm.planning || {}; const clean = cleanPlan(input);
        const nextPlanning = { ...before, ...clean, taStatus: status, taPlanDate: before.taPlanDate || nowIso, taLastUpdatedAt: nowIso, taLastUpdatedByUserId: req.user.id, taLastUpdatedByName: req.user.name, ...(dto.approve ? { taApprovedAt: nowIso, taApprovedByUserId: req.user.id, taApprovedByName: req.user.name, capacityOverride: Boolean(dto.capacityOverride) } : {}) };
        await tx.style.update({ where: { id: input.styleId }, data: { sourceMetadata: toPrismaJson({ ...sm, planning: nextPlanning }) } });
        await tx.auditLog.create({ data: { userId: req.user.id, action: dto.approve ? 'TA_PLAN_APPROVED' : 'TA_PLAN_DRAFT_SAVED', entityType: 'STYLE', entityId: input.styleId, before: toPrismaJson(before), after: toPrismaJson(nextPlanning) } });
      }
      const orderMeta = (order.sourceMetadata || {}) as Record<string, any>;
      await tx.order.update({ where: { id: orderId }, data: { sourceMetadata: toPrismaJson({ ...orderMeta, taPlan: { ...(orderMeta.taPlan || {}), status, remarks: dto.remarks?.trim() || '', updatedAt: nowIso, updatedByUserId: req.user.id, updatedByName: req.user.name, ...(dto.approve ? { approvedAt: nowIso, approvedByUserId: req.user.id, approvedByName: req.user.name, capacityOverride: Boolean(dto.capacityOverride) } : {}) } }) } });
      if (dto.approve) await tx.task.updateMany({ where: { orderId, module: 'T&A', status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } }, data: { status: 'COMPLETED', completedAt: now, blockedReason: null } });
    });
    if (dto.approve) await this.autoLoadGanttForOrder(orderId, req.user);
    return { ok: true, status, merchandisingDatesReleased: Boolean(dto.approve), ganttDraftAutoLoaded: Boolean(dto.approve), message: dto.approve ? 'T&A approved and released. Key dates flow to Merchandising and a Sewing Gantt draft is auto-loaded for Central Planning review.' : 'T&A draft saved. Merchandising will not see draft dates until approval.' };
  }

  @Get('gantt')
  async gantt(@Req() req: any) {
    this.ensurePlanning(req);
    const orders = await this.prisma.order.findMany({ include: { buyer: true, styles: { include: { purchaseOrders: true, breakdowns: true } } }, orderBy: { createdAt: 'asc' }, take: 500 });
    const rows: any[] = [];
    for (const order of orders) for (const style of order.styles) {
      const sm = (style.sourceMetadata || {}) as any; const p = sm.planning || {}; const g = sm.ganttPlan || null;
      if (p.taStatus !== 'APPROVED') continue;
      const colors = Array.from(new Set((style.breakdowns || []).map((b: any) => b.color).filter(Boolean)));
      rows.push({ orderId: order.id, styleId: style.id, jobNo: order.jobNo, buyer: order.buyer?.name, styleNo: style.styleNo, itemDescription: style.itemDescription, itemImageUrl: sm.itemImageUrl || null, orderQty: style.quantity, ccd: firstCcd(style), colors, presentStatus: sm.merchandisingFollowUp?.presentStatus || 'Confirmed', sectionData: sm.sectionData || {}, ieBulletin: sm.ieBulletin || {}, planning: p, ganttPlan: g });
    }
    return rows;
  }

  @Post('gantt/generate')
  async ganttGenerate(@Req() req: any) {
    this.ensurePlanning(req);
    const orders = await this.prisma.order.findMany({ include: { styles: true }, take: 500 });
    let eligible = 0;
    for (const order of orders) {
      const hasApproved = order.styles.some((s) => ((s.sourceMetadata || {}) as any).planning?.taStatus === 'APPROVED');
      if (!hasApproved) continue; eligible += 1; await this.autoLoadGanttForOrder(order.id, req.user);
    }
    return { ok: true, eligibleOrders: eligible, message: 'Approved T&A Jobs are loaded into the Sewing Gantt as planning drafts.' };
  }

  @Put('gantt/styles/:styleId')
  async ganttUpdate(@Param('styleId') styleId: string, @Body() dto: GanttUpdateDto, @Req() req: any) {
    this.ensurePlanning(req);
    const style = await this.prisma.style.findUnique({ where: { id: styleId }, include: { order: true, purchaseOrders: true } });
    if (!style) throw new BadRequestException('Style not found');
    const sm = (style.sourceMetadata || {}) as any; const before = sm.ganttPlan || {};
    if (!before.lineCode) throw new BadRequestException('Auto load this Job into Gantt first');
    const next = { ...before, ...(dto.lineId ? { lineId: dto.lineId } : {}), ...(dto.lineCode ? { lineCode: dto.lineCode } : {}), ...(dto.factoryCode ? { factoryCode: dto.factoryCode } : {}), ...(dto.floorCode ? { floorCode: dto.floorCode } : {}), ...(dto.workingHours ? { workingHours: dto.workingHours, dailyTarget: Math.round(Number(before.baseDailyTarget || before.dailyTarget || 1400) * dto.workingHours / 8) } : {}), ...(dto.startDate ? { startDate: new Date(dto.startDate).toISOString() } : {}), ...(dto.finishDate ? { finishDate: new Date(dto.finishDate).toISOString() } : {}), ...(dto.remark !== undefined ? { remark: dto.remark } : {}), status: dto.status || 'REVIEWED', reviewedAt: new Date().toISOString(), reviewedByUserId: req.user.id, reviewedByName: req.user.name };
    const ccd = firstCcd(style); const finish = next.finishDate ? new Date(next.finishDate) : null; const bufferDays = ccd && finish ? Math.floor((ccd.getTime() - finish.getTime()) / 86400000) : null;
    next.bufferDays = bufferDays; next.risk = bufferDays === null ? 'UNKNOWN' : bufferDays < 0 ? 'CRITICAL' : bufferDays <= 2 ? 'RISK' : 'ON_TRACK';
    await this.prisma.style.update({ where: { id: styleId }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: next }) } });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'GANTT_PLAN_REVIEWED', entityType: 'STYLE', entityId: styleId, before: toPrismaJson(before), after: toPrismaJson(next) } });
    return next;
  }

  @Post('gantt/approve')
  async ganttApprove(@Body() dto: GanttApproveDto, @Req() req: any) {
    this.ensurePlanning(req);
    const styles = await this.prisma.style.findMany({ where: dto.styleIds?.length ? { id: { in: dto.styleIds } } : undefined });
    const targetIds = new Set(styles.filter((style) => {
      const g = ((style.sourceMetadata || {}) as any).ganttPlan;
      return g && ['DRAFT', 'REVIEWED'].includes(g.status);
    }).map((style) => style.id));

    // Hard validation: an official NFL floor plan cannot exceed the confirmed floor machine ceiling.
    // Line-wise operator counts are intentionally not used here; machine control is floor-total based.
    const allStyles = await this.prisma.style.findMany({ select: { id: true, sourceMetadata: true } });
    const loads = new Map<string, { used: number; jobs: string[] }>();
    for (const row of allStyles) {
      const sm = (row.sourceMetadata || {}) as any;
      const g = sm.ganttPlan;
      if (!g?.startDate || !g?.finishDate || !g?.floorCode) continue;
      const include = g.status === 'APPROVED' || targetIds.has(row.id);
      if (!include) continue;
      const factoryCode = g.factoryCode || 'NFL';
      const floorKey = `${factoryCode}|${g.floorCode}`;
      const cap = SEWING_FLOOR_MACHINE_CAPACITY[floorKey];
      if (!cap) continue; // NCL / future floors stay configurable until their max is confirmed.
      const machineQty = Math.max(0, Number(sm.ieBulletin?.machineQty || g.machineQty || 0));
      if (!machineQty) continue;
      const start = new Date(g.startDate); const finish = new Date(g.finishDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) continue;
      const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      const end = new Date(Date.UTC(finish.getUTCFullYear(), finish.getUTCMonth(), finish.getUTCDate()));
      while (cursor <= end) {
        const day = cursor.toISOString().slice(0, 10);
        const key = `${floorKey}|${day}`;
        const current = loads.get(key) || { used: 0, jobs: [] };
        current.used += machineQty; current.jobs.push(row.id); loads.set(key, current);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }
    for (const [key, load] of loads.entries()) {
      const [factoryCode, floorCode, day] = key.split('|');
      const floorKey = `${factoryCode}|${floorCode}`;
      const cap = SEWING_FLOOR_MACHINE_CAPACITY[floorKey];
      if (cap && load.used > cap) {
        throw new BadRequestException(`${SEWING_FLOOR_LABEL[floorKey] || floorKey} machine capacity exceeded on ${day}: ${load.used} planned / ${cap} max. Reduce machine load, change floor/line, date or working hours before official approval.`);
      }
    }

    let approved = 0;
    for (const style of styles) {
      const sm = (style.sourceMetadata || {}) as any; const g = sm.ganttPlan;
      if (!g || !['DRAFT', 'REVIEWED'].includes(g.status)) continue;
      const next = { ...g, status: 'APPROVED', approvedAt: new Date().toISOString(), approvedByUserId: req.user.id, approvedByName: req.user.name, baselineVersion: Number(g.baselineVersion || 0) + 1 };
      await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: next }) } }); approved += 1;
      await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'GANTT_PLAN_APPROVED', entityType: 'STYLE', entityId: style.id, before: toPrismaJson(g), after: toPrismaJson(next) } });
    }
    return { ok: true, approved, message: `${approved} Gantt plan item(s) approved as the current official line plan after floor machine-capacity validation.` };
  }
}
