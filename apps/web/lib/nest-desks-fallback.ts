import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// 1. REUSE RULES (/apps/api/src/reuse/reuse.rules.ts)
// ============================================================================
export type Fabric = {
  fabric?: string | null;
  composition?: string | null;
  gsm?: number | string | null;
  dia?: string | null;
  colour?: string | null;
  process?: string | null;
};
export type Match = { ok: true; score: number; why: string[]; warn: string[] } | { ok: false };

const sStr = (v: unknown) => String(v ?? '');
export const numOf = (v: unknown) => {
  const m = sStr(v).match(/\d+(\.\d+)?/);
  return m ? +m[0] : null;
};

export function fabType(f: unknown) {
  const t = sStr(f).toLowerCase();
  if (/rib/.test(t)) return 'Rib';
  if (/interlock/.test(t)) return 'Interlock';
  if (/fleece/.test(t)) return 'Fleece';
  if (/terry/.test(t)) return 'Terry';
  if (/pique|lacoste/.test(t)) return 'Pique';
  if (/waffle/.test(t)) return 'Waffle';
  if (/seersucker/.test(t)) return 'Seersucker';
  if (/jacquard/.test(t)) return 'Jacquard';
  if (/mesh/.test(t)) return 'Mesh';
  if (/needle ?drop/.test(t)) return 'Needle drop';
  if (/s\s*\/\s*j|single\s*jersey|\bsj\b|jersey|\/j\b|\bh\/?l\/?j\b|heavy\s*\/?\s*j/.test(t)) return 'Single Jersey';
  if (/twill|woven|chiffon/.test(t)) return 'Woven';
  return t ? 'Other' : '—';
}

export function fabConstruction(f: unknown) {
  const t = sStr(f).toLowerCase();
  const m = t.match(/(\d)\s*x\s*(\d)/);
  if (m) return `${m[1]}x${m[2]} Rib`;
  if (/rib/.test(t)) return 'Rib (not stated)';
  if (/slub/.test(t)) return 'Slub';
  if (/y\.?\s*\/?\s*d|stripe/.test(t)) return 'Yarn-dyed / stripe';
  if (/needle ?drop/.test(t)) return 'Needle drop';
  if (/brush|fleece/.test(t)) return 'Brushed back';
  if (/f\.?\s*terry|french terry|loop/.test(t)) return 'Loop back (French terry)';
  if (/pique/.test(t)) return 'Pique';
  if (/waffle/.test(t)) return 'Waffle';
  if (/jacquard/.test(t)) return 'Jacquard';
  return 'Plain';
}

export const normColour = (c: unknown) =>
  sStr(c)
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[-–]\s*(aop|ad|adv).*/, '')
    .replace(/\b(c-?n?\d+|\d{2}-\d{4}\s*tcx|tcx|tpx)\b/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normComp = (c: unknown) => sStr(c).toLowerCase().replace(/\s+/g, '').replace(/organic|org|dtf/g, '');
const isPrint = (v: unknown) => /aop|print|discharge/i.test(sStr(v));
const isYarnColour = (f: unknown, c: unknown) => /y\/?d|stripe|melange|mel\b|avg|cvc|grindle/i.test(sStr(f) + ' ' + sStr(c));

export function matchScore(need: Fabric, have: Fabric, finished: boolean): Match {
  const why: string[] = [];
  const warn: string[] = [];
  let score = 0;
  if (!need.fabric || fabType(need.fabric) !== fabType(have.fabric) || fabConstruction(need.fabric) !== fabConstruction(have.fabric)) {
    return { ok: false };
  }
  why.push(`${fabType(have.fabric)} · ${fabConstruction(have.fabric)}`);
  score += 30;
  const g1 = numOf(need.gsm);
  const g2 = numOf(have.gsm);
  if (g1 && g2) {
    const d = Math.abs(g1 - g2) / g1;
    if (d > 0.05) return { ok: false };
    score += d <= 0.02 ? 25 : 15;
    why.push(`GSM ${g2} for ${g1}`);
  } else warn.push('GSM not recorded');
  const d1 = numOf(need.dia);
  const d2 = numOf(have.dia);
  if (d1 && d2) {
    const diff = d2 - d1;
    if (finished ? diff < -1 || diff > 6 : Math.abs(diff) > 2) return { ok: false };
    score += Math.abs(diff) <= 2 ? 15 : 8;
    why.push(`Dia ${d2}" for ${d1}"`);
  } else warn.push('Check width (dia)');
  if (need.composition && have.composition) {
    if (normComp(need.composition) !== normComp(have.composition)) return { ok: false };
    score += 15;
    why.push('Same composition');
  } else warn.push('Check composition / yarn');
  if (finished || isYarnColour(need.fabric, need.colour) || isYarnColour(have.fabric, have.colour)) {
    const c1 = normColour(need.colour);
    const c2 = normColour(have.colour);
    if (!c1 || c1 !== c2) return { ok: false };
    score += 15;
    why.push(`Colour ${have.colour}`);
    if (finished) warn.push('Check shade against the standard (different dye lot)');
  }
  if (isPrint(need.colour) || isPrint(need.process) || isPrint(have.colour) || isPrint(have.process)) return { ok: false };
  return { ok: true, score, why, warn };
}

export type StockRow = Fabric & { id: string; store: string; jobNo?: string | null; kg: number; reservedKg: number };
export type Suggestion = {
  id: string;
  store: string;
  jobNo?: string | null;
  fabric?: string | null;
  gsm?: unknown;
  dia?: unknown;
  colour?: string | null;
  availableKg: number;
  score: number;
  why: string[];
  warn: string[];
};

export function suggest(need: Fabric, stock: StockRow[], limit = 5): Suggestion[] {
  const out: Suggestion[] = [];
  for (const r of stock) {
    const avail = Math.max(0, r.kg - r.reservedKg);
    if (avail < 2) continue;
    const m = matchScore(need, r, r.store === 'FINISHED');
    if (!m.ok) continue;
    out.push({
      id: r.id,
      store: r.store,
      jobNo: r.jobNo,
      fabric: r.fabric,
      gsm: r.gsm,
      dia: r.dia,
      colour: r.colour,
      availableKg: Math.round(avail * 10) / 10,
      score: m.score + (r.store === 'FINISHED' ? 10 : 0),
      why: m.why,
      warn: m.warn,
    });
  }
  return out.sort((a, b) => b.score - a.score || b.availableKg - a.availableKg).slice(0, limit);
}

// ============================================================================
// 2. STORES RULES (/apps/api/src/stores/stores.rules.ts)
// ============================================================================
export type Desk = 'GREIGE' | 'FINISHED';
const MERCH_ROLES = ['MERCH_SAMPLE', 'MERCH_BULK', 'MERCH_BOTH', 'MERCH_HEAD'];
export const STORE_UI_ROLES: Record<Desk, Record<string, string[]>> = {
  GREIGE: {
    'Greige Store': ['GREIGE_STORE'],
    Knitting: ['KNITTING', 'KNIT_PLANNER', 'KNIT_REPORTER', 'KNIT_INCHARGE'],
    'Knit Quality': ['KNIT_QUALITY'],
    'Dyeing Planner': ['DYEING_PLANNER'],
    'Planning & Control': ['PLANNING'],
    Merchandiser: MERCH_ROLES,
    Management: ['MANAGEMENT'],
  },
  FINISHED: {
    'Finished Fabric Store': ['FINISHED_FABRIC_STORE'],
    'Dyeing Production': ['DYEING'],
    Cutting: ['CUTTING'],
    'Planning & Control': ['PLANNING'],
    Merchandiser: MERCH_ROLES,
    Management: ['MANAGEMENT'],
  },
};
export const STORE_ROLE: Record<Desk, string> = { GREIGE: 'Greige Store', FINISHED: 'Finished Fabric Store' };

export function storeUiRolesOf(desk: Desk, codes: string[]) {
  const m = STORE_UI_ROLES[desk];
  if (codes.includes('ADMIN')) return Object.keys(m);
  return Object.entries(m)
    .filter(([, c]) => c.some((x) => codes.includes(x)))
    .map(([k]) => k);
}

export const STORE_SLICES: Record<Desk, string[]> = {
  GREIGE: ['kdel', 'kseq', 'req', 'rseq', 'giss', 'gseq', 'reuse', 'flags', 'fseq', 'resv', 'demoSeeded'],
  FINISHED: ['ddel', 'dseq', 'cut', 'cseq', 'ret', 'cutok', 'fre', 'flags', 'fseq', 'resv', 'demoSeeded'],
};
export const STORE_EMPTY: Record<string, unknown> = {
  kdel: [],
  req: [],
  giss: [],
  reuse: {},
  flags: [],
  resv: [],
  ddel: [],
  cut: [],
  ret: [],
  cutok: {},
  fre: {},
  demoSeeded: false,
};
export const emptyOfStore = (s: string) => (s.endsWith('seq') ? 0 : JSON.parse(JSON.stringify(STORE_EMPTY[s] ?? null)));

export type StoreCtx = { desk: Desk; ui: string[]; demo: boolean; lines: Record<string, any[]>; state: Record<string, any>; today: string };

export const canon = (v: unknown): string =>
  v === null || typeof v !== 'object'
    ? JSON.stringify(v ?? null)
    : Array.isArray(v)
    ? `[${v.map(canon).join(',')}]`
    : `{${Object.keys(v as object)
        .filter((k) => (v as any)[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + canon((v as any)[k]))
        .join(',')}}`;

const same = (a: unknown, b: unknown) => canon(a) === canon(b);
const hasStoreRole = (c: StoreCtx, r: string[]) => r.some((x) => c.ui.includes(x));
const numVal = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const tri = (o: any) => numVal(o?.body) + numVal(o?.lrib) + numVal(o?.sj);
const byKey = (a: any[], k: string) => new Map((a || []).map((x: any, i: number) => [String(x?.[k] ?? i), x]));

export function greigeAvail(i: number, c: StoreCtx) {
  const r = c.lines.G[i] || {};
  const s = c.state;
  const acc = (s.kdel || []).filter((d: any) => d.i === i && (d.st === 'Accepted' || d.st === 'QC pending'));
  const recv = numVal(r.rq) + acc.reduce((a: number, d: any) => a + numVal(d.acc?.kg), 0);
  const qc = acc.filter((d: any) => d.st === 'QC pending').reduce((a: number, d: any) => a + numVal(d.acc?.kg), 0);
  const iss = numVal(r.iq) + (s.giss || []).filter((x: any) => x.i === i).reduce((a: number, x: any) => a + numVal(x.kg), 0);
  const reuse = s.reuse?.[i]?.st === 'In reuse' ? numVal(s.reuse[i].kg) : 0;
  return recv - iss - qc - reuse;
}

export function finishedStock(i: number, c: StoreCtx) {
  const r = c.lines.F[i] || {};
  const s = c.state;
  const recv =
    numVal(r.vb) +
    numVal(r.vl) +
    numVal(r.vs) +
    (s.ddel || []).filter((d: any) => d.i === i && d.st === 'Accepted').reduce((a: number, d: any) => a + tri(d.acc), 0);
  const cut = (s.cut || []).filter((x: any) => x.i === i).reduce((a: number, x: any) => a + tri(x), 0);
  const ret = (s.ret || []).filter((x: any) => x.i === i).reduce((a: number, x: any) => a + numVal(x.kg), 0);
  const fre = s.fre?.[i] ? numVal(s.fre[i].kg) : 0;
  return recv - cut + ret - fre;
}

function reuseKg(rid: string, c: StoreCtx) {
  const k = +rid.slice(1);
  if (c.desk === 'GREIGE') return rid[0] === 'L' ? numVal(c.state.reuse?.[k]?.kg) : numVal(c.lines.A[k]?.q);
  return rid[0] === 'R' ? numVal(c.lines.R[k]?.body) + numVal(c.lines.R[k]?.rib) : numVal(c.state.fre?.[k]?.kg);
}

function appendOnly(name: string, o: any[], n: any[], c: StoreCtx, errs: string[]) {
  const nk = new Set(n.map((x) => canon(x)));
  for (const x of o) {
    if (!nk.has(canon(x)) && !(x?.demo && (hasStoreRole(c, [STORE_ROLE[c.desk]]) || c.demo))) {
      errs.push(`${name} records cannot be changed or removed`);
    }
  }
  const ok = new Set(o.map((x) => canon(x)));
  return n.filter((x) => !ok.has(canon(x)));
}

function okLine(i: unknown, kind: string, c: StoreCtx) {
  return Number.isInteger(i) && (i as number) >= 0 && (i as number) < (c.lines[kind] || []).length;
}

export function checkStoreSlice(slice: string, oldD: any, newD: any, c: StoreCtx): string[] {
  const errs: string[] = [];
  if (!STORE_SLICES[c.desk].includes(slice)) return [`Unknown slice ${slice}`];
  if (same(oldD, newD)) return errs;
  const store = STORE_ROLE[c.desk];
  const ownOrDemo = (who: string[], x: any) => hasStoreRole(c, who) || (c.demo && x?.demo);

  if (slice.endsWith('seq')) {
    if (numVal(newD) < numVal(oldD)) errs.push(`${slice} cannot go back`);
    return errs;
  }
  if (slice === 'demoSeeded') {
    if (!c.demo && !hasStoreRole(c, [store])) errs.push('Demo data is loaded by the store');
    return errs;
  }

  if (slice === 'kdel' || slice === 'ddel') {
    const from = slice === 'kdel' ? 'Knitting' : 'Dyeing Production';
    const kind = slice === 'kdel' ? 'G' : 'F';
    const o = byKey(oldD, 'id');
    const n = byKey(newD, 'id');
    for (const [id, d] of n) {
      const was = o.get(id);
      if (!was) {
        if (!ownOrDemo([from], d)) errs.push(`${from} posts delivery challans`);
        if (!okLine(d.i, kind, c)) errs.push('Pick the job / colour line');
        if (!String(d.ch || '').trim()) errs.push('Enter the challan no');
        if (!((slice === 'kdel' ? numVal(d.kg) : tri(d)) > 0)) errs.push('Enter the challan qty');
        if (d.st !== 'Pending' && !(c.demo && d.demo)) errs.push('A new challan starts as Pending');
        continue;
      }
      if (same(was, d)) continue;
      const keep = (x: any) => ({ ...x, st: 0, acc: 0, qc: 0, rej: 0 });
      if (!same(keep(was), keep(d))) {
        errs.push(`Challan ${d.ch}: only the receipt can change`);
        continue;
      }
      if (was.st === 'Pending' && ['Accepted', 'QC pending', 'Rejected'].includes(d.st)) {
        if (!hasStoreRole(c, [store])) errs.push(`${store} accepts receipts`);
        if (d.st === 'Rejected') {
          if (!String(d.rej || '').trim()) errs.push('Write why the challan is rejected');
        } else if (!((slice === 'kdel' ? numVal(d.acc?.kg) : tri(d.acc)) > 0)) errs.push('Enter the weighed kg');
        if (slice === 'kdel' && d.st === 'Accepted' && d.src !== 'NFL') errs.push('Subcontract knitting goes to QC before stock');
        if (slice === 'kdel' && d.st === 'QC pending' && d.src === 'NFL') errs.push('Own (NFL) knitting needs no QC');
      } else if (slice === 'kdel' && was.st === 'QC pending' && ['Accepted', 'Rejected'].includes(d.st)) {
        if (!hasStoreRole(c, ['Knit Quality'])) errs.push('Knit Quality saves the 4-point inspection');
        if (!d.qc || !['Pass', 'Fail'].includes(d.qc.res)) errs.push('Record the inspection result');
        if (d.qc?.res === 'Fail' && !String(d.qc.f || '').trim()) errs.push('Write the defects for a fail');
      } else errs.push(`Challan ${d.ch}: ${was.st} → ${d.st} is not allowed`);
    }
    for (const [, was] of o) {
      if (!n.has(String(was.id)) && !(was.demo && (hasStoreRole(c, [store]) || c.demo))) errs.push('Challans cannot be deleted');
    }
    return [...new Set(errs)];
  }

  if (slice === 'req') {
    const o = byKey(oldD, 'id');
    const n = byKey(newD, 'id');
    for (const [id, q] of n) {
      const was = o.get(id);
      if (!was) {
        if (!ownOrDemo(['Dyeing Planner'], q)) errs.push('Dyeing Planner sends delivery requests');
        if (!okLine(q.i, 'G', c)) errs.push('Pick the job / colour line');
        if (!['In-house batch', 'Subcontract WO'].includes(q.type)) errs.push('Type must be In-house batch or Subcontract WO');
        if (!String(q.ref || '').trim()) errs.push('Enter the batch card / WO no');
        if (!(numVal(q.kg) > 0)) errs.push('Enter the kg');
        if (q.type === 'In-house batch' && q.fac !== 'NFL') errs.push('In-house batch factory is NFL');
        if (q.type === 'Subcontract WO' && (!q.fac || q.fac === 'NFL')) errs.push('Enter the subcontract factory');
        continue;
      }
      if (same(was, q)) continue;
      if (!same({ ...was, st: 0, closed: 0 }, { ...q, st: 0, closed: 0 }) || was.st !== 'Open') {
        errs.push(`${q.no}: only an open request can be closed`);
        continue;
      }
      if (q.st === 'Closed' && !hasStoreRole(c, [store])) errs.push(`${store} closes requests`);
      if (q.st === 'Done' && !hasStoreRole(c, [store])) errs.push(`${store} delivers`);
    }
    for (const [, was] of o) {
      if (!n.has(String(was.id)) && !(was.demo && (hasStoreRole(c, [store]) || c.demo))) errs.push('Requests cannot be deleted');
    }
    return [...new Set(errs)];
  }

  if (slice === 'giss') {
    for (const x of appendOnly('Delivery', oldD || [], newD || [], c, errs)) {
      if (!ownOrDemo([store], x)) errs.push(`${store} delivers greige`);
      if (!(numVal(x.kg) > 0)) errs.push('Enter the kg');
      const q = (c.state.req || []).find((r: any) => r.id === x.req);
      if (!q) {
        errs.push('Delivery must be against a request');
        continue;
      }
      const done = (c.state.giss || []).filter((g: any) => g.req === q.id).reduce((a: number, g: any) => a + numVal(g.kg), 0);
      if (done > numVal(q.kg) * 1.03 + 1) errs.push(`${q.no}: more delivered than requested`);
      if (greigeAvail(x.i, c) < -0.5) errs.push(`Not enough greige in stock for ${q.ref}`);
    }
    return [...new Set(errs)];
  }

  if (slice === 'reuse') {
    if (!hasStoreRole(c, [store])) return [`${store} sorts left-over greige`];
    for (const [k, u] of Object.entries(newD || {})) {
      if (same(oldD?.[k], u)) continue;
      const x: any = u;
      if (!okLine(+k, 'G', c)) errs.push('Unknown line');
      if (!['In reuse', 'Not reusable'].includes(x?.st)) errs.push('Status must be In reuse or Not reusable');
      if (x?.st === 'Not reusable' && !String(x.why || '').trim()) errs.push('Write why it is not reusable');
    }
    return [...new Set(errs)];
  }

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
    for (const x of appendOnly('Return', oldD || [], newD || [], c, errs)) {
      if (!hasStoreRole(c, ['Cutting'])) errs.push('Cutting returns fabric');
      if (!(numVal(x.kg) > 0)) errs.push('Enter the kg');
    }
    return [...new Set(errs)];
  }

  if (slice === 'cutok') {
    for (const k of new Set([...Object.keys(oldD || {}), ...Object.keys(newD || {})])) {
      if (same(oldD?.[k], newD?.[k])) continue;
      const x = newD?.[k] || oldD?.[k];
      if (!hasStoreRole(c, ['Cutting']) && !(x?.demo && (c.demo || hasStoreRole(c, [store])))) errs.push('Cutting confirms cutting OK');
    }
    return [...new Set(errs)];
  }

  if (slice === 'fre') {
    if (!hasStoreRole(c, [store])) return [`${store} sends fabric to reuse`];
    for (const [k, u] of Object.entries(newD || {})) {
      if (same(oldD?.[k], u)) continue;
      const x: any = u;
      const r = c.lines.F[+k];
      if (!r) {
        errs.push('Unknown line');
        continue;
      }
      if (!c.state.cutok?.[`${r.b}|${r.j}`]) errs.push(`${r.b} ${r.j}: cutting is not OK yet`);
      if (!x?.ship || x.ship > c.today) errs.push('Shipment date has not passed yet');
      if (!(numVal(x?.kg) > 0)) errs.push('Nothing left to send');
      if (finishedStock(+k, c) < -0.5) errs.push('More than the stock');
    }
    for (const k of Object.keys(oldD || {})) if (!(k in (newD || {}))) errs.push('Reuse records cannot be removed');
    return [...new Set(errs)];
  }

  const deciders = c.desk === 'GREIGE' ? ['Planning & Control', 'Knitting'] : ['Planning & Control', 'Merchandiser'];
  if (slice === 'flags') {
    const o = byKey(oldD, 'id');
    const n = byKey(newD, 'id');
    for (const [id, f] of n) {
      const was = o.get(id);
      if (!was) {
        if (!c.ui.length || (c.ui.length === 1 && c.ui[0] === 'Management')) errs.push('Your role cannot send order sheet checks');
        if (f.st !== 'Hold for physical check') errs.push('A new check starts on hold');
        continue;
      }
      if (same(was, f)) continue;
      if (was.st !== 'Hold for physical check' || !same({ ...was, st: 0, note: 0 }, { ...f, st: 0, note: 0 })) {
        errs.push('Only an open check can be decided');
        continue;
      }
      if (!hasStoreRole(c, deciders)) errs.push(`${deciders.join(' or ')} decides`);
      if (f.st === 'Not suitable' && !String(f.note || '').trim()) errs.push('Write why it is not suitable');
    }
    return [...new Set(errs)];
  }

  if (slice === 'resv') {
    const added = appendOnly('Reservation', oldD || [], newD || [], c, errs);
    if (added.length && !hasStoreRole(c, deciders)) errs.push(`${deciders.join(' or ')} reserves reuse fabric`);
    for (const x of added) {
      if (!(numVal(x.kg) > 0)) errs.push('Reservation kg must be more than 0');
      const used = (newD || []).filter((r: any) => r.rid === x.rid).reduce((a: number, r: any) => a + numVal(r.kg), 0);
      if (used > reuseKg(String(x.rid), c) + 0.5) errs.push('More reserved than the reuse stock has');
    }
    return [...new Set(errs)];
  }

  return errs;
}

// ============================================================================
// 3. DYEING RULES (/apps/api/src/dyeing/dyeing.rules.ts)
// ============================================================================
export const DYEING_MACHINES: Array<{ id: string; cap: number; brand: string }> = [
  ['MC-01', 45, 'FONGS'],
  ['MC-02', 50, 'DILMENLER'],
  ['MC-03', 175, 'DILMENLER'],
  ['MC-04', 525, 'DILMENLER'],
  ['MC-05', 700, 'DILMENLER'],
  ['MC-06', 1050, 'DILMENLER'],
  ['MC-07', 1400, 'DILMENLER'],
  ['MC-08', 1200, 'DILMENLER'],
  ['MC-09', 75, 'THIES'],
  ['MC-10', 450, 'DILMENLER'],
  ['MC-11', 150, 'DILMENLER'],
  ['SM-01', 10, 'DILMENLER'],
  ['SM-02', 15, 'DILMENLER'],
  ['SM-03', 15, 'DILMENLER'],
  ['SM-04', 15, 'DILMENLER'],
  ['SM-05', 25, 'DILMENLER'],
  ['SM-06', 25, 'DILMENLER'],
  ['SM-07', 25, 'DILMENLER'],
  ['SM-08', 50, 'DILMENLER'],
  ['SM-09', 50, 'DILMENLER'],
].map(([id, cap, brand]) => ({ id: String(id), cap: Number(cap), brand: String(brand) }));

export const DYEING_UI_ROLES: Record<string, string[]> = {
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

export function dyeingUiRolesOf(codes: string[]): string[] {
  if (codes.includes('ADMIN')) return Object.keys(DYEING_UI_ROLES);
  return Object.entries(DYEING_UI_ROLES)
    .filter(([, c]) => c.some((x) => codes.includes(x)))
    .map(([k]) => k);
}

export const DYEING_SLICES = ['ent', 'hold', 'plan', 'edit', 'wos', 'woSeq', 'rowWo', 'labdip', 'tests', 'fqc', 'cond', 'rft', 'batches', 'bcSeq', 'shadeOv', 'set'] as const;
export type DyeingSlice = (typeof DYEING_SLICES)[number];
export const DYEING_EMPTY: Record<DyeingSlice, unknown> = {
  ent: {},
  hold: {},
  plan: {},
  edit: {},
  wos: [],
  woSeq: 0,
  rowWo: {},
  labdip: {},
  tests: {},
  fqc: {},
  cond: {},
  rft: [],
  batches: [],
  bcSeq: 0,
  shadeOv: {},
  set: {},
};

const DYEING_SLICE_ROLES: Record<DyeingSlice, string[]> = {
  ent: [],
  wos: [],
  batches: ['Dyeing Planner'],
  bcSeq: ['Dyeing Planner'],
  hold: ['Dyeing Planner', 'Dyeing Production', 'Finishing QC', 'Testing Lab'],
  plan: ['Dyeing Planner'],
  edit: ['Dyeing Planner'],
  woSeq: ['Dyeing Planner'],
  rowWo: ['Dyeing Planner'],
  shadeOv: ['Dyeing Planner'],
  set: ['Dyeing Planner'],
  labdip: ['Dyeing Lab', 'Merchandiser'],
  tests: ['Testing Lab'],
  fqc: ['Finishing QC'],
  cond: ['Merchandiser', 'Management'],
  rft: ['Dyeing Lab', 'Testing Lab'],
};

export const DYEING_ENTRY_TYPES: Record<string, string> = {
  grcv: 'Greige Store',
  giss: 'Greige Store',
  gsub: 'Greige Store',
  gheat: 'Greige Store',
  rheat: 'Greige Store',
  dye: 'Dyeing Production',
  drcv: 'Dyeing Production',
  psend: 'Dyeing Production',
  prcv: 'Dyeing Production',
  offer: 'Dyeing Production',
  dlv: 'Dyeing Production',
};
const LABDIP_OPTS = ['Not recorded', 'Submitted', 'Approved', 'Rejected'];
const RESULTS_OPTS = ['Pass', 'Fail', 'Retest', 'Hold'];
const PROCS_OPTS = ['heat', 'aop', 'peach', 'brush', 'shear', 'singe', 'fin'];

export type DyeingCtx = {
  ui: string[];
  lineKey: (lineId: string) => string | null;
  state: Record<string, any>;
  sms: Record<string, string>;
};

const hasDyeRole = (c: DyeingCtx, roles: string[]) => roles.some((r) => c.ui.includes(r));
const isDay = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const numNan = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
const changedKeys = (o: any, n: any) => [...new Set([...Object.keys(o || {}), ...Object.keys(n || {})])].filter((k) => !same(o?.[k], n?.[k]));

export function labdipApproved(key: string, state: Record<string, any>, sms: Record<string, string>) {
  return state.labdip?.[key]?.st === 'Approved' || (!state.labdip?.[key]?.st && sms[key] === 'Approved');
}

export function canDeliver(key: string, state: Record<string, any>) {
  return (state.tests?.[key]?.res === 'Pass' && state.fqc?.[key]?.res === 'Pass') || !!state.cond?.[key];
}

function checkDyeEntry(e: any, lineId: string, c: DyeingCtx, errs: string[]) {
  const who = DYEING_ENTRY_TYPES[e?.t];
  if (!who) return errs.push(`Unknown entry type "${e?.t}"`);
  if (!hasDyeRole(c, [who, 'Dyeing Planner'])) return errs.push(`${who} makes "${e.t}" entries`);
  if (!(numNan(e.q) > 0)) errs.push('Entry qty must be more than 0');
  if (!isDay(e.d)) errs.push('Entry date must be YYYY-MM-DD');
  if ((e.t === 'psend' || e.t === 'prcv') && !PROCS_OPTS.includes(e.k)) errs.push('Choose the process');
  if ((e.t === 'gsub' || e.t === 'gheat' || e.t === 'psend') && !String(e.f || '').trim()) errs.push('Enter the factory');
  if (e.t === 'dlv') {
    const key = c.lineKey(lineId);
    if (key && !canDeliver(key, c.state)) {
      errs.push(`Delivery for ${key.replace('|', ' · ')} needs testing lab pass and final inspection pass, or a conditional release`);
    }
  }
}

export function checkDyeingSlice(slice: DyeingSlice, oldData: any, newData: any, c: DyeingCtx): string[] {
  const errs: string[] = [];
  if (!(DYEING_SLICES as readonly string[]).includes(slice)) return [`Unknown slice ${slice}`];
  if (same(oldData, newData)) return errs;
  const need = DYEING_SLICE_ROLES[slice];
  if (need.length && !hasDyeRole(c, need)) return [`${slice === 'cond' ? 'Conditional release' : slice} can be changed by ${need.join(' or ')} only`];

  if (slice === 'ent') {
    for (const id of changedKeys(oldData, newData)) {
      if (c.lineKey(id) == null) {
        errs.push(`Line ${id} does not exist`);
        continue;
      }
      const o: any[] = oldData?.[id] || [];
      const n: any[] = newData?.[id] || [];
      const keep = Math.min(o.length, n.length);
      let p = 0;
      while (p < keep && same(o[p], n[p])) p++;
      for (const e of o.slice(p)) if (!hasDyeRole(c, [DYEING_ENTRY_TYPES[e?.t], 'Dyeing Planner'])) errs.push(`Only ${DYEING_ENTRY_TYPES[e?.t]} can remove its "${e?.t}" entry`);
      for (const e of n.slice(p)) checkDyeEntry(e, id, c, errs);
    }
  } else if (slice === 'wos') {
    const o = new Map<string, any>((oldData || []).map((w: any) => [w.no, w]));
    const n = new Map<string, any>((newData || []).map((w: any) => [w.no, w]));
    for (const [no, w] of n) {
      const was = o.get(no);
      if (!was) {
        if (!hasDyeRole(c, ['Dyeing Planner'])) errs.push('Dyeing Planner creates work orders');
        if (!['In-house', 'Subcontract'].includes(w.route)) errs.push(`${no}: route must be In-house or Subcontract`);
        if (w.route === 'In-house' && w.fac !== 'NFL') errs.push(`${no}: in-house work order factory must be NFL`);
        if (w.route === 'Subcontract' && (!w.fac || w.fac === 'NFL')) errs.push(`${no}: choose the subcontract factory`);
        if (w.st === 'Approved' && !hasDyeRole(c, ['Planning & Control', 'Dyeing Planner'])) errs.push(`${no}: approval is by Planning & Control`);
      } else if (!same(was, w)) {
        if (was.st !== 'Approved' && w.st === 'Approved') {
          if (!hasDyeRole(c, ['Planning & Control', 'Dyeing Planner'])) errs.push(`${no}: approval is by Planning & Control`);
        } else if (was.st === 'Approved' && !same({ ...was, st: 0 }, { ...w, st: 0 })) errs.push(`${no} is approved and cannot be changed`);
        else if (!hasDyeRole(c, ['Dyeing Planner'])) errs.push(`${no}: only the Dyeing Planner edits work orders`);
      }
    }
    for (const [no, was] of o) {
      if (!n.has(no)) {
        if (was.st === 'Approved') errs.push(`${no} is approved and cannot be cancelled`);
        else if (!hasDyeRole(c, ['Dyeing Planner', 'Planning & Control'])) errs.push(`${no}: only the Dyeing Planner or Planning & Control cancels`);
      }
    }
  } else if (slice === 'labdip') {
    for (const k of changedKeys(oldData, newData)) {
      if (newData?.[k] && !LABDIP_OPTS.includes(newData[k].st)) errs.push(`Lab dip status "${newData[k].st}" is not allowed`);
    }
  } else if (slice === 'tests' || slice === 'fqc') {
    for (const k of changedKeys(oldData, newData)) {
      const t = newData?.[k];
      if (!t) continue;
      if (!RESULTS_OPTS.includes(t.res)) errs.push(`Result "${t.res}" is not allowed`);
      if (t.res !== 'Pass' && !String(t.find || '').trim()) errs.push('Write the findings for a fail, hold or retest');
    }
  } else if (slice === 'cond') {
    for (const k of changedKeys(oldData, newData)) {
      if (newData?.[k] && !String(newData[k].n || '').trim()) errs.push('Write the reason for the conditional release');
    }
  } else if (slice === 'rft') {
    const o: any[] = oldData || [];
    const n: any[] = newData || [];
    if (n.length < o.length || o.some((x, i) => !same(x, n[i]))) errs.push('Bulk shade checks can only be added, not changed');
    for (const x of n.slice(o.length)) {
      if (!['RFT', 'NRFT'].includes(x?.res)) errs.push('Result must be RFT or NRFT');
      if (x?.res === 'NRFT' && !x.rs) errs.push('Pick the NRFT reason');
    }
  } else if (slice === 'batches') {
    const maxl = numNan(c.state.set?.maxl) > 0 ? numNan(c.state.set?.maxl) : 85;
    const oldById = new Map<string, any>((oldData || []).map((b: any) => [b.id, b]));
    const cards = new Set<string>();
    for (const b of newData || []) {
      const m = DYEING_MACHINES.find((x) => x.id === b.m);
      if (!m) {
        errs.push(`Machine ${b.m} does not exist`);
        continue;
      }
      const kg = (b.parts || []).reduce((a: number, p: any) => a + (numNan(p.kg) || 0), 0);
      if (kg > (m.cap * maxl) / 100 + 0.5) errs.push(`${b.m}: ${Math.round(kg)} kg is over the safe load (${maxl}% of ${m.cap} kg)`);
      if (!isDay(b.d)) errs.push('Batch date must be YYYY-MM-DD');
      for (const p of b.parts || []) {
        const key = c.lineKey(p.i);
        if (key == null) {
          errs.push(`Batch on ${b.m}: line ${p.i} does not exist`);
          continue;
        }
        const was = oldById.get(b.id);
        const unchanged = was && same(was.parts, b.parts);
        if (!unchanged && !labdipApproved(key, c.state, c.sms)) errs.push(`${key.replace('|', ' · ')}: lab dip / shade not approved, cannot load`);
      }
      if (b.card) {
        if (cards.has(b.card)) errs.push(`Batch card ${b.card} is used twice`);
        cards.add(b.card);
      }
    }
    for (const was of oldData || []) {
      if (!was.conf) continue;
      const now = (newData || []).find((b: any) => b.id === was.id);
      if (!now || now.card !== was.card || now.m !== was.m || now.d !== was.d || !same(now.parts, was.parts)) {
        errs.push(`Batch card ${was.card} is already issued and cannot be changed`);
      }
    }
  } else if (slice === 'woSeq' || slice === 'bcSeq') {
    if (!(numNan(newData) >= numNan(oldData ?? 0))) errs.push(`${slice} cannot go back`);
  }
  return [...new Set(errs)];
}

export function summarizeDyeing(slice: DyeingSlice, oldData: any, newData: any): string {
  if (Array.isArray(newData)) return `${slice}: ${(oldData || []).length} → ${newData.length} records`;
  if (newData && typeof newData === 'object') return `${slice}: ${changedKeys(oldData, newData).length} changed`;
  return `${slice}: ${JSON.stringify(oldData ?? null)} → ${JSON.stringify(newData)}`;
}

// ============================================================================
// 4. IN-MEMORY STATE & SEED LOADER
// ============================================================================
type DesksMemory = {
  greigeLines: Record<string, any[]>;
  finishedLines: Record<string, any[]>;
  dyeingLines: Array<{ id: string; [k: string]: any }>;
  storeSlices: Record<Desk, Record<string, { version: number; data: any }>>;
  storeChanges: Record<Desk, any[]>;
  dyeingSlices: Record<string, { version: number; data: any }>;
  dyeingChanges: any[];
  reuseStock: any[];
};

const gAny = globalThis as any;

function loadPrismaJson(filename: string, fallback: any) {
  const candidates = [
    path.join(process.cwd(), '..', 'api', 'prisma', filename),
    path.join(process.cwd(), 'apps', 'api', 'prisma', filename),
    path.join(process.cwd(), 'prisma', filename),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    } catch {
      // ignore and try next
    }
  }
  return fallback;
}

function getDesksMemory(): DesksMemory {
  if (gAny.__nosDesksMemory) return gAny.__nosDesksMemory;

  const greigeRaw = loadPrismaJson('greige-store-2026-09-28.json', { G: [], A: [] });
  const finishedRaw = loadPrismaJson('finished-store-2026.json', { F: [], R: [] });
  const dyeingRaw = loadPrismaJson('dyeing-report-2026-09-29.json', []);
  const reuseRaw = loadPrismaJson('reuse-stock-2026.json', []);

  const initStoreSlices = (desk: Desk) => {
    const out: Record<string, { version: number; data: any }> = {};
    for (const s of STORE_SLICES[desk]) out[s] = { version: 0, data: emptyOfStore(s) };
    return out;
  };

  const initDyeingSlices = () => {
    const out: Record<string, { version: number; data: any }> = {};
    for (const s of DYEING_SLICES) out[s] = { version: 0, data: JSON.parse(JSON.stringify(DYEING_EMPTY[s])) };
    return out;
  };

  const mem: DesksMemory = {
    greigeLines: { G: greigeRaw.G || [], A: greigeRaw.A || [] },
    finishedLines: { F: finishedRaw.F || [], R: finishedRaw.R || [] },
    dyeingLines: (Array.isArray(dyeingRaw) ? dyeingRaw : []).map((d: any, i: number) => ({ id: `dl-${i}`, ...d })),
    storeSlices: {
      GREIGE: initStoreSlices('GREIGE'),
      FINISHED: initStoreSlices('FINISHED'),
    },
    storeChanges: { GREIGE: [], FINISHED: [] },
    dyeingSlices: initDyeingSlices(),
    dyeingChanges: [],
    reuseStock: (Array.isArray(reuseRaw) ? reuseRaw : []).map((r: any, i: number) => ({
      id: `rs-${i + 1}`,
      ref: r.ref || `SEED:${i + 1}`,
      status: 'AVAILABLE',
      reservedKg: 0,
      ...r,
      gsm: numOf(r.gsm),
      fabricType: fabType(r.fabric),
      construction: fabConstruction(r.fabric),
    })),
  };

  gAny.__nosDesksMemory = mem;
  return mem;
}

const DESKS_MAP: Record<string, Desk> = { greige: 'GREIGE', finished: 'FINISHED' };
const AS_OF_MAP: Record<Desk, string> = { GREIGE: '2026-09-28', FINISHED: '2026-09-29' };

function syncReuseStock(mem: DesksMemory, desk: Desk, names: string[], beforeState: Record<string, any>, afterState: Record<string, any>, lines: Record<string, any[]>, by: string) {
  const slice = desk === 'GREIGE' ? 'reuse' : 'fre';
  if (!names.includes(slice)) return;
  const before = (beforeState[slice]?.data || {}) as Record<string, any>;
  const now = (afterState[slice] || {}) as Record<string, any>;
  for (const [k, u] of Object.entries(now)) {
    if (canon(before[k]) === canon(u)) continue;
    const ref = `${desk}:${desk === 'GREIGE' ? 'G' : 'F'}:${k}`;
    const r = (desk === 'GREIGE' ? lines.G : lines.F)[+k] || {};
    if (desk === 'GREIGE' && u.st !== 'In reuse') {
      mem.reuseStock.forEach((row) => {
        if (row.ref === ref) {
          row.status = 'NOT_REUSABLE';
          row.note = u.why || null;
        }
      });
      continue;
    }
    const fabric = desk === 'GREIGE' ? r.ft : r.f;
    const rowData = {
      store: desk,
      source: desk === 'GREIGE' ? 'LEFT_AFTER_DYEING' : 'LEFT_AFTER_CUTTING',
      buyer: r.b || null,
      jobNo: r.j || null,
      fabric: fabric || 'Not recorded',
      fabricType: fabType(fabric),
      construction: fabConstruction(fabric),
      gsm: numOf(r.gsm),
      dia: r.dia || null,
      colour: r.c || null,
      process: r.ap || null,
      kg: Number(u.kg) || 0,
      reservedKg: 0,
      location: u.loc || null,
      status: 'AVAILABLE',
      createdById: by,
    };
    const existing = mem.reuseStock.find((x) => x.ref === ref);
    if (existing) Object.assign(existing, rowData);
    else mem.reuseStock.push({ id: `rs-${mem.reuseStock.length + 1}`, ref, ...rowData });
  }
}

export async function handleLocalNestFallback(request: NextRequest, pathStr: string, bodyText?: string): Promise<NextResponse> {
  const mem = getDesksMemory();
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const actor = { id: 'u-admin', name: 'NFL Operations', roles: ['ADMIN'] };
  const body = bodyText ? JSON.parse(bodyText) : {};

  // --------------------------------------------------------------------------
  // A. /api/stores/:desk/*
  // --------------------------------------------------------------------------
  if (pathStr.startsWith('stores/')) {
    const parts = pathStr.split('/');
    const deskSlug = parts[1];
    const action = parts[2] || '';
    const desk = DESKS_MAP[deskSlug];
    if (!desk) return NextResponse.json({ message: 'Unknown store' }, { status: 400 });

    const ui = storeUiRolesOf(desk, actor.roles);
    const lines = desk === 'GREIGE' ? mem.greigeLines : mem.finishedLines;
    const currentSlices = mem.storeSlices[desk];

    if (method === 'GET' && action === 'bootstrap') {
      return NextResponse.json({
        user: { id: actor.id, name: actor.name, roles: actor.roles, uiRoles: ui },
        asOf: AS_OF_MAP[desk],
        lines,
        state: currentSlices,
      });
    }

    if (method === 'GET' && action === 'state') {
      return NextResponse.json({ state: currentSlices });
    }

    if (method === 'GET' && action === 'changes') {
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));
      return NextResponse.json(mem.storeChanges[desk].slice(0, limit));
    }

    if ((method === 'PUT' && action === 'state') || (method === 'POST' && action === 'demo')) {
      const demo = action === 'demo';
      if (demo && currentSlices.demoSeeded?.data) {
        return NextResponse.json({ message: 'Demo data was already loaded once' }, { status: 400 });
      }
      const names = Object.keys(body.slices || {});
      if (!names.length) return NextResponse.json({ message: 'Nothing to save' }, { status: 400 });
      for (const n of names) {
        if (!STORE_SLICES[desk].includes(n)) return NextResponse.json({ message: `Unknown slice ${n}` }, { status: 400 });
      }

      const conflicts = names.filter((n) => currentSlices[n].version !== Number(body.slices[n].version));
      if (conflicts.length) {
        return NextResponse.json(
          { message: `Someone else saved ${conflicts.join(', ')} first. The page will reload with the latest data.`, conflicts },
          { status: 409 }
        );
      }

      const after: Record<string, any> = {};
      for (const s of STORE_SLICES[desk]) after[s] = names.includes(s) ? body.slices[s].data : currentSlices[s].data;
      const ctx: StoreCtx = { desk, ui, demo, lines, state: after, today: new Date().toISOString().slice(0, 10) };
      const errors = names.flatMap((n) => checkStoreSlice(n, currentSlices[n].data, body.slices[n].data, ctx));
      if (errors.length) {
        return NextResponse.json({ message: [...new Set(errors)].slice(0, 5).join(' · '), details: errors }, { status: 400 });
      }

      const beforeCopy = JSON.parse(JSON.stringify(currentSlices));
      const versions: Record<string, number> = {};
      for (const n of names) {
        const nextVer = currentSlices[n].version === 0 ? 1 : currentSlices[n].version + 1;
        currentSlices[n] = { version: nextVer, data: JSON.parse(JSON.stringify(body.slices[n].data)) };
        versions[n] = nextVer;
        mem.storeChanges[desk].unshift({
          id: `sc-${Date.now()}-${n}`,
          desk,
          slice: n,
          summary: `${n}${demo ? ' (demo)' : ''}`,
          actorId: actor.id,
          actorName: actor.name,
          createdAt: new Date().toISOString(),
        });
      }
      syncReuseStock(mem, desk, names, beforeCopy, after, lines, actor.id);
      return NextResponse.json({ ok: true, versions });
    }
  }

  // --------------------------------------------------------------------------
  // B. /api/dyeing/*
  // --------------------------------------------------------------------------
  if (pathStr.startsWith('dyeing/')) {
    const action = pathStr.split('/')[1] || '';
    const ui = dyeingUiRolesOf(actor.roles);
    const currentSlices = mem.dyeingSlices;

    if (method === 'GET' && action === 'bootstrap') {
      return NextResponse.json({
        user: { id: actor.id, name: actor.name, roles: actor.roles, uiRoles: ui },
        asOf: '2026-09-29',
        machines: DYEING_MACHINES,
        lines: mem.dyeingLines,
        state: currentSlices,
        sms: {},
      });
    }

    if (method === 'GET' && action === 'state') {
      return NextResponse.json({ state: currentSlices });
    }

    if (method === 'GET' && action === 'changes') {
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));
      return NextResponse.json(mem.dyeingChanges.slice(0, limit));
    }

    if (method === 'PUT' && action === 'state') {
      const names = Object.keys(body.slices || {});
      if (!names.length) return NextResponse.json({ message: 'Nothing to save' }, { status: 400 });
      for (const n of names) {
        if (!(DYEING_SLICES as readonly string[]).includes(n)) return NextResponse.json({ message: `Unknown slice ${n}` }, { status: 400 });
      }

      const conflicts = names.filter((n) => currentSlices[n].version !== Number(body.slices[n].version));
      if (conflicts.length) {
        return NextResponse.json(
          { message: `Someone else saved ${conflicts.join(', ')} first. The page will reload with the latest data.`, conflicts },
          { status: 409 }
        );
      }

      const after: Record<string, any> = {};
      for (const s of DYEING_SLICES) after[s] = names.includes(s) ? body.slices[s].data : currentSlices[s].data;
      const ids = new Map<string, string>();
      for (const l of mem.dyeingLines) {
        const ed = (after.edit as any)?.[l.id] || {};
        ids.set(l.id, `${ed.j ?? l.j}|${ed.c ?? l.c ?? l.it ?? ''}`);
      }
      const ctx: DyeingCtx = { ui, lineKey: (id: string) => ids.get(id) ?? null, state: after, sms: {} };
      const errors = names.flatMap((n) => checkDyeingSlice(n as DyeingSlice, currentSlices[n].data, body.slices[n].data, ctx));
      if (errors.length) {
        return NextResponse.json({ message: errors.slice(0, 5).join(' · '), details: errors }, { status: 400 });
      }

      const versions: Record<string, number> = {};
      for (const n of names) {
        const summary = summarizeDyeing(n as DyeingSlice, currentSlices[n].data, body.slices[n].data);
        const nextVer = currentSlices[n].version === 0 ? 1 : currentSlices[n].version + 1;
        currentSlices[n] = { version: nextVer, data: JSON.parse(JSON.stringify(body.slices[n].data)) };
        versions[n] = nextVer;
        mem.dyeingChanges.unshift({
          id: `dc-${Date.now()}-${n}`,
          slice: n,
          summary,
          actorId: actor.id,
          actorName: actor.name,
          createdAt: new Date().toISOString(),
        });
      }
      return NextResponse.json({ ok: true, versions });
    }
  }

  // --------------------------------------------------------------------------
  // C. /api/reuse/*
  // --------------------------------------------------------------------------
  if (pathStr.startsWith('reuse/')) {
    const sub = pathStr.slice('reuse/'.length);
    if (method === 'GET' && sub === 'stock') {
      const status = url.searchParams.get('status') || 'AVAILABLE';
      const store = url.searchParams.get('store');
      const fabricType = url.searchParams.get('fabricType');
      const construction = url.searchParams.get('construction');
      const colour = (url.searchParams.get('colour') || '').toLowerCase();
      const rows = mem.reuseStock.filter((r) => {
        if (r.status !== status) return false;
        if (store && r.store !== store) return false;
        if (fabricType && r.fabricType !== fabricType) return false;
        if (construction && r.construction !== construction) return false;
        if (colour && !String(r.colour || '').toLowerCase().includes(colour)) return false;
        return true;
      });
      const total = rows.reduce((a, r) => a + (Number(r.kg) || 0) - (Number(r.reservedKg) || 0), 0);
      return NextResponse.json({ total: Math.round(total), rows: rows.slice(0, 2000) });
    }

    if (method === 'GET' && sub === 'matches') {
      const fabric = url.searchParams.get('fabric') || '';
      if (!fabric) return NextResponse.json({ message: 'fabric is required' }, { status: 400 });
      const store = url.searchParams.get('store');
      const stock = mem.reuseStock.filter((r) => r.status === 'AVAILABLE' && (!store || r.store === store));
      return NextResponse.json(
        suggest(
          {
            fabric,
            gsm: url.searchParams.get('gsm'),
            dia: url.searchParams.get('dia'),
            composition: url.searchParams.get('composition'),
            colour: url.searchParams.get('colour'),
            process: url.searchParams.get('process'),
          },
          stock,
          40
        )
      );
    }

    if (method === 'POST' && sub === 'stock') {
      const row = {
        id: `rs-${mem.reuseStock.length + 1}`,
        status: 'AVAILABLE',
        reservedKg: 0,
        ...body,
        gsm: body.gsm ?? numOf(body.fabric) ?? null,
        fabricType: fabType(body.fabric),
        construction: fabConstruction(body.fabric),
        createdById: actor.id,
      };
      mem.reuseStock.push(row);
      return NextResponse.json(row);
    }

    if (method === 'PATCH' && sub.startsWith('stock/')) {
      const id = sub.slice('stock/'.length);
      const r = mem.reuseStock.find((x) => x.id === id);
      if (!r) return NextResponse.json({ message: 'Reuse stock not found' }, { status: 404 });
      if (body.status === 'NOT_REUSABLE' && !String(body.note || '').trim()) {
        return NextResponse.json({ message: 'Write why it is not reusable' }, { status: 400 });
      }
      r.status = body.status;
      if (body.note !== undefined) r.note = body.note;
      return NextResponse.json(r);
    }
  }

  return NextResponse.json({ message: `Unknown desk endpoint: ${pathStr}` }, { status: 404 });
}
