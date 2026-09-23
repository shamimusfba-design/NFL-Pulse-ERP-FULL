import { ImportedColor, ImportValidation, ImportedStyle } from './order-import.types';

export const normalizeSpace = (value: string) => value.replace(/\s+/g, ' ').trim();
export const toInt = (value: string | undefined) => Number((value || '0').replace(/,/g, '')) || 0;
export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const flexiblePhrase = (value: string) => value.trim().split(/\s+/).map(escapeRegExp).join('\\s+');

export function parseDateToIso(value?: string): string | undefined {
  if (!value) return undefined;
  const v = normalizeSpace(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dotted = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dotted) {
    const year = dotted[3].length === 2 ? `20${dotted[3]}` : dotted[3];
    return `${year}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`;
  }
  const named = new Date(v);
  if (!Number.isNaN(named.getTime())) return named.toISOString().slice(0, 10);
  return undefined;
}

export function aggregateColors(colors: ImportedColor[]): ImportedColor[] {
  const byColor = new Map<string, ImportedColor>();
  for (const color of colors) {
    const key = `${color.color}|||${color.colorCode || ''}`;
    let target = byColor.get(key);
    if (!target) {
      target = { color: color.color, colorCode: color.colorCode, totalQty: 0, sizes: [] };
      byColor.set(key, target);
    }
    target.totalQty += color.totalQty;
    const bySize = new Map(target.sizes.map((x) => [x.size, x]));
    for (const size of color.sizes) {
      const existing = bySize.get(size.size);
      if (existing) {
        existing.qty += size.qty;
        if (!existing.ean && size.ean) existing.ean = size.ean;
      } else {
        const next = { ...size };
        target.sizes.push(next);
        bySize.set(next.size, next);
      }
    }
  }
  return [...byColor.values()];
}

export function validateImportedStyles(styles: ImportedStyle[], extraWarnings: string[] = []): ImportValidation {
  const checks: ImportValidation['checks'] = [];
  for (const style of styles) {
    const styleColorTotal = style.colors.reduce((s, c) => s + c.totalQty, 0);
    checks.push({
      code: 'STYLE_COLOR_TOTAL',
      ok: styleColorTotal === style.totalQty,
      message: `${style.styleNo}: color total ${styleColorTotal} ${styleColorTotal === style.totalQty ? '=' : '≠'} style total ${style.totalQty}`,
    });
    for (const color of style.colors) {
      const sizeTotal = color.sizes.reduce((s, x) => s + x.qty, 0);
      checks.push({
        code: 'COLOR_SIZE_TOTAL',
        ok: sizeTotal === color.totalQty,
        message: `${style.styleNo} / ${color.color}: size total ${sizeTotal} ${sizeTotal === color.totalQty ? '=' : '≠'} color total ${color.totalQty}`,
      });
    }
    const refTotal = style.orderReferences.reduce((s, p) => s + p.totalQty, 0);
    if (style.orderReferences.length) {
      checks.push({
        code: 'ORDER_REFERENCE_TOTAL',
        ok: refTotal === style.totalQty,
        message: `${style.styleNo}: order-reference total ${refTotal} ${refTotal === style.totalQty ? '=' : '≠'} style total ${style.totalQty}`,
      });
    }
  }
  if (extraWarnings.length) {
    checks.push({ code: 'PARSER_WARNINGS', ok: false, message: `${extraWarnings.length} parser warning(s) require review` });
  }
  return { status: checks.every((x) => x.ok) ? 'VALIDATED' : 'NEED_REVIEW', checks };
}
