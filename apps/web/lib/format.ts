// NOS format standard (docs/UX-STANDARD.md): one date format, numbers always with commas and a unit.

/** 01.07.26 — the factory's own date format, used everywhere on screen. */
export function fmtDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${p(d.getFullYear() % 100)}`;
}

/** Thousands commas; decimals only where they carry meaning. */
export function fmtNum(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Number plus its unit: fmtQty(1477.3, 't', 1) -> "1,477.3 t". Units stay short: t, kg, pcs. */
export function fmtQty(value: number | null | undefined, unit: string, decimals = 0): string {
  const n = fmtNum(value, decimals);
  return n === '' ? '' : `${n} ${unit}`;
}

/** Both counts the owner always wants together: "42 jobs · 1,477 t". */
export function fmtJobsQty(jobs: number, qty: number, unit: string, decimals = 0): string {
  return `${fmtNum(jobs)} ${jobs === 1 ? 'job' : 'jobs'} · ${fmtQty(qty, unit, decimals)}`;
}

export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return `${fmtNum(value, decimals)}%`;
}

/** "▲ 4.2%" / "▼ 8" against the previous period. */
export function fmtDelta(value: number, opts: { unit?: string; decimals?: number } = {}): string {
  const { unit = '%', decimals = 1 } = opts;
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '—';
  return `${arrow} ${fmtNum(Math.abs(value), decimals)}${unit}`;
}
