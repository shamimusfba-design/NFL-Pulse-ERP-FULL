/**
 * Merchandising business rules (pure functions, no database).
 * Used by the bulk and sample merchandising controllers. Covered by merch.rules.spec.ts.
 */

// ---------- bulk workflow ----------
export const STEPS = ['ORDER', 'CAD', 'IE', 'THREAD', 'FABRIC_SHEET', 'TNA', 'FILE_HANDOVER', 'PRE_PRODUCTION', 'SIZE_SET', 'PP_MEETING'] as const;
export type Step = (typeof STEPS)[number];
export type StepStatus = 'WAIT' | 'READY' | 'SENT' | 'DONE' | 'REVIEW';
export type StepMap = Record<Step, StepStatus>;

/** Roles allowed to act on each step (ADMIN can always act). */
export const STEP_ROLES: Record<Step, string[]> = {
  ORDER: ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'],
  CAD: ['CAD'],
  IE: ['IE'],
  THREAD: ['IE'],
  FABRIC_SHEET: ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'], // approval: PLANNING
  TNA: ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'], // generate/approve: PLANNING
  FILE_HANDOVER: ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'],
  PRE_PRODUCTION: ['PLANNING'],
  SIZE_SET: ['SAMPLE'], // ASSUMPTION: technical / size-set team uses the SAMPLE role until a TECHNICAL role exists
  PP_MEETING: ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'],
};
export const PLANNING_ROLES = ['PLANNING'];
export const MERCH_ROLES = ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'];
export const MERCH_EDIT_ROLES = ['MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'];

/** Task owner role created when a step becomes READY (or SENT for the planning side). */
export const STEP_TASK_ROLE: Partial<Record<Step, string>> = {
  CAD: 'CAD', IE: 'IE', THREAD: 'IE', FABRIC_SHEET: 'MERCH_BULK', TNA: 'MERCH_BULK', FILE_HANDOVER: 'MERCH_BULK',
  PRE_PRODUCTION: 'PLANNING', SIZE_SET: 'SAMPLE', PP_MEETING: 'MERCH_BULK',
};
export const STEP_TASK_TITLE: Partial<Record<Step, string>> = {
  CAD: 'Fabric consumption', IE: 'IE bulletin', THREAD: 'Thread consumption', FABRIC_SHEET: 'Fabric order sheet',
  TNA: 'TNA sheet', FILE_HANDOVER: 'Production file handover', PRE_PRODUCTION: 'Pre-production work', SIZE_SET: 'Size set', PP_MEETING: 'Call PP meeting',
};

export function defaultSteps(): StepMap {
  return { ORDER: 'DONE', CAD: 'READY', IE: 'READY', THREAD: 'WAIT', FABRIC_SHEET: 'WAIT', TNA: 'WAIT', FILE_HANDOVER: 'WAIT', PRE_PRODUCTION: 'WAIT', SIZE_SET: 'WAIT', PP_MEETING: 'WAIT' };
}

/** Opens the next steps after a change. Returns the steps that changed from WAIT to READY. */
export function recompute(w: StepMap): Step[] {
  const opened: Step[] = [];
  const open = (s: Step) => { if (w[s] === 'WAIT') { w[s] = 'READY'; opened.push(s); } };
  if (w.ORDER === 'DONE') { open('CAD'); open('IE'); }
  if (w.IE === 'DONE') open('THREAD');
  if (w.CAD === 'DONE' && w.IE === 'DONE' && w.THREAD === 'DONE') { open('FABRIC_SHEET'); open('TNA'); }
  if (w.FABRIC_SHEET === 'DONE' && w.TNA === 'DONE') open('FILE_HANDOVER');
  if (w.FILE_HANDOVER === 'DONE') open('PRE_PRODUCTION');
  if (w.PRE_PRODUCTION === 'DONE') open('SIZE_SET');
  if (w.SIZE_SET === 'DONE') open('PP_MEETING');
  return opened;
}

export function stage(w: StepMap): string {
  if (w.ORDER !== 'DONE') return 'Order review';
  if (w.CAD !== 'DONE' || w.IE !== 'DONE') return 'CAD / IE work';
  if (w.THREAD !== 'DONE') return 'Thread consumption';
  if (w.FABRIC_SHEET !== 'DONE' || w.TNA !== 'DONE') return (w.FABRIC_SHEET === 'SENT' || w.TNA === 'SENT') ? 'With Planning' : 'Fabric sheet + TNA';
  if (w.FILE_HANDOVER !== 'DONE') return w.FILE_HANDOVER === 'READY' ? 'File handover due' : 'Awaiting file date';
  if (w.PRE_PRODUCTION !== 'DONE') return 'Pre-production';
  if (w.SIZE_SET !== 'DONE') return 'Size set';
  if (w.PP_MEETING !== 'DONE') return 'PP meeting';
  return 'In production';
}

export function canAct(roles: string[], allowed: string[]) {
  return roles.includes('ADMIN') || roles.some((r) => allowed.includes(r));
}

// ---------- fabric ----------
export type FabricPart = { part: string; fabric?: string; gsm?: number | string; comp?: string; consKgDz?: number | string };
const n = (v: unknown) => { const x = parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };
export const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** Finish fabric kg for an order qty: sum of consumption (kg/dozen) × qty / 12. */
export function finishFabricKg(parts: FabricPart[], qty: number) { return round(parts.reduce((a, p) => a + n(p.consKgDz), 0) * qty / 12, 1); }
/** Grey (knitting) fabric kg from finish fabric and process-loss %. */
export function greyFabricKg(finishKg: number, lossPct: number) {
  if (lossPct < 0 || lossPct >= 100) throw new Error('Process loss % must be between 0 and 99.9');
  return round(finishKg / (1 - lossPct / 100), 1);
}

// ---------- TNA by company standard (planning.ts bands) ----------
export type TnaRow = { s: string; e: string; d: number };
export const TNA_ACTIVITIES: Array<[string, string]> = [
  ['yd', 'Yarn Dyeing (Y/D)'], ['knit', 'Knitting'], ['dye', 'Dyeing – Finishing'], ['aop', 'All Over Print (AOP)'], ['slack', 'Slack Time'], ['trims', 'Trims & Accessories'],
  ['file', 'Production & Other File Handover'], ['pp', 'PP Meeting'], ['cut', 'Cutting'], ['print', 'Printing'], ['emb', 'Stone Attach / Embroidery / Sequence'],
  ['sew', 'Sewing, Ironing, Folding, Packing & Finishing'], ['wash', 'Garment Washing / Dyeing'], ['carton', 'Cartoning'], ['prefinal', 'Pre-final Inspection'], ['final', 'Final Inspection'], ['exf', 'Ex-Factory Date'],
];
const fabricBand = (kg: number) => kg <= 1000 ? { knit: 4, dye: 10, kS: 2, dS: 1 } : kg <= 5000 ? { knit: 7, dye: 15, kS: 3, dS: 2 } : { knit: 13, dye: 23, kS: 4, dS: 3 };
const garmentBand = (q: number) => q <= 5000 ? { cut: 2, print: 3, emb: 3, sew: 3, fin: 2 } : q <= 15000 ? { cut: 3, print: 4, emb: 4, sew: 6, fin: 3 } : q <= 30000 ? { cut: 4, print: 5, emb: 6, sew: 8, fin: 4 } : { cut: 5, print: 7, emb: 8, sew: 13, fin: 5 };
export function addDays(iso: string, k: number) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); }
export function daysBetween(a: string, b: string) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }

export function generateTna(input: { poReceived: string; finishKg: number; qty: number; printEmb?: string }): Record<string, TnaRow> & { total: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.poReceived)) throw new Error('PO received date is required (YYYY-MM-DD)');
  const kg = input.finishKg > 0 ? input.finishKg : input.qty * 0.35;
  const fb = fabricBand(kg), gb = garmentBand(input.qty);
  const pe = String(input.printEmb || '').toLowerCase();
  const R: Record<string, TnaRow> = {};
  let cur = input.poReceived;
  const dur = (k: string, d: number, slack = 0) => { const s = addDays(cur, slack), e = addDays(s, Math.max(0, d - 1)); R[k] = { s, e, d }; cur = addDays(e, 1); return e; };
  dur('knit', fb.knit, 0);
  const dyeEnd = dur('dye', fb.dye, fb.kS);
  const trims = addDays(dyeEnd, fb.dS);
  R.slack = { s: addDays(dyeEnd, 1), e: trims, d: fb.dS };
  R.trims = { s: addDays(input.poReceived, 1), e: trims, d: daysBetween(addDays(input.poReceived, 1), trims) + 1 };
  R.file = { s: trims, e: trims, d: 1 };
  R.pp = { s: addDays(trims, 1), e: addDays(trims, 1), d: 1 };
  cur = addDays(trims, 2);
  dur('cut', gb.cut, 1);
  if (/print/.test(pe)) dur('print', gb.print, 1);
  if (/emb/.test(pe)) dur('emb', gb.emb, /print/.test(pe) ? 0 : 1);
  dur('sew', gb.sew + gb.fin, 1);
  dur('carton', 1, 0);
  dur('prefinal', 1, 1);
  dur('final', 1, 1);
  const exf = addDays(cur, 1);
  R.exf = { s: exf, e: exf, d: 1 };
  return Object.assign(R, { total: daysBetween(input.poReceived, exf) + 1 });
}

// ---------- trims & accessories checklist ----------
export function checklistRequiredQty(orderQty: number, perPc: number, wastePct: number, unit = 'pcs') {
  if (orderQty < 0 || perPc < 0 || wastePct < 0) throw new Error('Quantities cannot be negative');
  const raw = orderQty * perPc * (1 + wastePct / 100);
  return unit === 'pcs' ? Math.ceil(raw) : round(raw, 2);
}
export function checklistInHouse(lines: Array<{ orderStatus: string; requiredQty: number; receivedQty: number }>) {
  const ordered = lines.filter((l) => l.orderStatus === 'ORDERED');
  const need = ordered.reduce((a, l) => a + l.requiredQty, 0), rec = ordered.reduce((a, l) => a + Math.min(l.receivedQty, l.requiredQty), 0);
  const orderedState = ordered.length === 0 ? 'NOT_STARTED' : ordered.length === lines.length ? 'ORDERED' : 'ORDERING';
  const inHouse = need === 0 ? 'NOT_RECEIVED' : rec >= need && ordered.length === lines.length ? 'ALL_RECEIVED' : rec > 0 ? 'PARTLY_RECEIVED' : 'NOT_RECEIVED';
  return { ordered: orderedState, inHouse, orderedLines: ordered.length, lines: lines.length };
}

// ---------- lab dip ----------
export const LAB_DIP_STATUS = ['NOT_STARTED', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
export function labDipSummary(rows: Array<{ status: string }>) {
  if (!rows.length) return 'NOT_STARTED';
  if (rows.some((r) => r.status === 'REJECTED')) return 'REJECTED';
  if (rows.every((r) => r.status === 'APPROVED')) return 'ALL_APPROVED';
  if (rows.every((r) => r.status === 'NOT_STARTED')) return 'NOT_STARTED';
  return `${rows.filter((r) => r.status === 'APPROVED').length}/${rows.length}_APPROVED`;
}

// ---------- cost sheet (company format "Cost Sheet – Pre order") ----------
export const ACCESSORY_KEYS = ['ml', 'cl', 'ht', 'pt', 'bp', 'st', 'ct', 'el', 'ds', 'bl'] as const;
export type CostFabric = { d?: string; cons?: number | string; cw?: number | string; yarns?: Array<{ c?: string; p?: number | string; pc?: number | string }>; knit?: number | string; yd?: number | string; dye?: number | string; aop?: number | string; brush?: number | string; wp?: number | string };
export type CostInput = { rate?: number | string; fabs?: CostFabric[]; collar?: number | string; cm?: number | string; sp?: number | string; pearl?: number | string; emb?: number | string; wash?: number | string; sms?: number | string; ex?: number | string; com?: number | string; profit?: number | string; buy?: number | string; chem?: number | string } & Partial<Record<(typeof ACCESSORY_KEYS)[number], number | string>>;

/** Same formula as the company cost sheet (verified on 13251813 NMFLANA LS DRESS: FOB 3.43). */
export function calcCost(v: CostInput) {
  const rate = n(v.rate) || 115;
  const fabs = (v.fabs || []).map((f) => {
    const yarn = (f.yarns || []).reduce((a, y) => a + n(y.p) * n(y.pc) / 100, 0);
    const knit = n(f.knit) / rate, yd = n(f.yd) / rate, dye = n(f.dye) / rate, aop = n(f.aop);
    const base = yarn + knit + aop + yd + dye, waste = base * n(f.wp) / 100, perKg = base + waste + n(f.brush);
    const cons = n(f.cons) * (1 + n(f.cw) / 100);
    return { perKg, cons, perDz: perKg * cons, waste };
  });
  const fabTotal = fabs.reduce((a, f) => a + f.perDz, 0) + n(v.collar);
  const acc0 = ACCESSORY_KEYS.reduce((a, k) => a + n(v[k]), 0), accExcess = acc0 * n(v.ex) / 100, acc = acc0 + accExcess;
  const dozen = fabTotal + n(v.cm) + n(v.sp) + n(v.pearl) + n(v.emb) + n(v.wash) + acc + n(v.sms);
  const pc = dozen / 12, com = pc * n(v.com) / 100, prod = pc + com, profit = prod * n(v.profit) / 100, buy = prod * n(v.buy) / 100;
  return { fabs, fabTotal, acc, accExcess, dozen, pc, com, prod, profit, buy, fob: prod + profit + buy + n(v.chem) };
}

// ---------- job numbers ----------
export function ordinal(k: number) { const v = k % 100; return k + (v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[k % 10] || 'th'); }
export function nextLotNo(existingJobNos: string[], base: string) {
  let max = 1;
  for (const j of existingJobNos) { if (!j.includes(base)) continue; const m = j.match(/\b(\d+)(st|nd|rd|th)\b/i); if (m) max = Math.max(max, +m[1]); }
  return ordinal(max + 1);
}

// ---------- sample quota ----------
export function quotaCheck(used: number, quota: number, adding: number) {
  const after = used + adding;
  return { used, quota, after, over: quota > 0 && after > quota, full: quota > 0 && used >= quota };
}
export function sampleSheetNo(seq: number, date = new Date()) {
  const yymm = date.toISOString().slice(2, 7).replace('-', '');
  return `SMP-${yymm}-${String(seq).padStart(4, '0')}`;
}
