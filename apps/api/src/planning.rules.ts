export const TA_DATE_FIELDS = [
  'yarnDyeingStart', 'yarnDyeingEnd', 'knittingStart', 'knittingEnd',
  'dyeingFinishingStart', 'dyeingFinishingEnd', 'aopStart', 'aopEnd',
  'trimsInhouseDate', 'fileHandoverDate', 'ppMeetingDate',
  'testCuttingDate',
  'cuttingStart', 'cuttingEnd', 'printingStart', 'printingEnd',
  'stoneStart', 'stoneEnd', 'embroideryStart', 'embroideryEnd',
  'sewingStartDate', 'sewingEnd', 'garmentWashStart', 'garmentWashEnd',
  'finishingStart', 'finishingEnd', 'preFinalInspection', 'finalInspection', 'exFactoryDate', 'cargoClosingDate',
] as const;

export type TaDateField = typeof TA_DATE_FIELDS[number];

export type HolidayEntry = {
  date: string; // YYYY-MM-DD
  name: string;
  factor?: number; // 0 = full closure (default), 0.5 = half day
};

export type TaActivityTrack = {
  actualStart?: string;
  actualFinish?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'DELAYED' | 'FAILED';
  delayReason?: string;
  remarks?: string;
};

export type TaProcessRow = {
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
  fixed?: boolean;
};

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function iso(date: Date) {
  return date.toISOString();
}

export function dateOnly(value?: string | Date | null) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function dayOnlyUtc(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function inclusiveDays(a: Date, b: Date) {
  return Math.floor((dayOnlyUtc(b).getTime() - dayOnlyUtc(a).getTime()) / 86400000) + 1;
}

export function diffDays(plannedIso?: string | null, actualIso?: string | null): number | null {
  if (!plannedIso || !actualIso) return null;
  const p = new Date(plannedIso);
  const a = new Date(actualIso);
  if (Number.isNaN(p.getTime()) || Number.isNaN(a.getTime())) return null;
  return Math.round((dayOnlyUtc(a).getTime() - dayOnlyUtc(p).getTime()) / 86400000);
}

/**
 * Earliest CCD across all POs on a style.
 */
export function firstCcd(style: any): Date | null {
  const values = (style?.purchaseOrders || [])
    .map((p: any) => p.ccd || p.cargoClosingDate || p.shipmentDate)
    .filter(Boolean)
    .map((v: any) => new Date(v))
    .filter((d: Date) => !Number.isNaN(d.getTime()));
  values.sort((a: Date, b: Date) => a.getTime() - b.getTime());
  return values[0] || null;
}

export function slotForDate(date: Date) {
  const day = date.getUTCDate();
  return day <= 10 ? 1 : day <= 20 ? 2 : 3;
}

export function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Computes effective working days in a 10-day slot (1: 1-10, 2: 11-20, 3: 21-end).
 * - Weekly holiday is Sunday (`getUTCDay() === 0`), applying `sundayFactor` (e.g., 0.5 for Knitting, 0 for other sections).
 * - Factory holidays / Eid closures in `holidays` override that date's working factor (`factor ?? 0`).
 */
export function daysInSlot(
  year: number,
  monthIndex: number,
  slot: number,
  sundayFactor = 0,
  holidays: HolidayEntry[] = [],
) {
  const maxDay = daysInMonth(year, monthIndex);
  const start = slot === 1 ? 1 : slot === 2 ? 11 : 21;
  const end = slot === 1 ? 10 : slot === 2 ? 20 : maxDay;
  const holidayMap = new Map<string, number>();
  for (const h of holidays || []) {
    if (h?.date) {
      holidayMap.set(String(h.date).slice(0, 10), typeof h.factor === 'number' ? Math.max(0, Math.min(1, h.factor)) : 0);
    }
  }
  let equivalent = 0;
  for (let day = start; day <= end; day += 1) {
    const d = new Date(Date.UTC(year, monthIndex, day));
    const dateKey = d.toISOString().slice(0, 10);
    if (holidayMap.has(dateKey)) {
      equivalent += holidayMap.get(dateKey)!;
    } else if (d.getUTCDay() === 0) {
      // Weekly holiday is Sunday
      equivalent += sundayFactor;
    } else {
      equivalent += 1;
    }
  }
  return Number(equivalent.toFixed(2));
}

export function styleFacts(style: any) {
  const sm = (style?.sourceMetadata || {}) as any;
  const sectionData = sm.sectionData || {};
  const production = sm.production || {};
  const qty = Math.max(1, Number(style?.quantity || 0));
  const fabricKg = Math.max(0, Number(production.fabricRequired || sectionData.knitting?.requiredKg || qty * 0.22));
  const route = Array.isArray(sm.processRouting) ? sm.processRouting.map((x: any) => String(x).toUpperCase()) : [];
  const finishProcesses = Array.isArray(sectionData.fabricFinishing?.processes) ? sectionData.fabricFinishing.processes.map((x: any) => String(x).toUpperCase()) : [];
  const printApplicable = route.includes('PRINTING') || sectionData.printing?.applicable === true || Number(production.printQty || 0) > 0 || sm.planning?.printOutsidePlan === true;
  const embApplicable = route.includes('EMBROIDERY') || sectionData.embroidery?.applicable === true || Number(production.embroideryQty || 0) > 0 || sm.planning?.embroideryOutsidePlan === true;
  const yarnDyeKg = Math.max(0, Number(sectionData.yarnDyeing?.requiredKg || sectionData.yarnDyeing?.greySentKg || 0));
  const yarnDyeingApplicable = route.includes('YARN_DYEING') || yarnDyeKg > 0;
  const aopApplicable = route.some((x: string) => ['AOP', 'BRUSH', 'PEACH', 'FABRIC_FINISHING'].includes(x)) || finishProcesses.some((x: string) => /(AOP|BRUSH|PEACH)/.test(x));
  const washApplicable = route.some((x: string) => /(GARMENT_WASH|GARMENT_DYE|WASH)/.test(x)) || /WASH|DYE/.test(String(sectionData.specialProcess?.process || '').toUpperCase());
  return { sm, sectionData, production, qty, fabricKg, yarnDyeKg, printApplicable, embApplicable, yarnDyeingApplicable, aopApplicable, washApplicable };
}

export function fabricBand(kg: number) {
  if (kg <= 1000) return { name: '≤1,000 KG', yarn: [5, 3], knit: [4, 2], dye: [10, 6], aop: [3, 2], yarnSlack: 1, knitSlack: 2, dyeSlack: 1 };
  if (kg <= 5000) return { name: '1,001–5,000 KG', yarn: [7, 4], knit: [7, 4], dye: [15, 9], aop: [5, 3], yarnSlack: 2, knitSlack: 3, dyeSlack: 2 };
  return { name: '>5,000 KG', yarn: [10, 6], knit: [13, 7], dye: [23, 12], aop: [8, 4], yarnSlack: 2, knitSlack: 4, dyeSlack: 3 };
}

export function garmentBand(qty: number) {
  if (qty <= 5000) return { name: '≤5,000 PCS', cutting: [2, 1], print: [3, 2], emb: [3, 2], sewing: [3, 1], finish: [2, 1] };
  if (qty <= 15000) return { name: '5,001–15,000 PCS', cutting: [3, 2], print: [4, 2], emb: [4, 2], sewing: [6, 3], finish: [3, 2] };
  if (qty <= 30000) return { name: '15,001–30,000 PCS', cutting: [4, 2], print: [5, 3], emb: [6, 3], sewing: [8, 4], finish: [4, 2] };
  return { name: '>30,000 PCS', cutting: [5, 3], print: [7, 4], emb: [8, 4], sewing: [13, 6], finish: [5, 3] };
}

export function sewingLeadDays(facts: ReturnType<typeof styleFacts>, fallback: [number, number]) {
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

export function timelineSpan(rows: TaProcessRow[]) {
  if (!rows.length) return 0;
  return rows.reduce((sum, row, index) => sum + Math.max(1, row.duration) + (index ? row.slackBefore : 0), 0);
}

export function compressRows(rows: TaProcessRow[], shortageInput: number) {
  let shortage = Math.max(0, shortageInput);
  const recovered = { slack: 0, leadTime: 0, overlap: 0, priority: 0 };
  for (const row of rows) {
    while (shortage > 0 && row.slackBefore > 0) {
      row.slackBefore -= 1;
      shortage -= 1;
      recovered.slack += 1;
    }
  }
  const byPriority = [...rows].sort((a, b) => a.compressionPriority - b.compressionPriority);
  for (const row of byPriority) {
    while (shortage > 0 && row.duration > row.minDuration) {
      row.duration -= 1;
      shortage -= 1;
      recovered.leadTime += 1;
    }
  }
  for (const row of rows) {
    while (shortage > 0 && row.slackBefore > -row.maxOverlap) {
      row.slackBefore -= 1;
      shortage -= 1;
      recovered.overlap += 1;
    }
  }
  for (const row of byPriority) {
    if (!row.startField || !row.endField) continue;
    while (shortage > 0 && row.duration > 1) {
      row.duration -= 1;
      shortage -= 1;
      recovered.priority += 1;
    }
  }
  let guard = 0;
  while (shortage > 0 && rows.length > 1 && guard < 500) {
    for (let i = 1; i < rows.length && shortage > 0; i += 1) {
      rows[i].slackBefore -= 1;
      shortage -= 1;
      recovered.priority += 1;
    }
    guard += 1;
  }
  return { remaining: shortage, recovered };
}

/**
 * Builds the ordered T&A process & milestone rows, including Test Cutting / Size Set (Gap 4).
 */
export function buildTaRows(style: any) {
  const facts = styleFacts(style);
  const fb = fabricBand(facts.fabricKg);
  const gb = garmentBand(facts.qty);
  const rows: TaProcessRow[] = [];
  const pushDuration = (row: Omit<TaProcessRow, 'duration' | 'minDuration'> & { duration: [number, number] | number; minDuration?: number }) => {
    const duration = Array.isArray(row.duration) ? row.duration[0] : row.duration;
    const minDuration = row.minDuration ?? (Array.isArray(row.duration) ? row.duration[1] : Math.max(1, Math.ceil(duration * 0.6)));
    rows.push({ ...row, duration, minDuration } as TaProcessRow);
  };
  const pushMilestone = (key: string, label: string, dateField: TaDateField, slackBefore: number, basis: string) =>
    rows.push({ key, label, dateField, duration: 1, minDuration: 1, slackBefore, maxOverlap: 0, compressionPriority: 99, basis });

  if (facts.yarnDyeingApplicable)
    pushDuration({ key: 'yarnDyeing', label: 'Yarn Dyeing', startField: 'yarnDyeingStart', endField: 'yarnDyeingEnd', duration: fb.yarn as [number, number], slackBefore: 0, maxOverlap: 1, compressionPriority: 5, basis: `${Math.round(facts.yarnDyeKg || facts.fabricKg)} KG yarn dyeing` });
  pushDuration({ key: 'knitting', label: 'Knitting', startField: 'knittingStart', endField: 'knittingEnd', duration: fb.knit as [number, number], slackBefore: facts.yarnDyeingApplicable ? fb.yarnSlack : 0, maxOverlap: 2, compressionPriority: 6, basis: `${Math.round(facts.fabricKg)} KG fabric · ${fb.name}` });
  pushDuration({ key: 'dyeing', label: 'Dyeing / Fabric Finishing', startField: 'dyeingFinishingStart', endField: 'dyeingFinishingEnd', duration: fb.dye as [number, number], slackBefore: fb.knitSlack, maxOverlap: 2, compressionPriority: 7, basis: `${Math.round(facts.fabricKg)} KG fabric · ${fb.name}` });
  if (facts.aopApplicable)
    pushDuration({ key: 'aop', label: 'AOP / Brush / Peach', startField: 'aopStart', endField: 'aopEnd', duration: fb.aop as [number, number], slackBefore: fb.dyeSlack, maxOverlap: 2, compressionPriority: 4, basis: `Applicable fabric process · ${fb.name}` });
  pushMilestone('trims', 'Trims In-house', 'trimsInhouseDate', facts.aopApplicable ? 1 : fb.dyeSlack, 'Material readiness milestone');
  pushMilestone('file', 'File Handover', 'fileHandoverDate', 0, 'Technical / merchandising handover milestone');
  pushMilestone('pp', 'PP Meeting', 'ppMeetingDate', 1, 'Pre-production milestone');
  pushMilestone('testCutting', 'Test Cutting / Size Set', 'testCuttingDate', 1, 'Shrinkage & size-set trial before bulk cutting');
  pushDuration({ key: 'cutting', label: 'Cutting', startField: 'cuttingStart', endField: 'cuttingEnd', duration: gb.cutting as [number, number], slackBefore: 1, maxOverlap: 1, compressionPriority: 3, basis: `${facts.qty.toLocaleString()} PCS · ${gb.name}` });
  if (facts.printApplicable)
    pushDuration({ key: 'printing', label: 'Printing', startField: 'printingStart', endField: 'printingEnd', duration: gb.print as [number, number], slackBefore: 1, maxOverlap: 2, compressionPriority: 2, basis: `Applicable print quantity · ${gb.name}` });
  if (facts.embApplicable)
    pushDuration({ key: 'embroidery', label: 'Embroidery', startField: 'embroideryStart', endField: 'embroideryEnd', duration: gb.emb as [number, number], slackBefore: facts.printApplicable ? 0 : 1, maxOverlap: 2, compressionPriority: 2, basis: `Applicable embroidery quantity · ${gb.name}` });
  const sewDays = sewingLeadDays(facts, gb.sewing as [number, number]);
  pushDuration({ key: 'sewing', label: 'Sewing', startField: 'sewingStartDate', endField: 'sewingEnd', duration: sewDays, minDuration: (gb.sewing as [number, number])[1], slackBefore: 1, maxOverlap: 2, compressionPriority: 1, basis: `${facts.qty.toLocaleString()} PCS${facts.sm.ieBulletin?.smv ? ` · SMV ${facts.sm.ieBulletin.smv}` : ''}` });
  if (facts.washApplicable)
    pushDuration({ key: 'garmentWash', label: 'Garment Wash / Dye', startField: 'garmentWashStart', endField: 'garmentWashEnd', duration: Math.max(4, Math.ceil(facts.qty / 8000)), minDuration: 2, slackBefore: 0, maxOverlap: 1, compressionPriority: 4, basis: 'Applicable garment wash / dye process' });
  pushDuration({ key: 'finishing', label: 'Finishing / Packing', startField: 'finishingStart', endField: 'finishingEnd', duration: gb.finish as [number, number], slackBefore: 0, maxOverlap: 2, compressionPriority: 2, basis: `${facts.qty.toLocaleString()} PCS · ${gb.name}` });
  pushMilestone('preFinal', 'Pre-Final Inspection', 'preFinalInspection', 1, 'Inspection milestone');
  pushMilestone('final', 'Final Inspection', 'finalInspection', 1, 'Final inspection milestone');
  pushMilestone('exFactory', 'Ex-Factory', 'exFactoryDate', 2, 'Shipment release milestone');
  pushMilestone('ccd', 'CCD / Shipment Date', 'cargoClosingDate', 1, 'Fixed buyer CCD / shipment date');
  return { rows, facts, fb, gb };
}

/**
 * Backward-schedules all T&A dates from the earliest CCD on the style.
 */
export function scheduleFromCcd(style: any, referenceToday = new Date()) {
  const ccd = firstCcd(style) || addDays(referenceToday, 45);
  const today = dayOnlyUtc(referenceToday);
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
      const start = addDays(end, -(Math.max(1, row.duration) - 1));
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
  const todayIso = iso(today);
  const firstProcessViolation = firstStart < today;
  let clampedPastProcessDates = false;
  for (const row of rows) {
    if (row.dateField && !row.fixed) {
      const value = result[row.dateField];
      if (value && value < todayIso) {
        result[row.dateField] = todayIso;
        clampedPastProcessDates = true;
      }
    }
    if (row.startField && row.endField) {
      const startValue = result[row.startField];
      const endValue = result[row.endField];
      if (startValue && startValue < todayIso) {
        result[row.startField] = todayIso;
        clampedPastProcessDates = true;
      }
      if (endValue && endValue < todayIso) {
        result[row.endField] = todayIso;
        clampedPastProcessDates = true;
      }
      if (result[row.endField] < result[row.startField]) result[row.endField] = result[row.startField];
    }
  }
  result.taGeneration = {
    engineVersion: '2.1',
    generatedAt: referenceToday.toISOString(),
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
    remainingGapDays: Math.max(0, remaining + (firstProcessViolation ? inclusiveDays(firstStart, addDays(today, -1)) : 0)),
    mode: shortageDays <= 0 ? 'STANDARD' : recovered.priority > 0 ? 'AGGRESSIVE_COMPRESSION' : 'COMPRESSED',
    fabricRequiredKg: Number(facts.fabricKg.toFixed(2)),
    garmentOrderQty: facts.qty,
    fabricQtyBand: fb.name,
    garmentQtyBand: gb.name,
    note: 'CCD is fixed. New auto-plan never intentionally starts before tomorrow; shortage is recovered from slack, practical lead-time compression and allowed overlap / partial release.',
    processBasis: rows.map((row) => ({
      key: row.key,
      process: row.label,
      leadTimeDays: row.dateField ? null : row.duration,
      slackBeforeDays: row.slackBefore,
      basis: row.basis,
    })),
  };
  return result;
}

/**
 * Gap 1 & Gap 2: Computes Plan vs Actual variance, Failed/Delayed activities,
 * Critical Path (0-slack or negative-slack activities), Projected Shipment Date, and Shipment Risk Level.
 */
export function computeCriticalPathAndRisk(style: any, referenceToday = new Date()) {
  const sm = (style?.sourceMetadata || {}) as any;
  const p = sm.planning || {};
  const actualDates: Record<string, string> = p.actualDates || {};
  const activityTracking: Record<string, TaActivityTrack> = p.activityTracking || {};
  const { rows } = buildTaRows(style);
  const todayStr = dateOnly(referenceToday) || new Date().toISOString().slice(0, 10);

  let maxDelayDays = 0;
  const activities = rows.map((row) => {
    const endField = (row.dateField || row.endField) as string;
    const startField = (row.startField || row.dateField) as string;
    const plannedStart = dateOnly(p[startField]);
    const plannedEnd = dateOnly(p[endField]);
    const track = activityTracking[row.key] || {};
    const actualEnd = dateOnly(track.actualFinish || actualDates[endField]);
    const actualStart = dateOnly(track.actualStart || (startField ? actualDates[startField] : undefined));
    const varianceDays = plannedEnd && actualEnd
      ? diffDays(plannedEnd, actualEnd)
      : plannedEnd && !actualEnd && plannedEnd < todayStr
        ? diffDays(plannedEnd, todayStr)
        : 0;

    let status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'DELAYED' | 'FAILED' = track.status || 'PENDING';
    if (actualEnd) {
      status = (varianceDays ?? 0) > 0 ? 'DELAYED' : 'DONE';
    } else if (plannedEnd && plannedEnd < todayStr && status !== 'DONE') {
      status = (varianceDays ?? 0) >= 3 ? 'FAILED' : 'DELAYED';
    } else if (actualStart && !actualEnd && status === 'PENDING') {
      status = 'IN_PROGRESS';
    }

    const isCritical = row.slackBefore <= 0 || row.compressionPriority <= 2 || row.key === 'sewing' || row.key === 'cutting' || row.key === 'ccd';
    if ((varianceDays ?? 0) > maxDelayDays && status !== 'DONE') {
      maxDelayDays = varianceDays ?? 0;
    } else if ((varianceDays ?? 0) > maxDelayDays && isCritical) {
      maxDelayDays = varianceDays ?? 0;
    }

    return {
      key: row.key,
      label: row.label,
      plannedStart,
      plannedEnd,
      actualStart,
      actualEnd,
      varianceDays: varianceDays ?? 0,
      slackBefore: row.slackBefore,
      isCritical,
      status,
      delayReason: track.delayReason || '',
    };
  });

  const criticalPath = activities.filter((a) => a.isCritical);
  const delayedActivities = activities.filter((a) => a.status === 'DELAYED' || a.status === 'FAILED' || a.varianceDays > 0);
  const failedActivities = activities.filter((a) => a.status === 'FAILED');

  const ccdDate = firstCcd(style) || (p.cargoClosingDate ? new Date(p.cargoClosingDate) : null);
  const exFactoryBase = p.exFactoryDate ? new Date(p.exFactoryDate) : ccdDate ? addDays(ccdDate, -1) : null;
  const projectedExFactoryDate = exFactoryBase ? dateOnly(addDays(exFactoryBase, Math.max(0, maxDelayDays))) : null;
  const projectedShipmentDate = ccdDate ? dateOnly(addDays(ccdDate, Math.max(0, maxDelayDays))) : null;
  const ccdSlipDays = ccdDate && projectedShipmentDate ? Math.max(0, diffDays(dateOnly(ccdDate), projectedShipmentDate) || 0) : maxDelayDays;

  const riskLevel: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL' =
    ccdSlipDays > 2 || failedActivities.length > 0
      ? 'CRITICAL'
      : ccdSlipDays > 0 || delayedActivities.length > 0
        ? 'AT_RISK'
        : 'ON_TRACK';

  return {
    activities,
    criticalPath,
    delayedActivities,
    failedActivities,
    maxDelayDays,
    ccdDate: dateOnly(ccdDate),
    projectedExFactoryDate,
    projectedShipmentDate,
    ccdSlipDays,
    riskLevel,
  };
}

/**
 * Gap 10: Builds downstream section tasks to create automatically when a T&A is approved.
 */
export function buildSectionTasksForApprovedTa(order: { id: string; jobNo: string }, style: { id: string; styleNo: string }, plan: Record<string, any>) {
  const jobLabel = `${order.jobNo} (${style.styleNo})`;
  const candidates: Array<{ module: string; role: string; title: string; dateField: string }> = [
    { module: 'KNITTING', role: 'KNITTING', title: `Complete Knitting for ${jobLabel}`, dateField: 'knittingEnd' },
    { module: 'DYEING', role: 'DYEING', title: `Complete Dyeing & Finishing for ${jobLabel}`, dateField: 'dyeingFinishingEnd' },
    { module: 'STORE', role: 'STORE', title: `Ensure Trims In-house for ${jobLabel}`, dateField: 'trimsInhouseDate' },
    { module: 'MERCHANDISING', role: 'MERCHANDISER', title: `Complete File Handover & PP Readiness for ${jobLabel}`, dateField: 'fileHandoverDate' },
    { module: 'CUTTING', role: 'CUTTING', title: `Complete Test Cutting / Size Set for ${jobLabel}`, dateField: 'testCuttingDate' },
    { module: 'CUTTING', role: 'CUTTING', title: `Start & Complete Bulk Cutting for ${jobLabel}`, dateField: 'cuttingEnd' },
    { module: 'PRINTING', role: 'PRINTING', title: `Complete Printing for ${jobLabel}`, dateField: 'printingEnd' },
    { module: 'EMBROIDERY', role: 'EMBROIDERY', title: `Complete Embroidery for ${jobLabel}`, dateField: 'embroideryEnd' },
    { module: 'SEWING', role: 'SEWING', title: `Start Sewing Line Loading for ${jobLabel}`, dateField: 'sewingStartDate' },
    { module: 'FINISHING', role: 'FINISHING', title: `Complete Packing & Final Inspection for ${jobLabel}`, dateField: 'finalInspection' },
  ];

  const tasks: Array<{
    title: string;
    module: string;
    ownerRoleCode: string;
    orderId: string;
    entityType: string;
    entityId: string;
    dueDate: Date;
    priority: 'HIGH' | 'NORMAL';
  }> = [];

  for (const item of candidates) {
    const rawDate = plan[item.dateField];
    if (!rawDate) continue;
    const due = new Date(rawDate);
    if (Number.isNaN(due.getTime())) continue;
    tasks.push({
      title: item.title,
      module: item.module,
      ownerRoleCode: item.role,
      orderId: order.id,
      entityType: 'STYLE',
      entityId: style.id,
      dueDate: due,
      priority: ['sewingStartDate', 'testCuttingDate', 'trimsInhouseDate', 'fileHandoverDate'].includes(item.dateField) ? 'HIGH' : 'NORMAL',
    });
  }
  return tasks;
}

/**
 * Bug Fix 3: Validates Gantt floor capacity and flags unconfigured floors (capacity === 0)
 * or missing machine counts (machineQty === 0) instead of silently skipping them.
 */
export function validateGanttFloorCapacity(
  allStyles: Array<{ id: string; styleNo?: string; sourceMetadata?: any }>,
  targetIds: Set<string>,
  floorCapacity: Map<string, number>,
) {
  const loads = new Map<string, { used: number; jobs: string[] }>();
  const unconfiguredIssues: string[] = [];
  const overloads: string[] = [];

  for (const row of allStyles) {
    const sm = (row.sourceMetadata || {}) as any;
    const g = sm.ganttPlan;
    if (!g?.startDate || !g?.finishDate || !g?.floorCode) continue;
    const include = g.status === 'APPROVED' || targetIds.has(row.id);
    if (!include) continue;

    const factoryCode = g.factoryCode || 'NFL';
    const floorKey = `${factoryCode}|${g.floorCode}`;
    const cap = floorCapacity.get(floorKey) || 0;
    const machineQty = Math.max(0, Number(sm.ieBulletin?.machineQty || g.machineQty || 0));
    const label = row.styleNo || row.id;

    if (cap <= 0) {
      unconfiguredIssues.push(`Floor ${floorKey} (Style ${label}) has 0 configured active machines in Line Master`);
      continue;
    }
    if (machineQty <= 0) {
      unconfiguredIssues.push(`Style ${label} on ${floorKey} (${g.lineCode || 'Line'}) has 0 machine count`);
      continue;
    }

    const start = new Date(g.startDate);
    const finish = new Date(g.finishDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(finish.getTime())) continue;
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const end = new Date(Date.UTC(finish.getUTCFullYear(), finish.getUTCMonth(), finish.getUTCDate()));
    while (cursor <= end) {
      const day = cursor.toISOString().slice(0, 10);
      const key = `${floorKey}|${day}`;
      const current = loads.get(key) || { used: 0, jobs: [] };
      current.used += machineQty;
      current.jobs.push(row.id);
      loads.set(key, current);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  for (const [key, load] of loads.entries()) {
    const [factoryCode, floorCode, day] = key.split('|');
    const floorKey = `${factoryCode}|${floorCode}`;
    const cap = floorCapacity.get(floorKey) || 0;
    if (cap > 0 && load.used > cap) {
      overloads.push(`${floorKey} machine capacity exceeded on ${day}: ${load.used} planned / ${cap} max`);
    }
  }

  return {
    ok: unconfiguredIssues.length === 0 && overloads.length === 0,
    unconfiguredIssues,
    overloads,
    loads,
  };
}
