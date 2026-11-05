// Shared number-parsing for count-up. Keeps the original formatting (commas, decimals, suffix).

const NUM_RE = /-?\d[\d,]*(?:\.\d+)?/;

export type ParsedNumber = { prefix: string; suffix: string; value: number; decimals: number; commas: boolean };

export function parseNumberText(text: string): ParsedNumber | null {
  const m = NUM_RE.exec(text);
  if (!m) return null;
  const raw = m[0];
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  return {
    prefix: text.slice(0, m.index),
    suffix: text.slice(m.index + raw.length),
    value,
    decimals,
    commas: raw.includes(','),
  };
}

export function formatNumberLike(p: ParsedNumber, v: number): string {
  const body = p.commas
    ? v.toLocaleString('en-US', { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : v.toFixed(p.decimals);
  return `${p.prefix}${body}${p.suffix}`;
}

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
