/**
 * Fabric reuse — pure rules (no database).
 * Owner's rule (29 Oct 2026): fabric left in the greige or finished fabric store must be used again before new
 * knitting / dyeing. When a merchandiser creates a fabric order sheet, matching reuse stock is suggested and
 * Central Planning can hold the approval until the stock is checked physically.
 *
 * A match needs: same fabric type and construction, GSM within ±5%, width close enough, the same composition when
 * both sides record it, and — for finished fabric, or yarn-dyed / melange greige — the same colour. AOP / print never
 * matches. Shade is always a physical check (a different dye lot never matches 100%).
 */
export type Fabric = { fabric?: string | null; composition?: string | null; gsm?: number | string | null; dia?: string | null; colour?: string | null; process?: string | null };
export type Match = { ok: true; score: number; why: string[]; warn: string[] } | { ok: false };

const s = (v: unknown) => String(v ?? '');
export const numOf = (v: unknown) => { const m = s(v).match(/\d+(\.\d+)?/); return m ? +m[0] : null; };

export function fabType(f: unknown) {
  const t = s(f).toLowerCase();
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
  const t = s(f).toLowerCase(); const m = t.match(/(\d)\s*x\s*(\d)/);
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
export const normColour = (c: unknown) => s(c).toLowerCase().replace(/\(.*?\)/g, '').replace(/[-–]\s*(aop|ad|adv).*/, '').replace(/\b(c-?n?\d+|\d{2}-\d{4}\s*tcx|tcx|tpx)\b/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
export const normComp = (c: unknown) => s(c).toLowerCase().replace(/\s+/g, '').replace(/organic|org|dtf/g, '');
const isPrint = (v: unknown) => /aop|print|discharge/i.test(s(v));
const isYarnColour = (f: unknown, c: unknown) => /y\/?d|stripe|melange|mel\b|avg|cvc|grindle/i.test(s(f) + ' ' + s(c));

export function matchScore(need: Fabric, have: Fabric, finished: boolean): Match {
  const why: string[] = [], warn: string[] = []; let score = 0;
  if (!need.fabric || fabType(need.fabric) !== fabType(have.fabric) || fabConstruction(need.fabric) !== fabConstruction(have.fabric)) return { ok: false };
  why.push(`${fabType(have.fabric)} · ${fabConstruction(have.fabric)}`); score += 30;
  const g1 = numOf(need.gsm), g2 = numOf(have.gsm);
  if (g1 && g2) { const d = Math.abs(g1 - g2) / g1; if (d > 0.05) return { ok: false }; score += d <= 0.02 ? 25 : 15; why.push(`GSM ${g2} for ${g1}`); } else warn.push('GSM not recorded');
  const d1 = numOf(need.dia), d2 = numOf(have.dia);
  if (d1 && d2) {
    const diff = d2 - d1;
    if (finished ? diff < -1 || diff > 6 : Math.abs(diff) > 2) return { ok: false };
    score += Math.abs(diff) <= 2 ? 15 : 8; why.push(`Dia ${d2}" for ${d1}"`);
  } else warn.push('Check width (dia)');
  if (need.composition && have.composition) { if (normComp(need.composition) !== normComp(have.composition)) return { ok: false }; score += 15; why.push('Same composition'); }
  else warn.push('Check composition / yarn');
  if (finished || isYarnColour(need.fabric, need.colour) || isYarnColour(have.fabric, have.colour)) {
    const c1 = normColour(need.colour), c2 = normColour(have.colour);
    if (!c1 || c1 !== c2) return { ok: false };
    score += 15; why.push(`Colour ${have.colour}`);
    if (finished) warn.push('Check shade against the standard (different dye lot)');
  }
  if (isPrint(need.colour) || isPrint(need.process) || isPrint(have.colour) || isPrint(have.process)) return { ok: false };
  return { ok: true, score, why, warn };
}

export type StockRow = Fabric & { id: string; store: string; jobNo?: string | null; kg: number; reservedKg: number };
export type Suggestion = { id: string; store: string; jobNo?: string | null; fabric?: string | null; gsm?: unknown; dia?: unknown; colour?: string | null; availableKg: number; score: number; why: string[]; warn: string[] };

/** Ranked matches for one requirement line. Greige matches any solid colour (it is dyed later); finished must match colour. */
export function suggest(need: Fabric, stock: StockRow[], limit = 5): Suggestion[] {
  const out: Suggestion[] = [];
  for (const r of stock) {
    const avail = Math.max(0, r.kg - r.reservedKg);
    if (avail < 2) continue;
    const m = matchScore(need, r, r.store === 'FINISHED');
    if (!m.ok) continue;
    out.push({ id: r.id, store: r.store, jobNo: r.jobNo, fabric: r.fabric, gsm: r.gsm, dia: r.dia, colour: r.colour, availableKg: Math.round(avail * 10) / 10, score: m.score + (r.store === 'FINISHED' ? 10 : 0), why: m.why, warn: m.warn });
  }
  return out.sort((a, b) => b.score - a.score || b.availableKg - a.availableKg).slice(0, limit);
}
