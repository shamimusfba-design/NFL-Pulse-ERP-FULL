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
const NFL_SHIFTING_LINES=new Set(['D1','D2','E1','E2','F','G1','G2','H1','H2','U','V1','V2','W1','W2','ZA1','ZA2']);
const TA_DATE_FIELDS = [
  'yarnDyeingStart', 'yarnDyeingEnd', 'knittingStart', 'knittingEnd',
  'dyeingFinishingStart', 'dyeingFinishingEnd', 'aopStart', 'aopEnd',
  'trimsInhouseDate', 'fileHandoverDate', 'ppMeetingDate',
  'cuttingStart', 'cuttingEnd', 'printingStart', 'printingEnd',
  'stoneStart', 'stoneEnd', 'embroideryStart', 'embroideryEnd',
  'sewingStartDate', 'sewingEnd', 'garmentWashStart', 'garmentWashEnd',
  'finishingStart', 'finishingEnd', 'preFinalInspection', 'finalInspection', 'exFactoryDate', 'cargoClosingDate',
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
}

const DEFAULT_CAPACITY_POLICIES = {
  thresholds: { greenMax: 85, amberMax: 100 },
  holidays: [] as string[],
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
export function firstCcd(style: any) {
  const values = (style.purchaseOrders || []).map((p: any) => p.ccd || p.shipmentDate).filter(Boolean).map((v: any) => new Date(v));
  values.sort((a: Date, b: Date) => a.getTime() - b.getTime());
  return values[0] || null;
}
type TaProcessRow = {
  key: string;
  label: string;
  startField?: TaDateField;
  endField?: TaDateField;
  dateField?: TaDateField;
  duration: number;
  minDuration: number;
  slackBefore: number;
  maxOverlap: number;
  compressionPriority: number;
  basis: string;
  fixed?: boolean; // optional: a row whose date must never be clamped (none set today)
};

function dayOnlyUtc(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
function inclusiveDays(a: Date, b: Date) {
  return Math.floor((dayOnlyUtc(b).getTime() - dayOnlyUtc(a).getTime()) / 86400000) + 1;
}
function scalarDays(start?: string, end?: string) {
  if (!start || !end) return 0;
  return Math.max(1, inclusiveDays(new Date(start), new Date(end)));
}
function styleFacts(style: any) {
  const sm = (style.sourceMetadata || {}) as any;
  const sectionData = sm.sectionData || {};
  const production = sm.production || {};
  const qty = Math.max(1, Number(style.quantity || 0));
  const fabricKg = Math.max(0, Number(production.fabricRequired || sectionData.knitting?.requiredKg || qty * 0.22));
  const route = Array.isArray(sm.processRouting) ? sm.processRouting.map((x: any) => String(x).toUpperCase()) : [];
  const finishProcesses = Array.isArray(sectionData.fabricFinishing?.processes) ? sectionData.fabricFinishing.processes.map((x: any) => String(x).toUpperCase()) : [];
  const printApplicable = route.includes('PRINTING') || sectionData.printing?.applicable === true || Number(production.printQty || 0) > 0 || sm.planning?.printOutsidePlan === true;
  const embApplicable = route.includes('EMBROIDERY') || sectionData.embroidery?.applicable === true || Number(production.embroideryQty || 0) > 0 || sm.planning?.embroideryOutsidePlan === true;
  const yarnDyeKg = Math.max(0, Number(sectionData.yarnDyeing?.requiredKg || sectionData.yarnDyeing?.greySentKg || 0));
  const yarnDyeingApplicable = route.includes('YARN_DYEING') || yarnDyeKg > 0;
  const aopApplicable = route.some((x: string) => ['AOP','BRUSH','PEACH','FABRIC_FINISHING'].includes(x)) || finishProcesses.some((x: string) => /(AOP|BRUSH|PEACH)/.test(x));
  const washApplicable = route.some((x: string) => /(GARMENT_WASH|GARMENT_DYE|WASH)/.test(x)) || /WASH|DYE/.test(String(sectionData.specialProcess?.process || '').toUpperCase());
  return { sm, sectionData, production, qty, fabricKg, yarnDyeKg, printApplicable, embApplicable, yarnDyeingApplicable, aopApplicable, washApplicable };
}
function fabricBand(kg: number) {
  if (kg <= 1000) return { name: '≤1,000 KG', yarn: [5,3], knit: [4,2], dye: [10,6], aop: [3,2], yarnSlack: 1, knitSlack: 2, dyeSlack: 1 };
  if (kg <= 5000) return { name: '1,001–5,000 KG', yarn: [7,4], knit: [7,4], dye: [15,9], aop: [5,3], yarnSlack: 2, knitSlack: 3, dyeSlack: 2 };
  return { name: '>5,000 KG', yarn: [10,6], knit: [13,7], dye: [23,12], aop: [8,4], yarnSlack: 2, knitSlack: 4, dyeSlack: 3 };
}
function garmentBand(qty: number) {
  if (qty <= 5000) return { name: '≤5,000 PCS', cutting:[2,1], print:[3,2], emb:[3,2], sewing:[3,1], finish:[2,1] };
  if (qty <= 15000) return { name: '5,001–15,000 PCS', cutting:[3,2], print:[4,2], emb:[4,2], sewing:[6,3], finish:[3,2] };
  if (qty <= 30000) return { name: '15,001–30,000 PCS', cutting:[4,2], print:[5,3], emb:[6,3], sewing:[8,4], finish:[4,2] };
  return { name: '>30,000 PCS', cutting:[5,3], print:[7,4], emb:[8,4], sewing:[13,6], finish:[5,3] };
}
function sewingLeadDays(facts: ReturnType<typeof styleFacts>, fallback: [number,number]) {
  const ie = facts.sm.ieBulletin || facts.sectionData.ie || {};
  const smv = Number(ie.smv || 0);
  const machines = Number(ie.machineQty || facts.sectionData.sewing?.machineQty || 0);
  const hours = Math.max(1, Number(facts.sm.ganttPlan?.workingHours || facts.sm.planning?.workingHours || 8));
  const efficiencyPct = Math.max(1, Number(ie.achievableEfficiencyPct || facts.sectionData.sewing?.efficiencyPct || 65));
  if (smv > 0 && machines > 0) {
    const requiredMinutes = facts.qty * smv;
    const dailyMinutes = machines * hours * 60 * (efficiencyPct / 100);
    return Math.max(1, Math.ceil(requiredMinutes / Math.max(1, dailyMinutes)));
  }
  return fallback[0];
}
function timelineSpan(rows: TaProcessRow[]) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row, index) => sum + Math.max(1, row.duration) + (index ? row.slackBefore : 0), 0);
}
function compressRows(rows: TaProcessRow[], shortageInput: number) {
  let shortage = Math.max(0, shortageInput);
  const recovered = { slack: 0, leadTime: 0, overlap: 0, priority: 0 };
  // 1) consume planned slack first.
  for (const row of rows) {
    while (shortage > 0 && row.slackBefore > 0) { row.slackBefore -= 1; shortage -= 1; recovered.slack += 1; }
  }
  // 2) reduce durations toward practical minimum, safest sections first.
  const byPriority = [...rows].sort((a,b) => a.compressionPriority - b.compressionPriority);
  for (const row of byPriority) {
    while (shortage > 0 && row.duration > row.minDuration) { row.duration -= 1; shortage -= 1; recovered.leadTime += 1; }
  }
  // 3) use controlled overlap / partial lot release.
  for (const row of rows) {
    while (shortage > 0 && row.slackBefore > -row.maxOverlap) { row.slackBefore -= 1; shortage -= 1; recovered.overlap += 1; }
  }
  // 4) priority mode: if CCD still cannot fit, compress non-milestone work to 1 day before inventing past dates.
  for (const row of byPriority) {
    if (!row.startField || !row.endField) continue;
    while (shortage > 0 && row.duration > 1) { row.duration -= 1; shortage -= 1; recovered.priority += 1; }
  }
  // 5) last-resort parallel release. This keeps the first planned process at tomorrow and CCD fixed.
  let guard = 0;
  while (shortage > 0 && rows.length > 1 && guard < 500) {
    for (let i = 1; i < rows.length && shortage > 0; i += 1) {
      rows[i].slackBefore -= 1; shortage -= 1; recovered.priority += 1;
    }
    guard += 1;
  }
  return { remaining: shortage, recovered };
}
function buildTaRows(style: any) {
  const facts = styleFacts(style);
  const fb = fabricBand(facts.fabricKg);
  const gb = garmentBand(facts.qty);
  const rows: TaProcessRow[] = [];
  const pushDuration = (row: Omit<TaProcessRow,'duration'|'minDuration'> & { duration:[number,number] | number, minDuration?: number }) => {
    const duration = Array.isArray(row.duration) ? row.duration[0] : row.duration;
    const minDuration = row.minDuration ?? (Array.isArray(row.duration) ? row.duration[1] : Math.max(1, Math.ceil(duration * .6)));
    rows.push({ ...row, duration, minDuration } as TaProcessRow);
  };
  const pushMilestone = (key:string,label:string,dateField:TaDateField,slackBefore:number,basis:string) => rows.push({ key,label,dateField,duration:1,minDuration:1,slackBefore,maxOverlap:0,compressionPriority:99,basis });

  if (facts.yarnDyeingApplicable) pushDuration({ key:'yarnDyeing', label:'Yarn Dyeing', startField:'yarnDyeingStart', endField:'yarnDyeingEnd', duration:fb.yarn as [number,number], slackBefore:0, maxOverlap:1, compressionPriority:5, basis:`${Math.round(facts.yarnDyeKg || facts.fabricKg)} KG yarn dyeing` });
  pushDuration({ key:'knitting', label:'Knitting', startField:'knittingStart', endField:'knittingEnd', duration:fb.knit as [number,number], slackBefore:facts.yarnDyeingApplicable?fb.yarnSlack:0, maxOverlap:2, compressionPriority:6, basis:`${Math.round(facts.fabricKg)} KG fabric · ${fb.name}` });
  pushDuration({ key:'dyeing', label:'Dyeing / Fabric Finishing', startField:'dyeingFinishingStart', endField:'dyeingFinishingEnd', duration:fb.dye as [number,number], slackBefore:fb.knitSlack, maxOverlap:2, compressionPriority:7, basis:`${Math.round(facts.fabricKg)} KG fabric · ${fb.name}` });
  if (facts.aopApplicable) pushDuration({ key:'aop', label:'AOP / Brush / Peach', startField:'aopStart', endField:'aopEnd', duration:fb.aop as [number,number], slackBefore:fb.dyeSlack, maxOverlap:2, compressionPriority:4, basis:`Applicable fabric process · ${fb.name}` });
  pushMilestone('trims','Trims In-house','trimsInhouseDate',facts.aopApplicable?1:fb.dyeSlack,'Material readiness milestone');
  pushMilestone('file','File Handover','fileHandoverDate',0,'Technical / merchandising handover milestone');
  pushMilestone('pp','PP Meeting','ppMeetingDate',1,'Pre-production milestone');
  pushDuration({ key:'cutting', label:'Cutting', startField:'cuttingStart', endField:'cuttingEnd', duration:gb.cutting as [number,number], slackBefore:1, maxOverlap:1, compressionPriority:3, basis:`${facts.qty.toLocaleString()} PCS · ${gb.name}` });
  if (facts.printApplicable) pushDuration({ key:'printing', label:'Printing', startField:'printingStart', endField:'printingEnd', duration:gb.print as [number,number], slackBefore:1, maxOverlap:2, compressionPriority:2, basis:`Applicable print quantity · ${gb.name}` });
  if (facts.embApplicable) pushDuration({ key:'embroidery', label:'Embroidery', startField:'embroideryStart', endField:'embroideryEnd', duration:gb.emb as [number,number], slackBefore:facts.printApplicable?0:1, maxOverlap:2, compressionPriority:2, basis:`Applicable embroidery quantity · ${gb.name}` });
  const sewDays = sewingLeadDays(facts, gb.sewing as [number,number]);
  pushDuration({ key:'sewing', label:'Sewing', startField:'sewingStartDate', endField:'sewingEnd', duration:sewDays, minDuration:(gb.sewing as [number,number])[1], slackBefore:1, maxOverlap:2, compressionPriority:1, basis:`${facts.qty.toLocaleString()} PCS${facts.sm.ieBulletin?.smv ? ` · SMV ${facts.sm.ieBulletin.smv}` : ''}` });
  if (facts.washApplicable) pushDuration({ key:'garmentWash', label:'Garment Wash / Dye', startField:'garmentWashStart', endField:'garmentWashEnd', duration:Math.max(4, Math.ceil(facts.qty/8000)), minDuration:2, slackBefore:0, maxOverlap:1, compressionPriority:4, basis:'Applicable garment wash / dye process' });
  pushDuration({ key:'finishing', label:'Finishing / Packing', startField:'finishingStart', endField:'finishingEnd', duration:gb.finish as [number,number], slackBefore:0, maxOverlap:2, compressionPriority:2, basis:`${facts.qty.toLocaleString()} PCS · ${gb.name}` });
  pushMilestone('preFinal','Pre-Final Inspection','preFinalInspection',1,'Inspection milestone');
  pushMilestone('final','Final Inspection','finalInspection',1,'Final inspection milestone');
  pushMilestone('exFactory','Ex-Factory','exFactoryDate',2,'Shipment release milestone');
  pushMilestone('ccd','CCD / Shipment Date','cargoClosingDate',1,'Fixed buyer CCD / shipment date');
  return { rows, facts, fb, gb };
}
export function scheduleFromCcd(style: any) {
  const ccd = firstCcd(style) || addDays(new Date(), 45);
  const today = dayOnlyUtc(new Date());
  const tomorrow = addDays(today, 1);
  const { rows, facts, fb, gb } = buildTaRows(style);
  const baselineRequiredDays = timelineSpan(rows);
  const availableDays = Math.max(1, inclusiveDays(tomorrow, ccd));
  const shortageDays = Math.max(0, baselineRequiredDays - availableDays);
  const { remaining, recovered } = compressRows(rows, shortageDays);
  const result: Record<string, any> = {};
  let cursor = dayOnlyUtc(ccd);
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (row.dateField) {
      result[row.dateField] = iso(cursor);
    } else if (row.startField && row.endField) {
      const end = new Date(cursor);
      const start = addDays(end, -(Math.max(1,row.duration)-1));
      result[row.startField] = iso(start);
      result[row.endField] = iso(end);
    }
    if (i > 0) {
      const currentStart = row.dateField ? cursor : new Date(result[row.startField!]);
      cursor = addDays(currentStart, -(row.slackBefore + 1));
    }
  }
  const firstRow = rows[0];
  const firstStart = firstRow.dateField ? new Date(result[firstRow.dateField]) : new Date(result[firstRow.startField!]);
  // Newly generated T&A must never leave an editable process date in the past.
  // Keep buyer CCD fixed; if remaining lead time is infeasible, clamp process dates to today
  // and flag the schedule for Planning review instead of presenting past dates as valid.
  const todayIso = iso(today);
  const firstProcessViolation = firstStart < today;
  let clampedPastProcessDates = false;
  for (const row of rows) {
    if (row.dateField && !row.fixed) {
      const value = result[row.dateField];
      if (value && value < todayIso) { result[row.dateField] = todayIso; clampedPastProcessDates = true; }
    }
    if (row.startField && row.endField) {
      const startValue = result[row.startField];
      const endValue = result[row.endField];
      if (startValue && startValue < todayIso) { result[row.startField] = todayIso; clampedPastProcessDates = true; }
      if (endValue && endValue < todayIso) { result[row.endField] = todayIso; clampedPastProcessDates = true; }
      if (result[row.endField] < result[row.startField]) result[row.endField] = result[row.startField];
    }
  }
  result.taGeneration = {
    engineVersion: '2.0',
    generatedAt: new Date().toISOString(),
    fixedCcd: iso(dayOnlyUtc(ccd)),
    earliestAllowedStart: iso(tomorrow),
    firstProcess: firstRow.label,
    firstProcessStart: iso(firstProcessViolation ? today : firstStart),
    clampedPastProcessDates,
    scheduleFeasibility: firstProcessViolation || clampedPastProcessDates ? 'PLANNING_REVIEW_REQUIRED' : 'FEASIBLE',
    baselineRequiredDays,
    availableDays,
    shortageDays,
    recoveredDays: recovered.slack + recovered.leadTime + recovered.overlap + recovered.priority,
    recovery: recovered,
    remainingGapDays: Math.max(0, remaining + (firstProcessViolation ? inclusiveDays(firstStart, addDays(today,-1)) : 0)),
    mode: shortageDays <= 0 ? 'STANDARD' : recovered.priority > 0 ? 'AGGRESSIVE_COMPRESSION' : 'COMPRESSED',
    fabricRequiredKg: Number(facts.fabricKg.toFixed(2)),
    garmentOrderQty: facts.qty,
    fabricQtyBand: fb.name,
    garmentQtyBand: gb.name,
    note: 'CCD is fixed. New auto-plan never intentionally starts before tomorrow; shortage is recovered from slack, practical lead-time compression and allowed overlap / partial release.',
    processBasis: rows.map((row) => ({ process: row.label, leadTimeDays: row.dateField ? null : row.duration, slackBeforeDays: row.slackBefore, basis: row.basis })),
  };
  return result;
}

function slotForDate(date: Date) {
  const day = date.getUTCDate();
  return day <= 10 ? 1 : day <= 20 ? 2 : 3;
}
function monthKey(date: Date) { return date.toISOString().slice(0, 7); }
function daysInMonth(year: number, monthIndex: number) { return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate(); }
export function holidaySet(policies: any): Set<string> {
  const list = Array.isArray(policies?.holidays) ? policies.holidays : [];
  return new Set(list.map((x: any) => String(x).slice(0, 10)).filter((x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x)));
}
export function daysInSlot(year: number, monthIndex: number, slot: number, sundayFactor = 1, holidays: Set<string> = new Set()) {
  const maxDay = daysInMonth(year, monthIndex);
  const start = slot === 1 ? 1 : slot === 2 ? 11 : 21;
  const end = slot === 1 ? 10 : slot === 2 ? 20 : maxDay;
  let equivalent = 0;
  for (let day = start; day <= end; day += 1) {
    const d = new Date(Date.UTC(year, monthIndex, day));
    if (holidays.has(d.toISOString().slice(0, 10))) continue; // factory closure (Eid, public holiday)
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
    embroidery: 'embroideryStart', sewing: 'sewingStartDate', finishing: 'finishingStart',
  };
  const value = p[map[section]] || p.sewingStartDate;
  return value ? new Date(value) : null;
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
    return (latest?.after as any)?.policies || DEFAULT_CAPACITY_POLICIES;
  }

  private async heatmap(month?: string) {
    const policies: any = await this.capacityPolicies();
    const target = /^\d{4}-\d{2}$/.test(month || '') ? `${month}-01T00:00:00.000Z` : new Date().toISOString();
    const base = new Date(target);
    const year = base.getUTCFullYear();
    const monthIndex = base.getUTCMonth();
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const holidays = holidaySet(policies);
    const sections = Object.keys(policies.bulk || {});
    const rows: Record<string, any> = {};
    for (const section of sections) {
      const p = policies.bulk[section];
      rows[section] = { section, label: p.label || section, unit: p.unit || 'PCS', slots: [1, 2, 3].map((slot) => ({ slot, demand: 0, capacity: Number(p.dailyCapacity || 0) * daysInSlot(year, monthIndex, slot, Number(p.sundayFactor ?? 1), holidays), loadPct: 0, jobs: 0 })) };
    }
    // Capacity must include every relevant Job/Style. There is deliberately no business-data cap here.
    // A job count of 200, 2,000 or 20,000 changes query volume, not planning correctness.
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
      { section: 'sampleKnitting', label: 'Sample Knitting', unit: 'KG + COLOR', slots: sampleAgg.knitting.map((c: any) => { const days = daysInSlot(year, monthIndex, c.slot, 1, holidays); const kgCap = Number(policies.sample.knitting.dailyKg || 350) * days; const colorCap = Number(policies.sample.knitting.dailyColors || 40) * days; const kgPct = kgCap ? c.kg / kgCap * 100 : 0; const colorPct = colorCap ? c.colors / colorCap * 100 : 0; const loadPct = Number(Math.max(kgPct, colorPct).toFixed(1)); return { ...c, capacityText: `${kgCap} KG / ${colorCap} colors`, demandText: `${c.kg.toFixed(1)} KG / ${c.colors} colors`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'sampleDyeing', label: 'Sample Dyeing', unit: 'BATCH/COLOR', slots: sampleAgg.dyeing.map((c: any) => { const cap = Number(policies.sample.dyeing.slotCapacity || 185); const loadPct = Number((c.batches / cap * 100).toFixed(1)); return { ...c, capacityText: `${cap} batch`, demandText: `${c.batches} batch`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'samplePrinting', label: 'Sample Printing', unit: 'STYLE + PCS', slots: sampleAgg.printing.map((c: any) => { const days = daysInSlot(year, monthIndex, c.slot, 1, holidays); const styleCap = Number(policies.sample.printing.dailyStyles || 60) * days; const pcsCap = Number(policies.sample.printing.dailyPcs || 800) * days; const loadPct = Number(Math.max(styleCap ? c.styles/styleCap*100 : 0, pcsCap ? c.pcs/pcsCap*100 : 0).toFixed(1)); return { ...c, capacityText: `${styleCap} styles / ${pcsCap} pcs`, demandText: `${c.styles} styles / ${c.pcs} pcs`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
      { section: 'sampleMaking', label: 'Sample Making', unit: 'STYLE', slots: sampleAgg.making.map((c: any) => { const cap = Number(policies.sample.making.monthlyStyles || 800) / 3; const loadPct = Number((c.styles / cap * 100).toFixed(1)); return { ...c, capacityText: `${Math.round(cap)} styles`, demandText: `${c.styles} styles`, loadPct, status: loadPct <= greenMax ? 'GOOD' : loadPct <= amberMax ? 'ATTENTION' : 'OVERLOAD' }; }) },
    ];
    return { month: key, thresholds: policies.thresholds, rows: list, sampleRows, samplePolicies: policies.sample, bulkPolicies: policies.bulk };
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
    const next = { ...current, ...body, thresholds: { ...(current as any).thresholds, ...(body.thresholds || {}) }, bulk: { ...(current as any).bulk, ...(body.bulk || {}) }, sample: { ...(current as any).sample, ...(body.sample || {}) } };
    if (body.holidays !== undefined) {
      if (!Array.isArray(body.holidays)) throw new BadRequestException('holidays must be a list of YYYY-MM-DD dates');
      (next as any).holidays = Array.from(holidaySet({ holidays: body.holidays })).sort();
    }
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
  async gantt(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('factory') factory?: string, @Query('q') q?: string) {
    this.ensurePlanning(req);
    // Read styles directly instead of loading every Order + every Style. This keeps the Gantt responsive
    // after large canonical imports (2,000+ jobs) and still preserves all information needed by the planner.
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
    const fromDate=from?new Date(`${from}T00:00:00.000Z`):null; const toDate=to?new Date(`${to}T23:59:59.999Z`):null; const search=String(q||'').trim().toLowerCase();
    const rows: any[] = [];
    for (const style of styles) {
      const order=style.order; const sm = (style.sourceMetadata || {}) as any; const p = sm.planning || {}; const g = sm.ganttPlan || null;
      if (p.taStatus !== 'APPROVED') continue;
      const rowFactory=String(g?.factoryCode||'NFL').toUpperCase(); if(factory&&factory!=='ALL'&&rowFactory!==String(factory).toUpperCase())continue;
      if(search&&!`${order.jobNo} ${style.styleNo} ${style.itemDescription||''} ${order.buyer?.name||''}`.toLowerCase().includes(search))continue;
      if(fromDate||toDate){
        const startValue=g?.startDate||p.sewingStartDate||p.cuttingStart||p.taPlanDate; const finishValue=g?.finishDate||p.sewingEnd||startValue;
        const start=startValue?new Date(startValue):null; const finish=finishValue?new Date(finishValue):start;
        if(start&&finish&&!Number.isNaN(start.getTime())&&!Number.isNaN(finish.getTime())){if(fromDate&&finish<fromDate)continue;if(toDate&&start>toDate)continue;}
      }
      const colors = Array.from(new Set((style.breakdowns || []).map((b: any) => b.color).filter(Boolean)));
      const fullSectionData = sm.sectionData || {};
      // Gantt only needs sewing-readiness facts. Avoid sending the whole Yarn→Shipment payload
      // for every job in the visible window; full operational data remains in the database.
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
  async ganttFind(@Req() req:any,@Query('q') q?:string){
    this.ensurePlanning(req); const search=String(q||'').trim(); if(!search)return null;
    const rows=await this.gantt(req,undefined,undefined,undefined,search);
    return rows[0]||null;
  }

  @Post('gantt/generate')
  async ganttGenerate(@Req() req: any) {
    this.ensurePlanning(req);
    const orders = await this.prisma.order.findMany({ include: { styles: true } });
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
    const ie = sm.ieBulletin || {};
    const sectionSewing = sm.sectionData?.sewing || {};
    if (before.locked && dto.locked !== false) throw new BadRequestException('This approved / frozen plan is locked. Unlock it before changing line, date or capacity inputs.');
    const effectiveFactory=String(dto.factoryCode ?? before.factoryCode ?? 'NFL').toUpperCase();
    const effectiveLine=String(dto.lineCode ?? before.lineCode ?? '').toUpperCase();
    const isShifting=effectiveFactory==='NFL'&&NFL_SHIFTING_LINES.has(effectiveLine);
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
    const standardTarget=Number(ie.dailyTarget||before.standardTarget||before.baseDailyTarget||before.dailyTarget||1400);
    let dailyTarget = standardTarget;
    const blendedEfficiency = Math.min(efficiencyPct, Math.max(1, learningEfficiencyPct + (efficiencyPct - learningEfficiencyPct) * 0.65));
    if (smv > 0 && manpower > 0) dailyTarget = Math.max(1, Math.round((manpower * totalHours * 60 * (blendedEfficiency / 100)) / smv));
    else if (dto.workingHours || dto.overtimeHours) dailyTarget = Math.max(1, Math.round(Number(before.baseDailyTarget || before.dailyTarget || 1400) * totalHours / 8));
    const changeoverDays = changeoverMinutes > 0 ? changeoverMinutes / Math.max(60, totalHours * 60) : 0;
    const requiredDays = Math.max(1, Math.ceil((remainingQty / Math.max(1, dailyTarget)) + changeoverDays));
    let autoFinish = addDays(startDate, requiredDays - 1);
    if (dto.skipSunday ?? before.skipSunday ?? true) {
      let cursor = new Date(startDate); let work = 1;
      while (work < requiredDays) { cursor = addDays(cursor, 1); if (cursor.getDay() !== 0) work += 1; }
      autoFinish = cursor;
    }
    const finishDate = dto.finishDate ? new Date(dto.finishDate) : autoFinish;
    const splitPlan = dto.splitPlanJson !== undefined ? (() => { try { return JSON.parse(dto.splitPlanJson || '[]'); } catch { return []; } })() : before.splitPlan || [];
    const next = { ...before,
      ...(dto.lineId ? { lineId: dto.lineId } : {}), ...(dto.lineCode ? { lineCode: dto.lineCode } : {}), ...(dto.factoryCode ? { factoryCode: dto.factoryCode } : {}), ...(dto.floorCode ? { floorCode: dto.floorCode } : {}),
      workingHours, overtimeHours, totalHours, smv: smv || undefined, manpower: manpower || undefined, efficiencyPct, learningEfficiencyPct, achievementPct: dto.achievementPct ?? before.achievementPct ?? sectionSewing.achievementPct ?? 0, machineQty, machineRequirements:ie.machineRequirements||before.machineRequirements||[], standardTarget, changeoverMinutes, actualQty, remainingQty,
      dailyTarget, requiredDays, preStartDate: dto.preStartDate ? new Date(dto.preStartDate).toISOString() : before.preStartDate, startDate: startDate.toISOString(), finishDate: finishDate.toISOString(), autoCalculatedFinishDate: autoFinish.toISOString(), plannerManualOverride: true,
      ieInputStatus: (smv > 0 && manpower > 0 && machineQty > 0) ? 'READY' : 'PENDING_IE_OR_PLANNER_INPUT',
      skipSunday: dto.skipSunday ?? before.skipSunday ?? true, locked: dto.locked ?? before.locked ?? false, shiftProfile: isShifting ? 'A+B' : (dto.shiftProfile ?? before.shiftProfile ?? 'GENERAL'), planningStatus: dto.planningStatus ?? before.planningStatus ?? 'PLANNED', splitPlan,
      baselineStartDate: before.baselineStartDate || (before.status === 'APPROVED' ? before.startDate : undefined), baselineFinishDate: before.baselineFinishDate || (before.status === 'APPROVED' ? before.finishDate : undefined),
      ...(dto.remark !== undefined ? { remark: dto.remark } : {}), status: dto.status || 'REVIEWED', reviewedAt: new Date().toISOString(), reviewedByUserId: req.user.id, reviewedByName: req.user.name };
    const ccd = firstCcd(style); const finish = next.finishDate ? new Date(next.finishDate) : null; const bufferDays = ccd && finish ? Math.floor((ccd.getTime() - finish.getTime()) / 86400000) : null;
    next.bufferDays = bufferDays; next.risk = bufferDays === null ? 'UNKNOWN' : bufferDays < 0 ? 'CRITICAL' : bufferDays <= 2 ? 'RISK' : 'ON_TRACK';
    await this.prisma.style.update({ where: { id: styleId }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: next }) } });
    await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'GANTT_PLAN_REVIEWED', entityType: 'STYLE', entityId: styleId, before: toPrismaJson(before), after: toPrismaJson(next) } });
    return next;
  }

  @Get('gantt/styles/:styleId/history')
  async ganttHistory(@Param('styleId') styleId: string, @Req() req: any) {
    this.ensurePlanning(req);
    const logs = await this.prisma.auditLog.findMany({ where: { entityType: 'STYLE', entityId: styleId, action: { in: ['GANTT_PLAN_REVIEWED','GANTT_PLAN_APPROVED','GANTT_PLAN_UNDONE'] } }, orderBy: { createdAt: 'desc' }, take: 20 });
    return logs.map((x:any) => ({ id:x.id, action:x.action, createdAt:x.createdAt, userId:x.userId, before:x.before, after:x.after }));
  }

  @Post('gantt/styles/:styleId/undo')
  async ganttUndo(@Param('styleId') styleId: string, @Req() req: any) {
    this.ensurePlanning(req);
    const style = await this.prisma.style.findUnique({ where:{ id:styleId } });
    if (!style) throw new BadRequestException('Style not found');
    const sm = (style.sourceMetadata || {}) as any; const current = sm.ganttPlan || {};
    if (current.locked) throw new BadRequestException('Unlock the plan before undo.');
    const latest = await this.prisma.auditLog.findFirst({ where:{ entityType:'STYLE', entityId:styleId, action:'GANTT_PLAN_REVIEWED' }, orderBy:{ createdAt:'desc' } });
    const previous = latest?.before as any;
    if (!previous) throw new BadRequestException('No previous Gantt review is available to restore.');
    const restored = { ...previous, status:'REVIEWED', undoneAt:new Date().toISOString(), undoneByUserId:req.user.id, undoneByName:req.user.name };
    await this.prisma.style.update({ where:{id:styleId}, data:{ sourceMetadata:toPrismaJson({ ...sm, ganttPlan:restored }) } });
    await this.prisma.auditLog.create({ data:{ userId:req.user.id, action:'GANTT_PLAN_UNDONE', entityType:'STYLE', entityId:styleId, before:toPrismaJson(current), after:toPrismaJson(restored) } });
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

    // Hard validation uses the live Line/Machine master, not stale hard-coded floor totals.
    const capacityLines=dedupePhysicalLines(await this.prisma.line.findMany({where:{active:true},include:{machinePools:true,floor:{include:{section:{include:{factory:true}}}}}}));
    const floorCapacity=new Map<string,number>();
    for(const line of capacityLines){const key=`${line.floor.section.factory.code}|${line.floor.code}`;const mc=(line.machinePools||[]).filter((x:any)=>x.active).reduce((a:number,x:any)=>a+Number(x.machineCount||0),0);floorCapacity.set(key,(floorCapacity.get(key)||0)+mc)}
    const allStyles = await this.prisma.style.findMany({ select: { id: true, sourceMetadata: true } });
    const loads = new Map<string, { used: number; jobs: string[] }>();
    const skipped: string[] = [];
    for (const row of allStyles) {
      const sm = (row.sourceMetadata || {}) as any;
      const g = sm.ganttPlan;
      if (!g?.startDate || !g?.finishDate || !g?.floorCode) continue;
      const include = g.status === 'APPROVED' || targetIds.has(row.id);
      if (!include) continue;
      const factoryCode = g.factoryCode || 'NFL';
      const floorKey = `${factoryCode}|${g.floorCode}`;
      const cap = floorCapacity.get(floorKey)||0;
      if (!cap) { if (targetIds.has(row.id)) skipped.push(`${floorKey}: no machine capacity set`); continue; } // NCL / future floors stay configurable until their max is confirmed.
      const machineQty = Math.max(0, Number(sm.ieBulletin?.machineQty || g.machineQty || 0));
      if (!machineQty) { if (targetIds.has(row.id)) skipped.push(`${g.jobNo || row.id}: machine qty missing`); continue; }
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
      const cap = floorCapacity.get(floorKey)||0;
      if (cap && load.used > cap) {
        throw new BadRequestException(`${floorKey} machine capacity exceeded on ${day}: ${load.used} planned / ${cap} max. Reduce machine load, change floor/line, date or working hours before official approval.`);
      }
    }

    let approved = 0;
    for (const style of styles) {
      const sm = (style.sourceMetadata || {}) as any; const g = sm.ganttPlan;
      if (!g || !['DRAFT', 'REVIEWED'].includes(g.status)) continue;
      const next = { ...g, status: 'APPROVED', approvedAt: new Date().toISOString(), approvedByUserId: req.user.id, approvedByName: req.user.name, baselineVersion: Number(g.baselineVersion || 0) + 1, baselineStartDate: g.baselineStartDate || g.startDate, baselineFinishDate: g.baselineFinishDate || g.finishDate };
      await this.prisma.style.update({ where: { id: style.id }, data: { sourceMetadata: toPrismaJson({ ...sm, ganttPlan: next }) } }); approved += 1;
      await this.prisma.auditLog.create({ data: { userId: req.user.id, action: 'GANTT_PLAN_APPROVED', entityType: 'STYLE', entityId: style.id, before: toPrismaJson(g), after: toPrismaJson(next) } });
    }
    const uniqueSkipped = Array.from(new Set(skipped));
    const warn = uniqueSkipped.length ? ` Not capacity-checked (${uniqueSkipped.length}): ${uniqueSkipped.slice(0, 5).join('; ')}${uniqueSkipped.length > 5 ? ' …' : ''}.` : '';
    return { ok: true, approved, notCapacityChecked: uniqueSkipped, message: `${approved} Gantt plan item(s) approved as the current official line plan after floor machine-capacity validation.${warn}` };
  }
}
