/**
 * Planning approvals — pure rules (no database), so they can be unit-tested.
 * Agreed rule (docs/CURRENT_AGREED_RULES.md): the physical T&A plan and fabric order sheet are printed and signed
 * outside the ERP. Planning records that the signed copy was received BEFORE the final approval click.
 * Final approval releases the fabric requirement by colour / part to Knitting.
 */
export type CadPart = { part: string; fabric?: string; gsm?: number | string; comp?: string; consKgDz?: number | string };
export type ReleaseLine = { colour: string; colourCode?: string; part?: string; fabric: string; gsm?: string; composition?: string; finishKg: number };
export type DocKey = 'FABRIC_SHEET' | 'TNA';

const n = (v: unknown) => { const x = parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };
const r1 = (x: number) => Math.round(x * 10) / 10;

/** Colour-wise order quantity from size breakdown rows. Keeps first-seen colour order. */
export function colourQty(rows: Array<{ color: string; qty?: number | null }>) {
  const m = new Map<string, number>();
  for (const b of rows) { const c = String(b.color || '').trim(); if (c) m.set(c, (m.get(c) || 0) + n(b.qty)); }
  return [...m.entries()].map(([colour, qty]) => ({ colour, qty }));
}

/** Draft knitting release: every colour × every fabric part, finish kg = colour qty / 12 × consumption kg/dz. */
export function releaseDraft(colours: Array<{ colour: string; qty: number }>, parts: CadPart[], codes: Record<string, string> = {}): ReleaseLine[] {
  const out: ReleaseLine[] = [];
  for (const c of colours) for (const p of parts) {
    const kg = r1((c.qty / 12) * n(p.consKgDz));
    if (kg <= 0) continue;
    out.push({ colour: c.colour, colourCode: codes[c.colour] || undefined, part: p.part || undefined, fabric: String(p.fabric || p.part || 'Fabric'), gsm: p.gsm != null && p.gsm !== '' ? String(p.gsm) : undefined, composition: p.comp || undefined, finishKg: kg });
  }
  return out;
}

/** Checks Planning's (possibly edited) release lines against the approved fabric order sheet. */
export function checkRelease(lines: ReleaseLine[], approvedFinishKg: number) {
  const errors: string[] = [];
  if (!lines.length) errors.push('Add at least one fabric line to release');
  lines.forEach((l, i) => {
    if (!String(l.colour || '').trim()) errors.push(`Line ${i + 1}: colour is required`);
    if (!String(l.fabric || '').trim()) errors.push(`Line ${i + 1}: fabric is required`);
    if (!(n(l.finishKg) > 0)) errors.push(`Line ${i + 1}: finish fabric kg must be more than 0`);
  });
  const total = r1(lines.reduce((a, l) => a + n(l.finishKg), 0));
  // more than 5% above the approved sheet needs a corrected fabric order sheet, not a silent change at release
  if (approvedFinishKg > 0 && total > approvedFinishKg * 1.05) errors.push(`Release total ${total} kg is more than 5% above the approved fabric order sheet (${approvedFinishKg} kg)`);
  const warnings = approvedFinishKg > 0 && Math.abs(total - approvedFinishKg) > approvedFinishKg * 0.01 ? [`Release total ${total} kg differs from the approved sheet (${approvedFinishKg} kg)`] : [];
  return { ok: errors.length === 0, errors, warnings, total };
}

/** Whole days a document has waited with Planning. */
export function ageDays(since: Date | string | null | undefined, now = new Date()) {
  if (!since) return 0;
  return Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 86400000));
}

/** What Planning must do next for one bulk job, in the order they do it. */
export function nextAction(x: { fabric: string; tna: string; fabricSigned: boolean; tnaSigned: boolean; tnaGenerated: boolean; descMissing: boolean; released: boolean }) {
  if (x.fabric === 'SENT' && !x.fabricSigned) return 'Receive signed fabric order sheet';
  if (x.fabric === 'SENT') return 'Approve fabric order sheet';
  if (x.tna === 'SENT' && !x.tnaGenerated) return 'Generate TNA';
  if (x.tna === 'SENT' && !x.tnaSigned) return 'Receive signed TNA';
  if (x.tna === 'SENT') return 'Approve TNA';
  if (x.fabric === 'DONE' && x.tna === 'DONE' && !x.released) return 'Release to knitting';
  if (x.descMissing) return 'Write item and print/emb description';
  return '';
}
