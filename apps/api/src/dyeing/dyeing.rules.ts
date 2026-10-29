import { canon } from '../stores/stores.rules';
/**
 * Dyeing & Finishing desk — pure rules (no database) so they can be unit-tested.
 *
 * The desk keeps its working records in slices (entries, work orders, lab dips, tests, machine board …).
 * The browser sends only the slices that changed; checkSlice() compares old and new data and refuses changes the
 * user's role may not make, deliveries that have not passed the quality gates, and batches that break the machine rules.
 *
 * Agreed process (owner, 28–29 Oct 2026):
 *  - Fabric order sheet approved → colour lines wait for a dyeing plan (in-house NFL or subcontract).
 *  - In-house lines go to machine loading. A batch may be loaded only when the colour's lab dip / shade is approved
 *    (approved at SMS stage in merchandising, or by the dyeing lab).
 *  - Delivery to the finished fabric store needs the testing lab pass AND the final inspection pass,
 *    or a conditional release written by the merchandiser / management.
 */

export const MACHINES: Array<{ id: string; cap: number; brand: string }> = [
  ['MC-01', 45, 'FONGS'], ['MC-02', 50, 'DILMENLER'], ['MC-03', 175, 'DILMENLER'], ['MC-04', 525, 'DILMENLER'], ['MC-05', 700, 'DILMENLER'],
  ['MC-06', 1050, 'DILMENLER'], ['MC-07', 1400, 'DILMENLER'], ['MC-08', 1200, 'DILMENLER'], ['MC-09', 75, 'THIES'], ['MC-10', 450, 'DILMENLER'],
  ['MC-11', 150, 'DILMENLER'], ['SM-01', 10, 'DILMENLER'], ['SM-02', 15, 'DILMENLER'], ['SM-03', 15, 'DILMENLER'], ['SM-04', 15, 'DILMENLER'],
  ['SM-05', 25, 'DILMENLER'], ['SM-06', 25, 'DILMENLER'], ['SM-07', 25, 'DILMENLER'], ['SM-08', 50, 'DILMENLER'], ['SM-09', 50, 'DILMENLER'],
].map(([id, cap, brand]) => ({ id: String(id), cap: Number(cap), brand: String(brand) })); // source: DYEING PROFILE.xlsx

/** Desk roles shown in the page ("Logged in as") and the ERP role codes that hold them. */
export const UI_ROLES: Record<string, string[]> = {
  'Dyeing Planner': ['DYEING_PLANNER'],
  'Greige Store': ['GREIGE_STORE'],
  'Dyeing Production': ['DYEING'],
  'Planning & Control': ['PLANNING'],
  'Dyeing Lab': ['DYEING_LAB'],
  'Testing Lab': ['LAB'],
  'Finishing QC': ['FABRIC_FINISHING'],
  Merchandiser: ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'],
  Management: ['MANAGEMENT'],
};
export function uiRolesOf(codes: string[]): string[] {
  if (codes.includes('ADMIN')) return Object.keys(UI_ROLES);
  return Object.entries(UI_ROLES).filter(([, c]) => c.some((x) => codes.includes(x))).map(([k]) => k);
}

export const SLICES = ['ent', 'hold', 'plan', 'edit', 'wos', 'woSeq', 'rowWo', 'labdip', 'tests', 'fqc', 'cond', 'rft', 'batches', 'bcSeq', 'shadeOv', 'set'] as const;
export type Slice = (typeof SLICES)[number];
export const EMPTY: Record<Slice, unknown> = { ent: {}, hold: {}, plan: {}, edit: {}, wos: [], woSeq: 0, rowWo: {}, labdip: {}, tests: {}, fqc: {}, cond: {}, rft: [], batches: [], bcSeq: 0, shadeOv: {}, set: {} };

/** Who may change each slice. Entries, work orders and the board have finer checks below. */
const SLICE_ROLES: Record<Slice, string[]> = {
  ent: [], wos: [], batches: ['Dyeing Planner'], bcSeq: ['Dyeing Planner'],
  hold: ['Dyeing Planner', 'Dyeing Production', 'Finishing QC', 'Testing Lab'],
  plan: ['Dyeing Planner'], edit: ['Dyeing Planner'], woSeq: ['Dyeing Planner'], rowWo: ['Dyeing Planner'], shadeOv: ['Dyeing Planner'], set: ['Dyeing Planner'],
  labdip: ['Dyeing Lab', 'Merchandiser'], tests: ['Testing Lab'], fqc: ['Finishing QC'], cond: ['Merchandiser', 'Management'], rft: ['Dyeing Lab', 'Testing Lab'],
};

export const ENTRY_TYPES: Record<string, string> = {
  grcv: 'Greige Store', giss: 'Greige Store', gsub: 'Greige Store', gheat: 'Greige Store', rheat: 'Greige Store',
  dye: 'Dyeing Production', drcv: 'Dyeing Production', psend: 'Dyeing Production', prcv: 'Dyeing Production', offer: 'Dyeing Production', dlv: 'Dyeing Production',
};
const LABDIP = ['Not recorded', 'Submitted', 'Approved', 'Rejected'];
const RESULTS = ['Pass', 'Fail', 'Retest', 'Hold'];
const PROCS = ['heat', 'aop', 'peach', 'brush', 'shear', 'singe', 'fin'];

export type Ctx = {
  ui: string[];                                  // desk roles of the user
  lineKey: (lineId: string) => string | null;    // job|colour for a line id, null when the line does not exist
  state: Record<string, any>;                    // full state AFTER this save (for gates)
  sms: Record<string, string>;                   // lab dips approved in merchandising (job|colour → Approved)
};

const has = (c: Ctx, roles: string[]) => roles.some((r) => c.ui.includes(r));
const same = (a: unknown, b: unknown) => canon(a) === canon(b); // key order free: PostgreSQL JSONB does not keep key order
const isDay = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
const changedKeys = (o: any, n: any) => [...new Set([...Object.keys(o || {}), ...Object.keys(n || {})])].filter((k) => !same(o?.[k], n?.[k]));

export function labdipApproved(key: string, state: Record<string, any>, sms: Record<string, string>) {
  return state.labdip?.[key]?.st === 'Approved' || (!state.labdip?.[key]?.st && sms[key] === 'Approved');
}
/** Delivery gate: testing lab pass + final inspection pass, or a written conditional release. */
export function canDeliver(key: string, state: Record<string, any>) {
  return (state.tests?.[key]?.res === 'Pass' && state.fqc?.[key]?.res === 'Pass') || !!state.cond?.[key];
}

function checkEntry(e: any, lineId: string, c: Ctx, errs: string[]) {
  const who = ENTRY_TYPES[e?.t];
  if (!who) return errs.push(`Unknown entry type "${e?.t}"`);
  if (!has(c, [who, 'Dyeing Planner'])) return errs.push(`${who} makes "${e.t}" entries`);
  if (!(num(e.q) > 0)) errs.push('Entry qty must be more than 0');
  if (!isDay(e.d)) errs.push('Entry date must be YYYY-MM-DD');
  if ((e.t === 'psend' || e.t === 'prcv') && !PROCS.includes(e.k)) errs.push('Choose the process');
  if ((e.t === 'gsub' || e.t === 'gheat' || e.t === 'psend') && !String(e.f || '').trim()) errs.push('Enter the factory');
  if (e.t === 'dlv') {
    const key = c.lineKey(lineId);
    if (key && !canDeliver(key, c.state)) errs.push(`Delivery for ${key.replace('|', ' · ')} needs testing lab pass and final inspection pass, or a conditional release`);
  }
}

export function checkSlice(slice: Slice, oldData: any, newData: any, c: Ctx): string[] {
  const errs: string[] = [];
  if (!(SLICES as readonly string[]).includes(slice)) return [`Unknown slice ${slice}`];
  if (same(oldData, newData)) return errs;
  const need = SLICE_ROLES[slice];
  if (need.length && !has(c, need)) return [`${slice === 'cond' ? 'Conditional release' : slice} can be changed by ${need.join(' or ')} only`];

  if (slice === 'ent') {
    for (const id of changedKeys(oldData, newData)) {
      if (c.lineKey(id) == null) { errs.push(`Line ${id} does not exist`); continue; }
      const o: any[] = oldData?.[id] || [], n: any[] = newData?.[id] || [];
      const keep = Math.min(o.length, n.length); let p = 0;
      while (p < keep && same(o[p], n[p])) p++;
      for (const e of o.slice(p)) if (!has(c, [ENTRY_TYPES[e?.t], 'Dyeing Planner'])) errs.push(`Only ${ENTRY_TYPES[e?.t]} can remove its "${e?.t}" entry`);
      for (const e of n.slice(p)) checkEntry(e, id, c, errs);
    }
  } else if (slice === 'wos') {
    const o = new Map<string, any>((oldData || []).map((w: any) => [w.no, w])), n = new Map<string, any>((newData || []).map((w: any) => [w.no, w]));
    for (const [no, w] of n) {
      const was = o.get(no);
      if (!was) {
        if (!has(c, ['Dyeing Planner'])) errs.push('Dyeing Planner creates work orders');
        if (!['In-house', 'Subcontract'].includes(w.route)) errs.push(`${no}: route must be In-house or Subcontract`);
        if (w.route === 'In-house' && w.fac !== 'NFL') errs.push(`${no}: in-house work order factory must be NFL`);
        if (w.route === 'Subcontract' && (!w.fac || w.fac === 'NFL')) errs.push(`${no}: choose the subcontract factory`);
        if (w.st === 'Approved' && !has(c, ['Planning & Control', 'Dyeing Planner'])) errs.push(`${no}: approval is by Planning & Control`);
      } else if (!same(was, w)) {
        if (was.st !== 'Approved' && w.st === 'Approved') { if (!has(c, ['Planning & Control', 'Dyeing Planner'])) errs.push(`${no}: approval is by Planning & Control`); }
        else if (was.st === 'Approved' && !same({ ...was, st: 0 }, { ...w, st: 0 })) errs.push(`${no} is approved and cannot be changed`);
        else if (!has(c, ['Dyeing Planner'])) errs.push(`${no}: only the Dyeing Planner edits work orders`);
      }
    }
    for (const [no, was] of o) if (!n.has(no)) {
      if (was.st === 'Approved') errs.push(`${no} is approved and cannot be cancelled`);
      else if (!has(c, ['Dyeing Planner', 'Planning & Control'])) errs.push(`${no}: only the Dyeing Planner or Planning & Control cancels`);
    }
  } else if (slice === 'labdip') {
    for (const k of changedKeys(oldData, newData)) if (newData?.[k] && !LABDIP.includes(newData[k].st)) errs.push(`Lab dip status "${newData[k].st}" is not allowed`);
  } else if (slice === 'tests' || slice === 'fqc') {
    for (const k of changedKeys(oldData, newData)) {
      const t = newData?.[k];
      if (!t) continue;
      if (!RESULTS.includes(t.res)) errs.push(`Result "${t.res}" is not allowed`);
      if (t.res !== 'Pass' && !String(t.find || '').trim()) errs.push('Write the findings for a fail, hold or retest');
    }
  } else if (slice === 'cond') {
    for (const k of changedKeys(oldData, newData)) if (newData?.[k] && !String(newData[k].n || '').trim()) errs.push('Write the reason for the conditional release');
  } else if (slice === 'rft') {
    const o: any[] = oldData || [], n: any[] = newData || [];
    if (n.length < o.length || o.some((x, i) => !same(x, n[i]))) errs.push('Bulk shade checks can only be added, not changed');
    for (const x of n.slice(o.length)) { if (!['RFT', 'NRFT'].includes(x?.res)) errs.push('Result must be RFT or NRFT'); if (x?.res === 'NRFT' && !x.rs) errs.push('Pick the NRFT reason'); }
  } else if (slice === 'batches') {
    const maxl = num(c.state.set?.maxl) > 0 ? num(c.state.set?.maxl) : 85;
    const oldById = new Map<string, any>((oldData || []).map((b: any) => [b.id, b]));
    const cards = new Set<string>();
    for (const b of newData || []) {
      const m = MACHINES.find((x) => x.id === b.m);
      if (!m) { errs.push(`Machine ${b.m} does not exist`); continue; }
      const kg = (b.parts || []).reduce((a: number, p: any) => a + (num(p.kg) || 0), 0);
      if (kg > m.cap * maxl / 100 + 0.5) errs.push(`${b.m}: ${Math.round(kg)} kg is over the safe load (${maxl}% of ${m.cap} kg)`);
      if (!isDay(b.d)) errs.push('Batch date must be YYYY-MM-DD');
      for (const p of b.parts || []) {
        const key = c.lineKey(p.i);
        if (key == null) { errs.push(`Batch on ${b.m}: line ${p.i} does not exist`); continue; }
        const was = oldById.get(b.id);
        const unchanged = was && same(was.parts, b.parts);
        if (!unchanged && !labdipApproved(key, c.state, c.sms)) errs.push(`${key.replace('|', ' · ')}: lab dip / shade not approved, cannot load`);
      }
      if (b.card) { if (cards.has(b.card)) errs.push(`Batch card ${b.card} is used twice`); cards.add(b.card); }
    }
    for (const was of oldData || []) {
      if (!was.conf) continue;
      const now = (newData || []).find((b: any) => b.id === was.id);
      if (!now || now.card !== was.card || now.m !== was.m || now.d !== was.d || !same(now.parts, was.parts)) errs.push(`Batch card ${was.card} is already issued and cannot be changed`);
    }
  } else if (slice === 'woSeq' || slice === 'bcSeq') {
    if (!(num(newData) >= num(oldData ?? 0))) errs.push(`${slice} cannot go back`);
  }
  return [...new Set(errs)];
}

/** One-line description of a change for the change log. */
export function summarize(slice: Slice, oldData: any, newData: any): string {
  if (Array.isArray(newData)) return `${slice}: ${(oldData || []).length} → ${newData.length} records`;
  if (newData && typeof newData === 'object') return `${slice}: ${changedKeys(oldData, newData).length} changed`;
  return `${slice}: ${JSON.stringify(oldData ?? null)} → ${JSON.stringify(newData)}`;
}
