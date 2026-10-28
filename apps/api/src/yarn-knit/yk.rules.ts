/**
 * Yarn store, knitting and knitting quality business rules (pure functions, no database).
 * Covered by yk.rules.spec.ts.
 */
export const DAY = 864e5;
export const r2 = (x: number) => Math.round(x * 100) / 100;
export const n = (v: unknown) => { const x = parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };
export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, k: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + k); return ymd(d); };
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

// ---------- roles ----------
export const R = {
  REQ: ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD', 'YARN_STORE', 'YARN_MANAGEMENT'],
  MERCH: ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'],
  STORE: ['YARN_STORE'],
  PURCHASE: ['PROCUREMENT'],
  CENTRAL: ['PLANNING'],
  PLANNER: ['KNIT_PLANNER'],
  REPORTER: ['KNIT_REPORTER', 'KNITTING'],
  INCHARGE: ['KNIT_INCHARGE'],
  QUALITY: ['KNIT_QUALITY', 'QUALITY'],
};

// ---------- buyer / job / yarn codes ----------
export function buyerCode(b: string) {
  const t = String(b || '').toUpperCase().replace(/[\s-]+/g, '');
  if (/^BSNMT|NAMEIT/.test(t)) return 'BS-NMT'; if (/^BSONS|SONS/.test(t)) return 'BS-ONS'; if (/^BSONL|ONLY/.test(t)) return 'BS-ONL';
  if (/OVS/.test(t)) return 'OVS'; if (/^UTG|^UT$/.test(t)) return 'UT'; if (/GBX/.test(t)) return 'GBX'; if (/LEWIN/.test(t)) return 'TML'; if (/NEWLOOK/.test(t)) return 'NL';
  return t.slice(0, 6) || 'JOB';
}
export const jobCode = (buyer: string, job: string) => (/^[A-Z]/.test(String(job || '')) ? String(job).trim() : `${buyerCode(buyer)} ${String(job).trim()}`);
export function parseCount(code: string) {
  const t = String(code || '').toUpperCase().trim();
  const cnt = (t.match(/^(\d+D|\d+\/\d+|\d+S)/) || [''])[0];
  const shade = /\bC$/.test(t) ? 'Colour' : /\bW$/.test(t) ? 'White' : '';
  const composition = /^\d+D/.test(t) ? 'Spandex' : /BCI/.test(t) ? 'BCI cotton' : /ORG/.test(t) ? 'Organic cotton' : /CVC/.test(t) ? 'CVC' : /\bPC\b/.test(t) ? 'PC' : /GM/.test(t) ? 'Grey melange' : /VIS/.test(t) ? 'Viscose' : /SLUB/.test(t) ? 'Slub cotton' : 'Cotton';
  return { cnt, composition, shade };
}

// ---------- stock status ----------
export type CountState = { phys: number; moq: number; pipe: number; overduePipe: number; need: number };
/** below = stock under MOQ; pipelineLow = stock + pipeline under MOQ; urgent = open knitting need + MOQ − (stock + on-time pipeline). */
export function countStatus(c: CountState) {
  const below = c.moq > 0 && c.phys < c.moq;
  const pipelineLow = c.moq > 0 && c.phys + c.pipe < c.moq;
  const urgent = r2(Math.max(0, c.need + c.moq - c.phys - (c.pipe - c.overduePipe)));
  const status = !c.moq ? 'NO_MOQ' : pipelineLow ? 'PIPELINE_LOW' : below ? 'BELOW_MOQ_COVERED' : 'OK';
  return { below, pipelineLow, urgent, status, gap: r2(c.phys - c.moq) };
}
export function idleClass(idleDays: number | null, slow = 90, dead = 180) {
  if (idleDays == null) return 'NO_DATE';
  return idleDays > dead ? 'DEAD' : idleDays > slow ? 'SLOW' : 'ACTIVE';
}

// ---------- requisition / purchase ----------
export function requisitionState(status: string, lines: Array<{ orderedKg: number; receivedKg: number; status?: string }>) {
  if (['PENDING_STORE', 'RETURNED', 'CANCELLED'].includes(status)) return status;
  const L = lines.filter((l) => l.status !== 'CANCELLED');
  if (!L.length) return 'WITH_PURCHASE';
  const k = L.reduce((a, l) => a + l.orderedKg, 0), rc = L.reduce((a, l) => a + Math.min(l.receivedKg, l.orderedKg), 0);
  return rc >= k - 0.01 ? 'RECEIVED' : rc > 0 ? 'PARTLY_RECEIVED' : 'ORDERED';
}
/** A receipt may be up to 5% over the open balance of the purchase line. */
export function receiveCheck(orderedKg: number, receivedKg: number, kg: number) {
  if (!(kg > 0)) return 'Received kg must be above 0';
  const bal = orderedKg - receivedKg;
  if (bal <= 0) return 'This purchase line is already fully received';
  if (kg > bal * 1.05 + 0.5) return `More than 5% over the PO balance (${r2(bal)} kg)`;
  return null;
}
export function issueCheck(lotBalance: number, qcStatus: string, kg: number) {
  if (!(kg > 0)) return 'Kg must be above 0';
  if (qcStatus !== 'PASSED') return `This lot is on QC ${qcStatus}; it cannot be issued`;
  if (kg > lotBalance + 1e-9) return `Only ${r2(lotBalance)} kg left in this lot`;
  return null;
}

// ---------- knitting quantity ----------
export const suggestedKnitKg = (finishKg: number, lossPct: number) => {
  if (lossPct < 0 || lossPct >= 100) throw new Error('Loss % must be between 0 and 99.9');
  return Math.ceil(finishKg / (1 - lossPct / 100));
};
export function finalKgCheck(finalKg: number, finishKg: number) {
  if (!(finalKg > 0)) return 'Enter the final knitting kg';
  if (finalKg < finishKg) return 'Knitting kg cannot be less than finish fabric kg';
  if (finalKg > finishKg * 1.5) return 'More than 50% over finish fabric; check the quantity';
  return null;
}
export function productionCheck(orderKg: number, knittedSoFar: number, deliveredSoFar: number, knit: number, deliver: number) {
  if (knit < 0 || deliver < 0) return 'Kg cannot be negative';
  if (!(knit > 0 || deliver > 0)) return 'Enter knitted or delivered kg';
  const bal = Math.max(0, orderKg - knittedSoFar);
  if (knit > bal * 1.1 + 1) return `More than 10% over the balance (${r2(bal)} kg)`;
  if (deliver > knittedSoFar + knit - deliveredSoFar + 1e-9) return `Only ${r2(knittedSoFar + knit - deliveredSoFar)} kg is knitted and not yet delivered`;
  return null;
}

// ---------- machine queue schedule ----------
export type QItem = { id: string; balKg: number; notBefore?: string | null };
export type Slot = { machineId: string; s: number; e: number; start: string; finish: string; days: number; position: string; kg: number };
/** Jobs run one after another on each machine. s/e are day offsets from `today` (fractional). */
export function schedule(machines: Array<{ id: string; capKgDay: number }>, queues: Record<string, QItem[]>, today: string) {
  const out: Record<string, Slot> = {};
  for (const m of machines) {
    let t = 0;
    (queues[m.id] || []).forEach((q, i) => {
      const nb = q.notBefore ? Math.max(0, (Date.parse(q.notBefore) - Date.parse(today)) / DAY) : 0;
      const s = Math.max(t, nb), e = s + Math.max(0, q.balKg) / Math.max(1, m.capKgDay);
      out[q.id] = { machineId: m.id, s, e, start: addDays(today, Math.floor(s + 1e-9)), finish: addDays(today, Math.floor(Math.max(s, e - 1e-6) + 1e-9)), days: e - s, position: i === 0 ? 'RUN' : String(i + 1), kg: q.balKg };
      t = e;
    });
  }
  return out;
}
/** Moves a line to a machine. With a date it goes before the first job starting on/after that date (or at the end, waiting until the date). */
export function moveInQueue(queues: Record<string, QItem[]>, sched: Record<string, Slot>, id: string, toMachine: string, opt: { date?: string; position?: number; today: string }) {
  let item: QItem | undefined;
  const q: Record<string, QItem[]> = {};
  for (const [m, L] of Object.entries(queues)) q[m] = L.filter((x) => { if (x.id === id) { item = x; return false; } return true; });
  if (!item) throw new Error('Line is not on any machine');
  const it: QItem = { ...item };
  const target = (q[toMachine] = q[toMachine] || []);
  let idx = target.length;
  if (opt.position != null) idx = Math.max(0, Math.min(target.length, opt.position));
  else if (opt.date) {
    const d = (Date.parse(opt.date) - Date.parse(opt.today)) / DAY;
    const f = target.findIndex((x) => sched[x.id] && sched[x.id].s >= d - 1e-6);
    idx = f < 0 ? target.length : f;
    const endOfQueue = target.length ? Math.max(...target.map((x) => (sched[x.id] ? sched[x.id].e : 0))) : 0;
    it.notBefore = idx === target.length && d > endOfQueue ? opt.date : null;
  }
  target.splice(idx, 0, it);
  return q;
}
export function dayLoad(sched: Record<string, Slot>, caps: Record<string, number>, date: string, today: string) {
  const d = (Date.parse(date) - Date.parse(today)) / DAY;
  return Object.entries(sched).map(([id, s]) => ({ id, machineId: s.machineId, kg: r2(Math.max(0, Math.min(s.e, d + 1) - Math.max(s.s, d)) * (caps[s.machineId] || 0)) })).filter((x) => x.kg > 0);
}
export const sameDia = (a: string, b: string) => { const f = (d: string) => { const m = String(d || '').match(/(\d+)\D+(\d+)/); return m ? m[1] + '-' + m[2] : ''; }; return f(a) !== '' && f(a) === f(b); };

// ---------- quality ----------
export const DEFECTS = ['No defect', 'Hole', 'Needle line', 'Lycra out / drop', 'Oil spot', 'Thick & thin / slub', 'Barre / patta', 'Dia variation', 'GSM variation', 'Contamination / fly', 'Drop stitch', 'Yarn mixing'];
export function inspectionCheck(inspected: number, defectKg: number, rejected: number, defect: string, decision: string) {
  if (!(inspected > 0)) return 'Enter inspected kg';
  if (defectKg < 0 || rejected < 0) return 'Kg cannot be negative';
  if (defectKg > inspected || rejected > inspected) return 'Defect or rejected kg cannot be more than inspected kg';
  if (defect !== 'No defect' && !(defectKg > 0)) return 'Enter the defect kg';
  if (!['PASS', 'HOLD', 'REJECT'].includes(decision)) return 'Decision must be PASS, HOLD or REJECT';
  return null;
}
export function qualitySummary(rows: Array<{ inspectedKg: number; defectKg: number; rejectedKg: number; decision: string; defect: string }>) {
  const t = rows.reduce((a, r) => ({ i: a.i + r.inspectedKg, r: a.r + r.rejectedKg, h: a.h + (r.decision === 'HOLD' ? r.inspectedKg : 0), d: a.d + r.defectKg }), { i: 0, r: 0, h: 0, d: 0 });
  const byDefect: Record<string, number> = {};
  rows.filter((r) => r.defect !== 'No defect').forEach((r) => { byDefect[r.defect] = r2((byDefect[r.defect] || 0) + r.defectKg); });
  const top = Object.entries(byDefect).sort((a, b) => b[1] - a[1])[0] || null;
  return { inspectedKg: r2(t.i), rejectedKg: r2(t.r), holdKg: r2(t.h), defectKg: r2(t.d), passedPct: t.i ? r2(((t.i - t.r - t.h) / t.i) * 100) : 0, rejectionPct: t.i ? r2((t.r / t.i) * 100) : 0, inspections: rows.length, topDefect: top ? { defect: top[0], kg: top[1] } : null, byDefect };
}
