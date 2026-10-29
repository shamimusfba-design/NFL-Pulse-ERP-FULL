import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from './auth';
import { PrismaService } from './prisma.service';
import {
  TA_DATE_FIELDS,
  type TaDateField,
  type HolidayEntry,
  type TaActivityTrack,
  addDays,
  iso,
  dateOnly,
  dayOnlyUtc,
  inclusiveDays,
  diffDays,
  firstCcd,
  slotForDate,
  monthKey,
  daysInMonth,
  daysInSlot,
  styleFacts,
  fabricBand,
  garmentBand,
  sewingLeadDays,
  timelineSpan,
  compressRows,
  buildTaRows,
  scheduleFromCcd,
  computeCriticalPathAndRisk,
  buildSectionTasksForApprovedTa,
  validateGanttFloorCapacity,
} from './planning.rules';

export {
  TA_DATE_FIELDS,
  firstCcd,
  daysInSlot,
  buildTaRows,
  scheduleFromCcd,
  computeCriticalPathAndRisk,
  buildSectionTasksForApprovedTa,
  validateGanttFloorCapacity,
};

function toPrismaJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const PLANNING_ROLES = ['ADMIN', 'PLANNING'];
const NFL_SHIFTING_LINES = new Set(['D1', 'D2', 'E1', 'E2', 'F', 'G1', 'G2', 'H1', 'H2', 'U', 'V1', 'V2', 'W1', 'W2', 'ZA1', 'ZA2']);

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
  @IsOptional() @IsDateString() testCuttingDate?: string;
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
  @IsOptional() @IsDateString() finishingStart?: string;
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
  @IsOptional() @IsString() replanReason?: string;
  @IsOptional() actualDates?: Record<string, string>;
  @IsOptional() activityTracking?: Record<string, TaActivityTrack>;
}

class SaveTaPlanDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => TaStylePlanDto) styles!: TaStylePlanDto[];
  @IsOptional() @IsString() remarks?: string;
  @IsOptional() @IsString() replanReason?: string;
  @IsOptional() @IsBoolean() approve?: boolean;
  @IsOptional() @IsBoolean() capacityOverride?: boolean;
}

class GanttUpdateDto {
  @IsOptional() @IsString() lineId?: string;
  @IsOptional() @IsString() lineCode?: string;
  @IsOptional() @IsString() factoryCode?: string;
  @IsOptional() @IsString() floorCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(24) workingHours?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.1) smv?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) manpower?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) efficiencyPct?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(200) achievementPct?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) machineQty?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) overtimeHours?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) changeoverMinutes?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) learningEfficiencyPct?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) actualQty?: number;
  @IsOptional() @IsDateString() preStartDate?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() finishDate?: string;
  @IsOptional() @IsBoolean() skipSunday?: boolean;
  @IsOptional() @IsBoolean() locked?: boolean;
  @IsOptional() @IsString() shiftProfile?: string;
  @IsOptional() @IsString() planningStatus?: string;
  @IsOptional() @IsString() splitPlanJson?: string;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsIn(['DRAFT', 'REVIEWED']) status?: 'DRAFT' | 'REVIEWED';
}

class GanttApproveDto {
  @IsOptional() @IsArray() styleIds?: string[];
  @IsOptional() @IsBoolean() capacityOverride?: boolean;
}

const DEFAULT_CAPACITY_POLICIES = {
  weeklyHoliday: 'SUNDAY',
  holidays: [
    { date: '2026-03-26', name: 'Independence Day', factor: 0 },
    { date: '2026-03-30', name: 'Eid-ul-Fitr Closure', factor: 0 },
    { date: '2026-03-31', name: 'Eid-ul-Fitr Closure', factor: 0 },
    { date: '2026-04-01', name: 'Eid-ul-Fitr Closure', factor: 0 },
    { date: '2026-04-14', name: 'Pohela Boishakh', factor: 0 },
    { date: '2026-05-01', name: 'May Day', factor: 0 },
  ] as HolidayEntry[],
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
    dyeing: { label: 'Dyeing', unit: 'KG', dailyCapacity: 9500, sundayFactor: 0 },
    cutting: { label: 'Cutting', unit: 'PCS', dailyCapacity: 60000, sundayFactor: 0 },
    printing: { label: 'Printing', unit: 'PCS', dailyCapacity: 30000, sundayFactor: 0 },
    embroidery: { label: 'Embroidery', unit: 'PCS', dailyCapacity: 25000, sundayFactor: 0 },
    sewing: { label: 'Sewing', unit: 'PCS', dailyCapacity: 42000, sundayFactor: 0 },
    finishing: { label: 'Finishing & Packing', unit: 'PCS', dailyCapacity: 45000, sundayFactor: 0 },
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
  if (input.actualDates && typeof input.actualDates === 'object') {
    result.actualDates = input.actualDates;
  }
  if (input.activityTracking && typeof input.activityTracking === 'object') {
    result.activityTracking = input.activityTracking;
  }
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

function planRangeForSection(style: any, section: string) {
  const p = ((style.sourceMetadata || {}) as any).planning || {};
  const startMap: Record<string, string> = {
    knitting: 'knittingStart', dyeing: 'dyeingFinishingStart', cutting: 'cuttingStart', printing: 'printingStart',
    embroidery: 'embroideryStart', sewing: 'sewingStartDate', finishing: 'finishingStart',
  };
  const endMap: Record<string, string> = {
    knitting: 'knittingEnd', dyeing: 'dyeingFinishingEnd', cutting: 'cuttingEnd', printing: 'printingEnd',
    embroidery: 'embroideryEnd', sewing: 'sewingEnd', finishing: 'finishingEnd',
  };
  const startValue = p[startMap[section]] || p.sewingStartDate;
  const endValue = p[endMap[section]] || startValue;
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : start;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return start <= end ? { start, end } : { start: end, end: start };
}

function normalizedPhysicalLineName(line: any) {
  return String(line?.name || line?.code || '').trim().toUpperCase().replace(/\s+/g, '');
}
function physicalLineKey(line: any) {
  return `${String(line?.floor?.section?.factory?.code || '').toUpperCase()}|${String(line?.floor?.code || '').toUpperCase()}|${normalizedPhysicalLineName(line)}`;
}
function activeMachineCount(line: any) {
  return (line?.machinePools || []).filter((x: any) => x.active !== false).reduce((sum: number, x: any) => sum + Number(x.machineCount || 0), 0);
}
function dedupePhysicalLines(lines: any[]): any[] {
  const map = new Map<string, any>();
  for (const line of lines) {
    const key = physicalLineKey(line);
    const prev = map.get(key);
    if (!prev) { map.set(key, line); continue; }
    const prevMachines = activeMachineCount(prev);
    const nextMachines = activeMachineCount(line);
    const prevDate = new Date(prev?.effectiveFrom || 0).getTime() || 0;
    const nextDate = new Date(line?.effectiveFrom || 0).getTime() || 0;
    if (nextMachines > prevMachines || (nextMachines === prevMachines && nextDate > prevDate)) map.set(key, line);
  }
  return Array.from(map.values());
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
    const stored = (latest?.after as any)?.policies;
    if (!stored) return DEFAULT_CAPACITY_POLICIES;
    return {
      ...DEFAULT_CAPACITY_POLICIES,
      ...stored,
      weeklyHoliday: 'SUNDAY',
      holidays: Array.isArray(stored.holidays) ? stored.holidays : DEFAULT_CAPACITY_POLICIES.holidays,
    };
  }

  private async heatmap(month?: string) {
    const policies: any = await this.capacityPolicies();
    const holidays: HolidayEntry[] = Array.isArray(policies.holidays) ? policies.holidays : [];
    const target = /^\d{4}-\d{2}$/.test(month || '') ? `${month}-01T00:00:00.000Z` : new Date().toISOString();
    const base = new Date(target);
    const year = base.getUTCFullYear();
    const monthIndex = base.getUTCMonth();
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const sections = Object.keys(policies.bulk || {});
    const rows: Record<string, any> = {};
    for (const section of sections) {
      const p = policies.bulk[section];
      const sundayFactor = Number(p.sundayFactor ?? (section === 'knitting' ? 0.5 : 0));
      rows[section] = {
        section,
        label: p.label || section,
        unit: p.unit || 'PCS',
        sundayFactor,
        slots: [1, 2, 3].map((slot) => {
          const effectiveDays = daysInSlot(year, monthIndex, slot, sundayFactor, holidays);
          return {
            slot,
            effectiveDays,
            demand: 0,
            capacity: Number(p.dailyCapacity || 0) * effectiveDays,
            loadPct: 0,
            jobs: 0,
          };
        }),
      };
    }

    const styles = await this.prisma.style.findMany({
      where: { sourceMetadata: { not: Prisma.DbNull } },
      select: { id: true, quantity: true, sourceMetadata: true },
      orderBy: { id: 'asc' },
    });
    const monthStart = new Date(Date.UTC(year, monthIndex, 1));
    const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    const jobSets: Record<string, Array<Set<string>>> = {};
    for (const section of sections) jobSets[section] = [new Set<string>(), new Set<string>(), new Set<string>()];
    for (const style of styles) {
      for (const section of sections) {
        const range = planRangeForSection(style, section);
        if (!range || range.end < monthStart || range.start > monthEnd) continue;
        const totalDemand = unitDemand(style, section);
        if (totalDemand <= 0) continue;
        const totalDays = Math.max(1, Math.floor((Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate()) - Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate())) / 86400000) + 1);
        const dailyDemand = totalDemand / totalDays;
        const overlapStart = range.start < monthStart ? monthStart : range.start;
        const overlapEnd = range.end > monthEnd ? monthEnd : range.end;
        for (let cursor = new Date(Date.UTC(overlapStart.getUTCFullYear(), overlapStart.getUTCMonth(), overlapStart.getUTCDate())); cursor <= overlapEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
          const slot = slotForDate(cursor);
          rows[section].slots[slot - 1].demand += dailyDemand;
          jobSets[section][slot - 1].add(style.id);
        }
      }
    }
    for (const section of sections) {
      rows[section].slots.forEach((cell: any, idx: number) => { cell.jobs = jobSets[section][idx].size; });
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
    for (const style of styles) {
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
    const sampleRows = [
      { section: 'sampleKnitting', label: 'Sample Knitting', unit: 'KG + COLOR', slots: sampleAgg.knitting.map((c: any) => { const days = daysInSlot(year, monthIndex, c.slot, 0, holidays); const kgCap = Number(policies.sample.knitting.dailyKg || 350) * days; const colorCap = Number(policies.sample.knitting.dailyColors || 40) * days; const kgPct = kgCap ? c.kg / kgCap * 100 : 0; const colorPct = colorCap ? c.colors / colorCap * 100 : 0; const loadPct = Number(Math.max(kgPct, colorPct).toFixed(1)); return { ...c, capacityText: `${kgCap} KG / ${colorCap} colors`, demandText: `${c.kg.toFixed(1)} KG / ${c.colors} colors`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'sampleDyeing', label: 'Sample Dyeing', unit: 'BATCH/COLOR', slots: sampleAgg.dyeing.map((c: any) => { const cap = Number(policies.sample.dyeing.slotCapacity || 185); const loadPct = Number((c.batches / cap * 100).toFixed(1)); return { ...c, capacityText: `${cap} batch`, demandText: `${c.batches} batch`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'samplePrinting', label: 'Sample Printing', unit: 'STYLE + PCS', slots: sampleAgg.printing.map((c: any) => { const days = daysInSlot(year, monthIndex, c.slot, 0, holidays); const styleCap = Number(policies.sample.printing.dailyStyles || 60) * days; const pcsCap = Number(policies.sample.printing.dailyPcs || 800) * days; const loadPct = Number(Math.max(styleCap ? c.styles / styleCap * 100 : 0, pcsCap ? c.pcs / pcsCap * 100 : 0).toFixed(1)); return { ...c, capacityText: `${styleCap} styles / ${pcsCap} pcs`, demandText: `${c.styles} styles / ${c.pcs} pcs`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'sampleMaking', label: 'Sample Making', unit: 'STYLE', slots: sampleAgg.making.map((c: any) => { const cap = Number(policies.sample.making.monthlyStyles || 800) / 3; const loadPct = Number((c.styles / cap * 100).toFixed(1)); return { ...c, capacityText: `${Math.round(cap)} styles`, demandText: `${c.styles} styles`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
    ];
    return {
      month: key,
      weeklyHoliday: 'SUNDAY',
      holidays,
      thresholds: policies.thresholds,
      rows: list,
      sampleRows,
      samplePolicies: policies.sample,
      bulkPolicies: policies.bulk,
    };
  }

  private async autoLoadGanttForOrder(orderId: string, user: any) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { buyer: true, styles: { include: { purchaseOrders: true } } } });
    if (!order) return;
    const lineRows = dedupePhysicalLines(await this.prisma.line.findMany({
      where: { active: true, floor: { active: true, section: { active: true, code: { startsWith: 'SEW' }, factory: { active: true } } } },
      include: { machinePools: true, floor: { include: { section: { include: { factory: true } } } } },
    }));
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
      if (!lineId || !availability.has(lineId)) {
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
    const orders = await this.prisma.order.findMany({ include: { buyer: true, styles: { include: { purchaseOrders: true, breakdowns: true } } }, orderBy: { createdAt: 'desc' } });
    const tasks = await this.prisma.task.findMany({ where: { module: 'T&A', status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, OR: [{ ownerUserId: req.user.id }, { ownerRoleCode: 'PLANNING' }] }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }] });
    const taskByOrder = new Map(tasks.filter((t) => t.orderId).map((t) => [t.orderId as string, t]));
    return orders.map((order) => {
      const styles = order.styles.map((style) => {
        const sm = (style.sourceMetadata || {}) as Record<string, any>;
        const cp = computeCriticalPathAndRisk(style);
        return { ...style, planning: sm.planning || {}, ganttPlan: sm.ganttPlan || null, criticalPathSummary: cp };
      });
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
    return {
      ...order,
      styles: order.styles.map((style) => {
        const sm = (style.sourceMetadata || {}) as any;
        const cp = computeCriticalPathAndRisk(style);
        return { ...style, planning: sm.planning || {}, ganttPlan: sm.ganttPlan || null, criticalPathSummary: cp };
      }),
    };
  }

  @Post('ta/generate-pending')
  async generatePending(@Req() req: any) {
    this.ensurePlanning(req);
    const orders = await this.prisma.order.findMany({ include: { styles: { include: { purchaseOrders: true } } }, orderBy: { createdAt: 'asc' } });
    let generatedOrders = 0;
    let generatedStyles = 0;
    const nowIso = new Date().toISOString();
    for (const order of orders) {
      let changed = false;
      for (const style of order.styles) {
        const sm = (style.sourceMetadata || {}) as any;
        if (sm.planning?.taStatus === 'APPROVED') continue;
        const suggested = scheduleFromCcd(style);
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
        const suggested = scheduleFromCcd(style);
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
    const next = {
      ...current,
      ...body,
      weeklyHoliday: 'SUNDAY',
      holidays: Array.isArray(body.holidays) ? body.holidays : (current as any).holidays,
      thresholds: { ...(current as any).thresholds, ...(body.thresholds || {}) },
      bulk: { ...(current as any).bulk, ...(body.bulk || {}) },
      sample: { ...(current as any).sample, ...(body.sample || {}) },
    };
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
    const checks: Array<{ month: string; maxLoadPct: number; ok: boolean; rows: any[] }> = [];
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
          const style: any = styleMap.get(item.styleId);
          throw new BadRequestException(`${style?.styleNo || 'Style'}: File Handover, Trims In-house and Sewing Start dates are required before approval`);
        }
      }
      const check = await this.capacityCheck(orderId, req);
      if (!check.ok && !dto.capacityOverride) throw new BadRequestException(`Capacity heatmap is overloaded (max ${check.maxLoadPct}%). Review dates or use Planning override.`);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const status = dto.approve ? 'APPROVED' : 'DRAFT';
    let createdTasksCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const input of dto.styles) {
        const current = await tx.style.findUnique({ where: { id: input.styleId } });
        if (!current) continue;
        const sm = (current.sourceMetadata || {}) as Record<string, any>;
        const before = sm.planning || {};
        const clean = cleanPlan(input);

        // Gap 3: Re-plan record & version check when modifying planned dates on an already APPROVED T&A
        const wasApproved = before.taStatus === 'APPROVED';
        const changedFields: string[] = [];
        if (wasApproved) {
          for (const field of TA_DATE_FIELDS) {
            const oldDate = dateOnly(before[field]);
            const newDate = dateOnly(clean[field] ?? before[field]);
            if (oldDate && newDate && oldDate !== newDate) {
              changedFields.push(field);
            }
          }
        }
        const effectiveReplanReason = (input.replanReason || dto.replanReason || '').trim();
        if (wasApproved && changedFields.length > 0 && !effectiveReplanReason) {
          throw new BadRequestException(`Style ${current.styleNo}: Re-plan reason is required when changing planned dates (${changedFields.join(', ')}) on an approved T&A.`);
        }

        const prevVersion = Number(before.taVersion || 1);
        const nextVersion = wasApproved && changedFields.length > 0 ? prevVersion + 1 : prevVersion;
        const baselinePlan = before.baselinePlan || (dto.approve || wasApproved ? TA_DATE_FIELDS.reduce((acc, f) => {
          if (before[f] || clean[f]) acc[f] = before[f] || clean[f];
          return acc;
        }, {} as Record<string, any>) : null);

        const replanHistory = Array.isArray(before.replanHistory) ? [...before.replanHistory] : [];
        if (wasApproved && changedFields.length > 0) {
          replanHistory.unshift({
            version: nextVersion,
            previousVersion: prevVersion,
            reason: effectiveReplanReason,
            changedFields,
            replannedAt: nowIso,
            replannedByUserId: req.user.id,
            replannedByName: req.user.name,
          });
        }

        const nextPlanning = {
          ...before,
          ...clean,
          taStatus: status,
          taVersion: nextVersion,
          baselinePlan,
          replanHistory,
          taPlanDate: before.taPlanDate || nowIso,
          taLastUpdatedAt: nowIso,
          taLastUpdatedByUserId: req.user.id,
          taLastUpdatedByName: req.user.name,
          ...(dto.approve ? { taApprovedAt: nowIso, taApprovedByUserId: req.user.id, taApprovedByName: req.user.name, capacityOverride: Boolean(dto.capacityOverride) } : {}),
        };
        await tx.style.update({ where: { id: input.styleId }, data: { sourceMetadata: toPrismaJson({ ...sm, planning: nextPlanning }) } });
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: wasApproved && changedFields.length > 0 ? 'TA_PLAN_REPLANNED' : dto.approve ? 'TA_PLAN_APPROVED' : 'TA_PLAN_DRAFT_SAVED',
            entityType: 'STYLE',
            entityId: input.styleId,
            before: toPrismaJson(before),
            after: toPrismaJson(nextPlanning),
          },
        });

        // Gap 10: Auto-create section tasks on T&A approval
        if (dto.approve) {
          const sectionTasks = buildSectionTasksForApprovedTa({ id: order.id, jobNo: order.jobNo }, { id: current.id, styleNo: current.styleNo }, nextPlanning);
          for (const st of sectionTasks) {
            const exists = await tx.task.findFirst({
              where: { orderId: order.id, entityId: current.id, module: st.module, title: st.title },
            });
            if (!exists) {
              await tx.task.create({
                data: {
                  title: st.title,
                  module: st.module,
                  ownerRoleCode: st.ownerRoleCode,
                  orderId: st.orderId,
                  entityType: st.entityType,
                  entityId: st.entityId,
                  dueAt: st.dueDate,
                  priority: st.priority,
                  status: 'PENDING',
                },
              });
              createdTasksCount += 1;
            }
          }
        }
      }
      const orderMeta = (order.sourceMetadata || {}) as Record<string, any>;
      await tx.order.update({ where: { id: orderId }, data: { sourceMetadata: toPrismaJson({ ...orderMeta, taPlan: { ...(orderMeta.taPlan || {}), status, remarks: dto.remarks?.trim() || '', updatedAt: nowIso, updatedByUserId: req.user.id, updatedByName: req.user.name, ...(dto.approve ? { approvedAt: nowIso, approvedByUserId: req.user.id, approvedByName: req.user.name, capacityOverride: Boolean(dto.capacityOverride) } : {}) } }) } });
      if (dto.approve) await tx.task.updateMany({ where: { orderId, module: 'T&A', status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } }, data: { status: 'COMPLETED', completedAt: now, blockedReason: null } });
    });
    if (dto.approve) await this.autoLoadGanttForOrder(orderId, req.user);
    return {
      ok: true,
      status,
      sectionTasksCreated: createdTasksCount,
      merchandisingDatesReleased: Boolean(dto.approve),
      ganttDraftAutoLoaded: Boolean(dto.approve),
      message: dto.approve
        ? `T&A approved and released. ${createdTasksCount} downstream section tasks created and Sewing Gantt draft auto-loaded.`
        : 'T&A draft saved. Merchandising will not see draft dates until approval.',
    };
  }

  @Get('control-tower')
  async controlTower(@Req() req: any) {
    this.ensurePlanningView(req);
    const orders = await this.prisma.order.findMany({
      include: { buyer: true, styles: { include: { purchaseOrders: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const riskList = orders.flatMap((order) =>
      order.styles.map((style) => {
        const cp = computeCriticalPathAndRisk(style);
        const sm = (style.sourceMetadata || {}) as any;
        const p = sm.planning || {};
        return {
          orderId: order.id,
          styleId: style.id,
          jobNo: order.jobNo,
          styleNo: style.styleNo,
          buyer: order.buyer?.name || 'Buyer',
          quantity: style.quantity,
          taStatus: p.taStatus || 'DRAFT',
          taVersion: Number(p.taVersion || 1),
          ccdDate: cp.ccdDate,
          projectedExFactoryDate: cp.projectedExFactoryDate,
          projectedShipmentDate: cp.projectedShipmentDate,
          ccdSlipDays: cp.ccdSlipDays,
          riskLevel: cp.riskLevel,
          delayedCount: cp.delayedActivities.length,
          failedCount: cp.failedActivities.length,
          criticalActivities: cp.criticalPath.map((c) => c.label),
          topDelayReason: cp.delayedActivities.find((d) => d.delayReason)?.delayReason || '',
        };
      }),
    );
    return { riskList };
  }

  @Get('gantt')
  async gantt(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('factory') factory?: string, @Query('q') q?: string) {
    this.ensurePlanning(req);
    const styles = await this.prisma.style.findMany({
      where: { sourceMetadata: { not: Prisma.DbNull } },
      select: {
        id: true, styleNo: true, itemDescription: true, quantity: true, sourceMetadata: true,
        order: { select: { id: true, jobNo: true, buyer: { select: { name: true, code: true } } } },
        purchaseOrders: { select: { ccd: true, shipmentDate: true } },
        breakdowns: { select: { color: true } },
      },
      orderBy: { id: 'asc' },
    });
    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;
    const search = String(q || '').trim().toLowerCase();
    const rows: any[] = [];
    for (const style of styles) {
      const order = style.order;
      const sm = (style.sourceMetadata || {}) as any;
      const p = sm.planning || {};
      const g = sm.ganttPlan || null;
      if (p.taStatus !== 'APPROVED') continue;
      const rowFactory = String(g?.factoryCode || 'NFL').toUpperCase();
      if (factory && factory !== 'ALL' && rowFactory !== String(factory).toUpperCase()) continue;
      if (search && !`${order.jobNo} ${style.styleNo} ${style.itemDescription || ''} ${order.buyer?.name || ''}`.toLowerCase().includes(search)) continue;
      if (fromDate || toDate) {
        const startValue = g?.startDate || p.sewingStartDate || p.cuttingStart || p.taPlanDate;
        const finishValue = g?.finishDate || p.sewingEnd || startValue;
        const start = startValue ? new Date(startValue) : null;
        const finish = finishValue ? new Date(finishValue) : start;
        if (start && finish && !Number.isNaN(start.getTime()) && !Number.isNaN(finish.getTime())) {
          if (fromDate && finish < fromDate) continue;
          if (toDate && start > toDate) continue;
        }
      }
      const colors = Array.from(new Set((style.breakdowns || []).map((b: any) => b.color).filter(Boolean)));
      const fullSectionData = sm.sectionData || {};
      const sectionData = {
        finishedFabricStore: fullSectionData.finishedFabricStore || {},
        fabricFinishing: fullSectionData.fabricFinishing || {},
        cutting: fullSectionData.cutting || {},
        printing: fullSectionData.printing || {},
        embroidery: fullSectionData.embroidery || {},
        trims: fullSectionData.trims || {},
        ie: fullSectionData.ie || {},
        sewing: fullSectionData.sewing || {},
      };
      rows.push({ orderId: order.id, styleId: style.id, jobNo: order.jobNo, buyer: order.buyer?.name, buyerCode: order.buyer?.code, styleNo: style.styleNo, itemDescription: style.itemDescription, itemImageUrl: sm.itemImageUrl || null, orderQty: style.quantity, ccd: firstCcd(style), colors, presentStatus: sm.merchandisingFollowUp?.presentStatus || 'Confirmed', sectionData, ieBulletin: sm.ieBulletin || {}, shortBalance: sm.shortBalance || null, ganttPlan: g });
    }
    return rows;
  }

  @Get('gantt/find')
  async ganttFind(@Req() req: any, @Query('q') q?: string) {
    this.ensurePlanning(req);
    const search = String(q || '').trim();
    if (!search) return null;
    const rows = await this.gantt(req, undefined, undefined, undefined, search);
    return rows[0] || null;
  }

  @Post('gantt/generate')
  async ganttGenerate(@Req() req: any) {
    this.ensurePlanning(req);
    const orders = await this.prisma.order.findMany({ include: { styles: true } });
    let eligible = 0;
    for (const order of orders) {
      const hasApproved = order.styles.some((s) => ((s.sourceMetadata || {}) as any).planning?.taStatus === 'APPROVED');
      if (!hasApproved) continue;
      eligible += 1;
      await this.autoLoadGanttForOrder(order.id, req.user);
    }
    return { ok: true, eligibleOrders: eligible, message: 'Approved T&A Jobs are loaded into the Sewing Gantt as planning drafts.' };
  }

  @Put('gantt/styles/:styleId')
  async ganttUpdate(@Param('styleId') styleId: string, @Body() dto: GanttUpdateDto, @Req() req: any) {
    this.ensurePlanning(req);
    const style = await this.prisma.style.findUnique({ where: { id: styleId }, include: { order: true, purchaseOrders: true } });
    if (!style) throw new BadRequestException('Style not found');
    const sm = (style.sourceMetadata || {}) as any;
    const before = sm.ganttPlan || {};
    if (!before.lineCode) throw new BadRequestException('Auto load this Job into Gantt first');
    const ie = sm.ieBulletin || {};
    const sectionSewing = sm.sectionData?.sewing || {};
    if (before.locked && dto.locked !== false) throw new BadRequestException('This approved / frozen plan is locked. Unlock it before changing line, date or capacity inputs.');
    const effectiveFactory = String(dto.factoryCode ?? before.factoryCode ?? 'NFL').toUpperCase();
    const effectiveLine = String(dto.lineCode ?? before.lineCode ?? '').toUpperCase();
    const isShifting = effectiveFactory === 'NFL' && NFL_SHIFTING_LINES.has(effectiveLine);
    const workingHours = isShifting ? 16 : Number(dto.workingHours ?? before.workingHours ?? 8);
    const overtimeHours = isShifting ? 0 : Number(dto.overtimeHours ?? before.overtimeHours ?? 0);
    const totalHours = Math.max(1, workingHours + overtimeHours);
    const smv = Number(ie.smv ?? dto.smv ?? before.smv ?? 0);
    const manpower = Number(ie.manpower ?? dto.manpower ?? before.manpower ?? sectionSewing.manpower ?? 0);
    const efficiencyPct = Number(ie.achievableEfficiencyPct ?? ie.achievableEfficiency ?? dto.efficiencyPct ?? before.efficiencyPct ?? sectionSewing.efficiencyPct ?? 65);
    const learningEfficiencyPct = Number(dto.learningEfficiencyPct ?? before.learningEfficiencyPct ?? Math.max(35, efficiencyPct - 10));
    const machineQty = Number(ie.machineQty ?? dto.machineQty ?? before.machineQty ?? sectionSewing.machineQty ?? 0);
    const changeoverMinutes = Number(dto.changeoverMinutes ?? before.changeoverMinutes ?? 0);
    const actualQty = Math.max(0, Number(dto.actualQty ?? before.actualQty ?? sectionSewing.productionQty ?? 0));
    const remainingQty = Math.max(0, Number(style.quantity || 0) - actualQty);
    const startDate = dto.startDate ? new Date(dto.startDate) : before.startDate ? new Date(before.startDate) : new Date();
    const standardTarget = Number(ie.dailyTarget || before.standardTarget || before.baseDailyTarget || before.dailyTarget || 1400);
    let dailyTarget = standardTarget;
    const blendedEfficiency = Math.min(efficiencyPct, Math.max(1, learningEfficiencyPct + (efficiencyPct - learningEfficiencyPct) * 0.65));
    if (smv > 0 && manpower > 0) dailyTarget = Math.max(1, Math.round((manpower * totalHours * 60 * (blendedEfficiency / 100)) / smv));
    else if (dto.workingHours || dto.overtimeHours) dailyTarget = Math.max(1, Math.round(Number(before.baseDailyTarget || before.dailyTarget || 1400) * totalHours / 8));
    const changeoverDays = changeoverMinutes > 0 ? changeoverMinutes / Math.max(60, totalHours * 60) : 0;
    const requiredDays = Math.max(1, Math.ceil((remainingQty / Math.max(1, dailyTarget)) + changeoverDays));
    let autoFinish = addDays(startDate, requiredDays - 1);
    if (dto.skipSunday ?? before.skipSunday ?? true) {
      let cursor = new Date(startDate);
      let work = 1;
      while (work < requiredDays) {
        cursor = addDays(cursor, 1);
        if (cursor.getUTCDay() !== 0) work += 1;
      }
      autoFinish = cursor;
    }
    const finishDate = dto.finishDate ? new Date(dto.finishDate) : autoFinish;
    const splitPlan = dto.splitPlanJson !== undefined ? (() => { try { return JSON.parse(dto.splitPlanJson || '[]'); } catch { return []; } })() : before.splitPlan || [];
    const next = {
      ...before,
      ...(dto.lineId ? { lineId: dto.lineId } : {}), ...(dto.lineCode ? { lineCode: dto.lineCode } : {}), ...(dto.factoryCode ? { factoryCode: dto.factoryCode } : {}), ...(dto.floorCode ? { floorCode: dto.floorCode } : {}),
      workingHours, overtimeHours, totalHours, smv: smv || undefined, manpower: manpower || undefined, efficiencyPct, learningEfficiencyPct, achievementPct: dto.achievementPct ?? before.achievementPct ?? sectionSewing.achievementPct ?? 0, machineQty, machineRequirements: ie.machineRequirements || before.machineRequirements || [], standardTarget, changeoverMinutes, actualQty, remainingQty,
      dailyTarget, requiredDays, preStartDate: dto.preStartDate ? new Date(dto.preStartDate).toISOString() : before.preStartDate, startDate: startDate.toISOString(), finishDate: finishDate.toISOString(), autoCalculatedFinishDate: autoFinish.toISOString(), plannerManualOverride: true,
      ieInputStatus: (smv > 0 && manpower > 0 && machineQty > 0) ? 'READY' : 'PENDING_IE_OR_PLANNER_INPUT',
      skipSunday: dto.skipSunday ?? before.skipSunday ?? true, locked: dto.locked ?? before.locked ?? false, shiftProfile: isShifting ? 'A+B' : (dto.shiftProfile ?? before.shiftProfile ?? 'GENERAL'), planningStatus: dto.planningStatus ?? before.planningStatus ?? 'PLANNED', splitPlan,
      baselineStartDate: before.baselineStartDate || (before.status === 'APPROVED' ? before.startDate : undefined), baselineFinishDate: before.baselineFinishDate || (before.status === 'APPROVED' ? before.finishDate : undefined),
      ...(dto.remark !== undefined ? { remark: dto.remark } : {}), status: dto.status || 'REVIEWED', reviewedAt: new Date().toISOString(), reviewedByUserId: req.user.id, reviewedByName: req.user.name,
    };
    const ccd = firstCcd(style);
    const finish = next.finishDate ? new Date(next.finishDate) : null;
    const bufferDays = ccd && finish ? Math.floor((ccd.getTime() - finish.getTime()) / 86400000) : null;
    next.bufferDays = bufferDays;
    next.risk = bufferDays === null ? 'UNKNOWN' : bufferDays < 0 ? 'CRITICAL' : bufferDays <= 2 ? 'RISK' : 'ON_TRACK';
    await this.prisma.style.update({ where: { id: styleId }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: next }) } });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'GANTT_PLAN_REVIEWED', entityType: 'STYLE', entityId: styleId, before: toPrismaJson(before), after: toPrismaJson(next) } });
    return next;
  }

  @Get('gantt/styles/:styleId/history')
  async ganttHistory(@Param('styleId') styleId: string, @Req() req: any) {
    this.ensurePlanning(req);
    const logs = await this.prisma.auditLog.findMany({ where: { entityType: 'STYLE', entityId: styleId, action: { in: ['GANTT_PLAN_REVIEWED', 'GANTT_PLAN_APPROVED', 'GANTT_PLAN_UNDONE'] } }, orderBy: { createdAt: 'desc' }, take: 20 });
    return logs.map((x: any) => ({ id: x.id, action: x.action, createdAt: x.createdAt, userId: x.userId, before: x.before, after: x.after }));
  }

  @Post('gantt/styles/:styleId/undo')
  async ganttUndo(@Param('styleId') styleId: string, @Req() req: any) {
    this.ensurePlanning(req);
    const style = await this.prisma.style.findUnique({ where: { id: styleId } });
    if (!style) throw new BadRequestException('Style not found');
    const sm = (style.sourceMetadata || {}) as any;
    const current = sm.ganttPlan || {};
    if (current.locked) throw new BadRequestException('Unlock the plan before undo.');
    const latest = await this.prisma.auditLog.findFirst({ where: { entityType: 'STYLE', entityId: styleId, action: 'GANTT_PLAN_REVIEWED' }, orderBy: { createdAt: 'desc' } });
    const previous = latest?.before as any;
    if (!previous) throw new BadRequestException('No previous Gantt review is available to restore.');
    const restored = { ...previous, status: 'REVIEWED', undoneAt: new Date().toISOString(), undoneByUserId: req.user.id, undoneByName: req.user.name };
    await this.prisma.style.update({ where: { id: styleId }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: restored }) } });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'GANTT_PLAN_UNDONE', entityType: 'STYLE', entityId: styleId, before: toPrismaJson(current), after: toPrismaJson(restored) } });
    return restored;
  }

  @Post('gantt/approve')
  async ganttApprove(@Body() dto: GanttApproveDto, @Req() req: any) {
    this.ensurePlanning(req);
    const styles = await this.prisma.style.findMany({ where: dto.styleIds?.length ? { id: { in: dto.styleIds } } : undefined });
    const targetIds = new Set(styles.filter((style) => {
      const g = ((style.sourceMetadata || {}) as any).ganttPlan;
      return g && ['DRAFT', 'REVIEWED'].includes(g.status);
    }).map((style) => style.id));

    const capacityLines = dedupePhysicalLines(await this.prisma.line.findMany({ where: { active: true }, include: { machinePools: true, floor: { include: { section: { include: { factory: true } } } } } }));
    const floorCapacity = new Map<string, number>();
    for (const line of capacityLines) {
      const key = `${line.floor.section.factory.code}|${line.floor.code}`;
      const mc = (line.machinePools || []).filter((x: any) => x.active).reduce((a: number, x: any) => a + Number(x.machineCount || 0), 0);
      floorCapacity.set(key, (floorCapacity.get(key) || 0) + mc);
    }
    const allStyles = await this.prisma.style.findMany({ select: { id: true, styleNo: true, sourceMetadata: true } });

    // Bug Fix 3: Do not silently skip lines with 0 machine count or floors with 0 capacity
    const validation = validateGanttFloorCapacity(allStyles, targetIds, floorCapacity);
    if (!validation.ok && !dto.capacityOverride) {
      const details = [...validation.unconfiguredIssues, ...validation.overloads].join('; ');
      throw new BadRequestException(`Gantt floor capacity validation failed: ${details}. Configure machine counts/floor capacity or pass capacityOverride.`);
    }

    let approved = 0;
    for (const style of styles) {
      const sm = (style.sourceMetadata || {}) as any;
      const g = sm.ganttPlan;
      if (!g || !['DRAFT', 'REVIEWED'].includes(g.status)) continue;
      const next = { ...g, status: 'APPROVED', approvedAt: new Date().toISOString(), approvedByUserId: req.user.id, approvedByName: req.user.name, baselineVersion: Number(g.baselineVersion || 0) + 1, baselineStartDate: g.baselineStartDate || g.startDate, baselineFinishDate: g.baselineFinishDate || g.finishDate };
      await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: next }) } });
      approved += 1;
      await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'GANTT_PLAN_APPROVED', entityType: 'STYLE', entityId: style.id, before: toPrismaJson(g), after: toPrismaJson(next) } });
    }
    return {
      ok: true,
      approved,
      unconfiguredWarnings: validation.unconfiguredIssues,
      message: `${approved} Gantt plan item(s) approved as the current official line plan after floor machine-capacity validation.`,
    };
  }
}
