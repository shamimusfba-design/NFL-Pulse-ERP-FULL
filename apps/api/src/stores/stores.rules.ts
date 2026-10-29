/**
 * Greige Fabric Store and Finished Fabric Store desks — pure rules (no database).
 * The two stores are separate (owner, 29 Oct 2026). Same pattern as the dyeing desk: the page sends only the slices that
 * changed; checkSlice() compares old and new data and refuses what the user's role may not do.
 *
 * Greige: knitting posts a delivery challan → store weighs and accepts (own NFL knitting goes to stock; subcontract
 * knitting waits for the 4-point QC) → dyeing sends delivery requests (in-house batch, or subcontract work order
 * filled by partial deliveries) → store delivers against them → left-over greige goes to the reuse list.
 * Finished: dyeing posts a delivery challan → store weighs and accepts → issue to cutting / returns → after cutting OK
 * and the shipment date, left-over fabric goes to the reuse list.
 */
export type Desk = 'GREIGE' | 'FINISHED';
const MERCH = ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'];
export const UI_ROLES: Record<Desk, Record<string, string[]>> = {
  GREIGE: { 'Greige Store': ['GREIGE_STORE'], Knitting: ['KNITTING', 'KNIT_PLANNER', 'KNIT_REPORTER', 'KNIT_INCHARGE'], 'Knit Quality': ['KNIT_QUALITY'], 'Dyeing Planner': ['DYEING_PLANNER'], 'Planning & Control': ['PLANNING'], Merchandiser: MERCH, Management: ['MANAGEMENT'] },
  FINISHED: { 'Finished Fabric Store': ['FINISHED_FABRIC_STORE'], 'Dyeing Production': ['DYEING'], Cutting: ['CUTTING'], 'Planning & Control': ['PLANNING'], Merchandiser: MERCH, Management: ['MANAGEMENT'] },
};
export const STORE_ROLE: Record<Desk, string> = { GREIGE: 'Greige Store', FINISHED: 'Finished Fabric Store' };
export function uiRolesOf(desk: Desk, codes: string[]) {
  const m = UI_ROLES[desk];
  if (codes.includes('ADMIN')) return Object.keys(m);
  return Object.entries(m).filter(([, c]) => c.some((x) => codes.includes(x))).map(([k]) => k);
}
export const SLICES: Record<Desk, string[]> = {
  GREIGE: ['kdel', 'kseq', 'req', 'rseq', 'giss', 'gseq', 'reuse', 'flags', 'fseq', 'resv', 'demoSeeded'],
  FINISHED: ['ddel', 'dseq', 'cut', 'cseq', 'ret', 'cutok', 'fre', 'flags', 'fseq', 'resv', 'demoSeeded'],
};
export const EMPTY: Record<string, unknown> = { kdel: [], req: [], giss: [], reuse: {}, flags: [], resv: [], ddel: [], cut: [], ret: [], cutok: {}, fre: {}, demoSeeded: false };
export const emptyOf = (s: string) => (s.endsWith('seq') ? 0 : JSON.parse(JSON.stringify(EMPTY[s] ?? null)));

export type Ctx = { desk: Desk; ui: string[]; demo: boolean; lines: Record<string, any[]>; state: Record<string, any>; today: string };
/** Key-order-free JSON (PostgreSQL JSONB does not keep key order). */
export const canon = (v: unknown): string => v === null || typeof v !== 'object' ? JSON.stringify(v ?? null) : Array.isArray(v) ? `[${v.map(canon).join(',')}]` : `{${Object.keys(v as object).filter((k) => (v as any)[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon((v as any)[k])).join(',')}}`;
const same = (a: unknown, b: unknown) => canon(a) === canon(b);
const has = (c: Ctx, r: string[]) => r.some((x) => c.ui.includes(x));
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const tri = (o: any) => num(o?.body) + num(o?.lrib) + num(o?.sj);
const byKey = (a: any[], k: string) => new Map((a || []).map((x: any, i: number) => [String(x?.[k] ?? i), x]));

/* ---------- stock (same formulas as the pages) ---------- */
export function greigeAvail(i: number, c: Ctx) {
  const r = c.lines.G[i] || {}, s = c.state;
  const acc = (s.kdel || []).filter((d: any) => d.i === i && (d.st === 'Accepted' || d.st === 'QC pending'));
  const recv = num(r.rq) + acc.reduce((a: number, d: any) => a + num(d.acc?.kg), 0);
  const qc = acc.filter((d: any) => d.st === 'QC pending').reduce((a: number, d: any) => a + num(d.acc?.kg), 0);
  const iss = num(r.iq) + (s.giss || []).filter((x: any) => x.i === i).reduce((a: number, x: any) => a + num(x.kg), 0);
  const reuse = s.reuse?.[i]?.st === 'In reuse' ? num(s.reuse[i].kg) : 0;
  return recv - iss - qc - reuse;
}
export function finishedStock(i: number, c: Ctx) {
  const r = c.lines.F[i] || {}, s = c.state;
  const recv = num(r.vb) + num(r.vl) + num(r.vs) + (s.ddel || []).filter((d: any) => d.i === i && d.st === 'Accepted').reduce((a: number, d: any) => a + tri(d.acc), 0);
  const cut = (s.cut || []).filter((x: any) => x.i === i).reduce((a: number, x: any) => a + tri(x), 0);
  const ret = (s.ret || []).filter((x: any) => x.i === i).reduce((a: number, x: any) => a + num(x.kg), 0);
  const fre = s.fre?.[i] ? num(s.fre[i].kg) : 0;
  return recv - cut + ret - fre;
}
function reuseKg(rid: string, c: Ctx) {
  const k = +rid.slice(1);
  if (c.desk === 'GREIGE') return rid[0] === 'L' ? num(c.state.reuse?.[k]?.kg) : num(c.lines.A[k]?.q);
  return rid[0] === 'R' ? num(c.lines.R[k]?.body) + num(c.lines.R[k]?.rib) : num(c.state.fre?.[k]?.kg);
}

/** Appended records only (old ones must stay as they were); demo records may be removed by the store. */
function appendOnly(name: string, o: any[], n: any[], c: Ctx, errs: string[]) {
  const nk = new Set(n.map((x) => canon(x)));
  for (const x of o) if (!nk.has(canon(x)) && !(x?.demo && (has(c, [STORE_ROLE[c.desk]]) || c.demo))) errs.push(`${name} records cannot be changed or removed`);
  const ok = new Set(o.map((x) => canon(x)));
  return n.filter((x) => !ok.has(canon(x)));
}
function okLine(i: unknown, kind: string, c: Ctx) { return Number.isInteger(i) && (i as number) >= 0 && (i as number) < (c.lines[kind] || []).length; }

export function checkSlice(slice: string, oldD: any, newD: any, c: Ctx): string[] {
  const errs: string[] = [];
  if (!SLICES[c.desk].includes(slice)) return [`Unknown slice ${slice}`];
  if (same(oldD, newD)) return errs;
  const store = STORE_ROLE[c.desk];
  const ownOrDemo = (who: string[], x: any) => has(c, who) || (c.demo && x?.demo);

  if (slice.endsWith('seq')) { if (num(newD) < num(oldD)) errs.push(`${slice} cannot go back`); return errs; }
  if (slice === 'demoSeeded') { if (!c.demo && !has(c, [store])) errs.push('Demo data is loaded by the store'); return errs; }

  // ---- delivery challans (greige: from knitting; finished: from dyeing) ----
  if (slice === 'kdel' || slice === 'ddel') {
    const from = slice === 'kdel' ? 'Knitting' : 'Dyeing Production', kind = slice === 'kdel' ? 'G' : 'F';
    const o = byKey(oldD, 'id'), n = byKey(newD, 'id');
    for (const [id, d] of n) {
      const was = o.get(id);
      if (!was) {
        if (!ownOrDemo([from], d)) errs.push(`${from} posts delivery challans`);
        if (!okLine(d.i, kind, c)) errs.push('Pick the job / colour line');
        if (!String(d.ch || '').trim()) errs.push('Enter the challan no');
        if (!((slice === 'kdel' ? num(d.kg) : tri(d)) > 0)) errs.push('Enter the challan qty');
        if (d.st !== 'Pending' && !(c.demo && d.demo)) errs.push('A new challan starts as Pending');
        continue;
      }
      if (same(was, d)) continue;
      const keep = (x: any) => ({ ...x, st: 0, acc: 0, qc: 0, rej: 0 });
      if (!same(keep(was), keep(d))) { errs.push(`Challan ${d.ch}: only the receipt can change`); continue; }
      if (was.st === 'Pending' && ['Accepted', 'QC pending', 'Rejected'].includes(d.st)) {
        if (!has(c, [store])) errs.push(`${store} accepts receipts`);
        if (d.st === 'Rejected') { if (!String(d.rej || '').trim()) errs.push('Write why the challan is rejected'); }
        else if (!((slice === 'kdel' ? num(d.acc?.kg) : tri(d.acc)) > 0)) errs.push('Enter the weighed kg');
        if (slice === 'kdel' && d.st === 'Accepted' && d.src !== 'NFL') errs.push('Subcontract knitting goes to QC before stock');
        if (slice === 'kdel' && d.st === 'QC pending' && d.src === 'NFL') errs.push('Own (NFL) knitting needs no QC');
      } else if (slice === 'kdel' && was.st === 'QC pending' && ['Accepted', 'Rejected'].includes(d.st)) {
        if (!has(c, ['Knit Quality'])) errs.push('Knit Quality saves the 4-point inspection');
        if (!d.qc || !['Pass', 'Fail'].includes(d.qc.res)) errs.push('Record the inspection result');
        if (d.qc?.res === 'Fail' && !String(d.qc.f || '').trim()) errs.push('Write the defects for a fail');
      } else errs.push(`Challan ${d.ch}: ${was.st} → ${d.st} is not allowed`);
    }
    for (const [, was] of o) if (!n.has(String(was.id)) && !(was.demo && (has(c, [store]) || c.demo))) errs.push('Challans cannot be deleted');
    return [...new Set(errs)];
  }

  // ---- greige: delivery requests from dyeing + deliveries ----
  if (slice === 'req') {
    const o = byKey(oldD, 'id'), n = byKey(newD, 'id');
    for (const [id, q] of n) {
      const was = o.get(id);
      if (!was) {
        if (!ownOrDemo(['Dyeing Planner'], q)) errs.push('Dyeing Planner sends delivery requests');
        if (!okLine(q.i, 'G', c)) errs.push('Pick the job / colour line');
        if (!['In-house batch', 'Subcontract WO'].includes(q.type)) errs.push('Type must be In-house batch or Subcontract WO');
        if (!String(q.ref || '').trim()) errs.push('Enter the batch card / WO no');
        if (!(num(q.kg) > 0)) errs.push('Enter the kg');
        if (q.type === 'In-house batch' && q.fac !== 'NFL') errs.push('In-house batch factory is NFL');
        if (q.type === 'Subcontract WO' && (!q.fac || q.fac === 'NFL')) errs.push('Enter the subcontract factory');
        continue;
      }
      if (same(was, q)) continue;
      if (!same({ ...was, st: 0, closed: 0 }, { ...q, st: 0, closed: 0 }) || was.st !== 'Open') { errs.push(`${q.no}: only an open request can be closed`); continue; }
      if (q.st === 'Closed' && !has(c, [store])) errs.push(`${store} closes requests`);
      if (q.st === 'Done' && !has(c, [store])) errs.push(`${store} delivers`);
    }
    for (const [, was] of o) if (!n.has(String(was.id)) && !(was.demo && (has(c, [store]) || c.demo))) errs.push('Requests cannot be deleted');
    return [...new Set(errs)];
  }
  if (slice === 'giss') {
    for (const x of appendOnly('Delivery', oldD || [], newD || [], c, errs)) {
      if (!ownOrDemo([store], x)) errs.push(`${store} delivers greige`);
      if (!(num(x.kg) > 0)) errs.push('Enter the kg');
      const q = (c.state.req || []).find((r: any) => r.id === x.req);
      if (!q) { errs.push('Delivery must be against a request'); continue; }
      const done = (c.state.giss || []).filter((g: any) => g.req === q.id).reduce((a: number, g: any) => a + num(g.kg), 0);
      if (done > num(q.kg) * 1.03 + 1) errs.push(`${q.no}: more delivered than requested`);
      if (greigeAvail(x.i, c) < -0.5) errs.push(`Not enough greige in stock for ${q.ref}`);
    }
    return [...new Set(errs)];
  }
  if (slice === 'reuse') {
    if (!has(c, [store])) return [`${store} sorts left-over greige`];
    for (const [k, u] of Object.entries(newD || {})) {
      if (same(oldD?.[k], u)) continue;
      const x: any = u;
      if (!okLine(+k, 'G', c)) errs.push('Unknown line');
      if (!['In reuse', 'Not reusable'].includes(x?.st)) errs.push('Status must be In reuse or Not reusable');
      if (x?.st === 'Not reusable' && !String(x.why || '').trim()) errs.push('Write why it is not reusable');
    }
    return [...new Set(errs)];
  }

  // ---- finished: cutting ----
  if (slice === 'cut') {
    for (const x of appendOnly('Cutting issue', oldD || [], newD || [], c, errs)) {
      if (!ownOrDemo([store], x)) errs.push(`${store} issues fabric`);
      if (!String(x.lot || '').trim()) errs.push('Enter the cutting lot no');
      if (!(tri(x) > 0)) errs.push('Enter the qty');
      if (okLine(x.i, 'F', c) && finishedStock(x.i, c) < -0.5) errs.push('More than the stock');
    }
    return [...new Set(errs)];
  }
  if (slice === 'ret') {
    for (const x of appendOnly('Return', oldD || [], newD || [], c, errs)) { if (!has(c, ['Cutting'])) errs.push('Cutting returns fabric'); if (!(num(x.kg) > 0)) errs.push('Enter the kg'); }
    return [...new Set(errs)];
  }
  if (slice === 'cutok') {
    for (const k of new Set([...Object.keys(oldD || {}), ...Object.keys(newD || {})])) {
      if (same(oldD?.[k], newD?.[k])) continue;
      const x = newD?.[k] || oldD?.[k];
      if (!has(c, ['Cutting']) && !(x?.demo && (c.demo || has(c, [store])))) errs.push('Cutting confirms cutting OK');
    }
    return [...new Set(errs)];
  }
  if (slice === 'fre') {
    if (!has(c, [store])) return [`${store} sends fabric to reuse`];
    for (const [k, u] of Object.entries(newD || {})) {
      if (same(oldD?.[k], u)) continue;
      const x: any = u, r = c.lines.F[+k];
      if (!r) { errs.push('Unknown line'); continue; }
      if (!c.state.cutok?.[`${r.b}|${r.j}`]) errs.push(`${r.b} ${r.j}: cutting is not OK yet`);
      if (!x?.ship || x.ship > c.today) errs.push('Shipment date has not passed yet');
      if (!(num(x?.kg) > 0)) errs.push('Nothing left to send');
      if (finishedStock(+k, c) < -0.5) errs.push('More than the stock');
    }
    for (const k of Object.keys(oldD || {})) if (!(k in (newD || {}))) errs.push('Reuse records cannot be removed');
    return [...new Set(errs)];
  }

  // ---- both: order sheet checks + reservations ----
  const deciders = c.desk === 'GREIGE' ? ['Planning & Control', 'Knitting'] : ['Planning & Control', 'Merchandiser'];
  if (slice === 'flags') {
    const o = byKey(oldD, 'id'), n = byKey(newD, 'id');
    for (const [id, f] of n) {
      const was = o.get(id);
      if (!was) { if (!c.ui.length || (c.ui.length === 1 && c.ui[0] === 'Management')) errs.push('Your role cannot send order sheet checks'); if (f.st !== 'Hold for physical check') errs.push('A new check starts on hold'); continue; }
      if (same(was, f)) continue;
      if (was.st !== 'Hold for physical check' || !same({ ...was, st: 0, note: 0 }, { ...f, st: 0, note: 0 })) { errs.push('Only an open check can be decided'); continue; }
      if (!has(c, deciders)) errs.push(`${deciders.join(' or ')} decides`);
      if (f.st === 'Not suitable' && !String(f.note || '').trim()) errs.push('Write why it is not suitable');
    }
    return [...new Set(errs)];
  }
  if (slice === 'resv') {
    const added = appendOnly('Reservation', oldD || [], newD || [], c, errs);
    if (added.length && !has(c, deciders)) errs.push(`${deciders.join(' or ')} reserves reuse fabric`);
    for (const x of added) {
      if (!(num(x.kg) > 0)) errs.push('Reservation kg must be more than 0');
      const used = (newD || []).filter((r: any) => r.rid === x.rid).reduce((a: number, r: any) => a + num(r.kg), 0);
      if (used > reuseKg(String(x.rid), c) + 0.5) errs.push('More reserved than the reuse stock has');
    }
    return [...new Set(errs)];
  }
  return errs;
}
