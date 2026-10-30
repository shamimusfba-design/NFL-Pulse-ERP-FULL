/**
 * Planning & Control rules: TNA plan vs actual, failed activities and the critical-path impact on shipment.
 * Planned dates are read from the existing T&A plan (style.sourceMetadata.planning) and are never changed here.
 * Actuals live beside them in planning.actuals[rowKey] = { date, reasonCode, remark, by, at }.
 */
export type Row = { key: string; label: string; dept: string; start?: string; end?: string; date?: string; core?: boolean; extra?: boolean };

/** Same order and fields as the T&A page; Test Cutting and Size Set are follow-up milestones added by Planning & Control. */
export const TA_ROWS: Row[] = [
  { key: 'yarnDyeing', label: 'Yarn Dyeing', dept: 'Yarn', start: 'yarnDyeingStart', end: 'yarnDyeingEnd' },
  { key: 'knitting', label: 'Knitting', dept: 'Knitting', start: 'knittingStart', end: 'knittingEnd', core: true },
  { key: 'dyeing', label: 'Dyeing / Fabric Finishing', dept: 'Dyeing', start: 'dyeingFinishingStart', end: 'dyeingFinishingEnd', core: true },
  { key: 'aop', label: 'AOP / Brush / Peach', dept: 'Fabric Finishing', start: 'aopStart', end: 'aopEnd' },
  { key: 'trims', label: 'Trims In-house', dept: 'Store', date: 'trimsInhouseDate', core: true },
  { key: 'file', label: 'File Handover', dept: 'Merchandising', date: 'fileHandoverDate', core: true },
  { key: 'pp', label: 'PP Meeting', dept: 'Planning', date: 'ppMeetingDate', core: true },
  { key: 'testCutting', label: 'Test Cutting', dept: 'Cutting', date: 'testCuttingDate', extra: true },
  { key: 'sizeSet', label: 'Size Set', dept: 'Sample / Cutting', date: 'sizeSetDate', extra: true },
  { key: 'cutting', label: 'Cutting', dept: 'Cutting', start: 'cuttingStart', end: 'cuttingEnd', core: true },
  { key: 'printing', label: 'Printing', dept: 'Printing', start: 'printingStart', end: 'printingEnd' },
  { key: 'embroidery', label: 'Embroidery', dept: 'Embroidery', start: 'embroideryStart', end: 'embroideryEnd' },
  { key: 'sewing', label: 'Sewing', dept: 'Sewing', start: 'sewingStartDate', end: 'sewingEnd', core: true },
  { key: 'garmentWash', label: 'Garment Wash / Dye', dept: 'Wash', start: 'garmentWashStart', end: 'garmentWashEnd' },
  { key: 'finishing', label: 'Finishing / Packing', dept: 'Finishing', start: 'finishingStart', end: 'finishingEnd', core: true },
  { key: 'preFinal', label: 'Pre-Final Inspection', dept: 'QA', date: 'preFinalInspection', core: true },
  { key: 'final', label: 'Final Inspection', dept: 'QA', date: 'finalInspection', core: true },
  { key: 'exFactory', label: 'Ex-Factory', dept: 'Shipping', date: 'exFactoryDate', core: true },
];
export const ROW_KEYS = TA_ROWS.map((r) => r.key);
export const EXTRA_PLAN_FIELDS = TA_ROWS.filter((r) => r.extra).map((r) => r.date!) as string[];

export const DELAY_REASONS: Record<string, string> = {
  FABRIC_LATE: 'Fabric late', YARN_LATE: 'Yarn late', TRIMS_LATE: 'Trims / accessories late', PRINT_EMB_LATE: 'Print / emb late (in-house or sub-contract)',
  SAMPLE_APPROVAL: 'Sample / size set approval pending', BUYER_CHANGE: 'Buyer change / amendment', FILE_LATE: 'File handover late',
  CAPACITY: 'Capacity / line not free', MACHINE: 'Machine breakdown', QUALITY: 'Quality issue / rework', MANPOWER: 'Manpower shortage', OTHER: 'Other',
};

export type Status = 'DONE' | 'DONE_LATE' | 'OVERDUE' | 'DUE_SOON' | 'OPEN' | 'NOT_PLANNED';
export type EvalRow = Row & { plannedStart: string | null; plannedEnd: string | null; actual: string | null; reasonCode: string | null; remark: string | null;
  status: Status; delayDays: number; failed: boolean; bufferAfter: number; impactDays: number; critical: boolean };

const d10 = (v: unknown) => (v ? String(v).slice(0, 10) : null);
const t = (s: string) => Date.parse(`${s}T00:00:00Z`);
export const diff = (a: string, b: string) => Math.round((t(b) - t(a)) / 86400000); // b - a in days
export const addDays = (s: string, n: number) => new Date(t(s) + n * 86400000).toISOString().slice(0, 10);

/**
 * Evaluate one style. A row fails when it is done later than plan + tolerance, or it is past plan with no actual.
 * Critical path: the T&A is a backward chain from CCD, so a failed row only pushes ex-factory by the part of its delay
 * that the planned gaps (slack) after it cannot absorb. impactDays > 0 means the row is on the critical path.
 */
export function evaluate(planning: any, today: string, tolerance = 1, dueSoonDays = 3) {
  const p = planning || {}; const actuals = p.actuals || {};
  const rows: EvalRow[] = TA_ROWS.map((r) => {
    const plannedStart = d10(r.date ? p[r.date] : p[r.start!]);
    const plannedEnd = d10(r.date ? p[r.date] : p[r.end!]);
    const a = actuals[r.key] || {}; const actual = d10(a.date);
    let status: Status = 'OPEN'; let delayDays = 0;
    if (!plannedEnd) status = actual ? 'DONE' : 'NOT_PLANNED';
    else if (actual) { delayDays = Math.max(0, diff(plannedEnd, actual)); status = delayDays > tolerance ? 'DONE_LATE' : 'DONE'; }
    else if (diff(plannedEnd, today) > 0) { delayDays = diff(plannedEnd, today); status = delayDays > tolerance ? 'OVERDUE' : 'DUE_SOON'; }
    else if (diff(today, plannedEnd) <= dueSoonDays) status = 'DUE_SOON';
    return { ...r, plannedStart, plannedEnd, actual, reasonCode: a.reasonCode || null, remark: a.remark || null, status, delayDays,
      failed: status === 'DONE_LATE' || status === 'OVERDUE', bufferAfter: 0, impactDays: 0, critical: false };
  });
  const planned = rows.filter((r) => r.plannedEnd);
  // slack between consecutive planned rows (gap between this end and the next start, never negative)
  const gaps = planned.map((r, i) => (i + 1 < planned.length ? Math.max(0, diff(r.plannedEnd!, planned[i + 1].plannedStart || planned[i + 1].plannedEnd!) - 1) : 0));
  const exIdx = planned.findIndex((r) => r.key === 'exFactory');
  const lastIdx = exIdx >= 0 ? exIdx : planned.length - 1;
  planned.forEach((r, i) => {
    if (i > lastIdx) return;
    r.bufferAfter = gaps.slice(i, lastIdx).reduce((s, g) => s + g, 0);
    // a finished-late row no longer pushes anything if the next rows already started on time
    if (r.failed) { r.impactDays = Math.max(0, r.delayDays - r.bufferAfter); r.critical = r.impactDays > 0; }
  });
  const slipDays = Math.max(0, ...planned.map((r) => r.impactDays));
  const ccd = d10(p.cargoClosingDate) || d10(p.taGeneration?.fixedCcd);
  const plannedExFactory = d10(p.exFactoryDate);
  const projectedExFactory = plannedExFactory ? addDays(plannedExFactory, slipDays) : null;
  const ccdMissDays = projectedExFactory && ccd ? Math.max(0, diff(ccd, projectedExFactory)) : 0;
  const failed = rows.filter((r) => r.failed);
  const shipped = !!rows.find((r) => r.key === 'exFactory')?.actual;
  const risk = shipped ? 'SHIPPED' : ccdMissDays > 0 ? 'CCD_MISS' : slipDays > 0 ? 'AT_RISK' : failed.length ? 'WATCH' : 'ON_TRACK';
  const next = rows.find((r) => r.plannedEnd && !r.actual) || null;
  return { rows, failedCount: failed.length, criticalRows: rows.filter((r) => r.critical).map((r) => r.label), slipDays, ccd, plannedExFactory, projectedExFactory, ccdMissDays, risk,
    nextActivity: next ? { key: next.key, label: next.label, dept: next.dept, due: next.plannedEnd } : null };
}

export const RISK_ORDER: Record<string, number> = { CCD_MISS: 0, AT_RISK: 1, WATCH: 2, ON_TRACK: 3, SHIPPED: 4 };

/** Actual entry check: a late actual (beyond tolerance) needs a delay reason. */
export function checkActual(plannedEnd: string | null, actual: string | null, reasonCode: string | undefined, today: string, tolerance = 1): string | null {
  if (!actual) return null;
  if (actual > today) return 'Actual date cannot be in the future';
  if (plannedEnd && diff(plannedEnd, actual) > tolerance && !(reasonCode && DELAY_REASONS[reasonCode])) return 'Late activity: choose a delay reason';
  return null;
}
