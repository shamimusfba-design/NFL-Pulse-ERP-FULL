import { BuyerPoParser, ImportedColor, ImportedOrderReference, ImportedSizeQty, ImportedStyle, OrderImportPreview } from './order-import.types';
import { aggregateColors, escapeRegExp, flexiblePhrase, normalizeSpace, parseDateToIso, toInt, validateImportedStyles } from './parser-utils';

interface EanRow { color: string; size: string; colorCode?: string; ean?: string }

export class BestsellerParser implements BuyerPoParser {
  readonly family = 'BESTSELLER' as const;
  readonly version = '1.0.0';

  canParse(text: string) {
    return /PURCHASE ORDER/i.test(text) && /BESTSELLER/i.test(text) && /Order no\./i.test(text);
  }

  parse(text: string, sourceFileName: string, buyerCode?: string): OrderImportPreview {
    const warnings: string[] = [];
    const orderMatches = [...text.matchAll(/Order no\.\s*([A-Z0-9-]+)/gi)];
    const firstByPo = new Map<string, number>();
    for (const m of orderMatches) if (!firstByPo.has(m[1])) firstByPo.set(m[1], m.index || 0);
    const poStarts = [...firstByPo.entries()].sort((a, b) => a[1] - b[1]);
    if (!poStarts.length) throw new Error('No Bestseller order numbers found');

    const refsByStyle = new Map<string, ImportedOrderReference[]>();
    const styleMeta = new Map<string, Partial<ImportedStyle>>();

    for (let i = 0; i < poStarts.length; i++) {
      const [poNumber, start] = poStarts[i];
      const end = i + 1 < poStarts.length ? poStarts[i + 1][1] : text.length;
      const block = text.slice(start, end);
      const firstPageEnd = block.indexOf('\f') >= 0 ? block.indexOf('\f') : Math.min(block.length, 9000);
      const firstPage = block.slice(0, firstPageEnd);
      const styleNo = firstPage.match(/Style Information[\s\S]{0,400}?No:\s*([A-Z0-9-]+)/i)?.[1]
        || block.match(/\bNo:\s*([0-9]{5,})\b/)?.[1]
        || 'UNKNOWN_STYLE';
      const qty = toInt(firstPage.match(/Quantity:\s*([\d,]+)\s*PCS/i)?.[1]);
      const collection = normalizeSpace(firstPage.match(/Collection\s+([^\n]+)/i)?.[1] || '');
      const orderType = normalizeSpace(firstPage.match(/Order stat\. type\s+([^\n]+)/i)?.[1] || '');
      const destination = normalizeSpace(firstPage.match(/Destination\s+([^\n]+)/i)?.[1] || '');
      const description = normalizeSpace(firstPage.match(/Name:\s*([^\n]+)/i)?.[1] || '');

      const dates = block.match(/Cargo closing date \(CCD\)[\s\S]{0,1200}?(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})/i);
      const eans = this.parseEanRows(block);
      const colors = this.parseOrderTotalColors(block, eans, warnings, poNumber);
      const colorTotal = colors.reduce((s, c) => s + c.totalQty, 0);
      const effectiveQty = qty || colorTotal;
      if (qty && colorTotal && qty !== colorTotal) warnings.push(`${poNumber}: PDF quantity ${qty} differs from parsed color total ${colorTotal}`);

      const ref: ImportedOrderReference = {
        reference: poNumber,
        referenceType: 'PO',
        totalQty: effectiveQty,
        ccd: parseDateToIso(dates?.[1]),
        cancelDate: parseDateToIso(dates?.[2]),
        destination: destination || undefined,
        colors,
        metadata: { collection: collection || undefined, orderType: orderType || undefined },
      };
      const list = refsByStyle.get(styleNo) || [];
      list.push(ref);
      refsByStyle.set(styleNo, list);
      if (!styleMeta.has(styleNo)) styleMeta.set(styleNo, { styleNo, styleDescription: description || undefined, collection: collection || undefined });
    }

    const styles: ImportedStyle[] = [...refsByStyle.entries()].map(([styleNo, orderReferences]) => {
      const colors = aggregateColors(orderReferences.flatMap((p) => p.colors));
      const totalQty = orderReferences.reduce((s, p) => s + p.totalQty, 0);
      return {
        styleNo,
        styleDescription: styleMeta.get(styleNo)?.styleDescription,
        collection: styleMeta.get(styleNo)?.collection,
        totalQty,
        colors,
        orderReferences,
      };
    });

    const validation = validateImportedStyles(styles, warnings);
    return { buyerCode, parserFamily: this.family, parserVersion: this.version, sourceFileName, styles, warnings, validation };
  }

  private parseEanRows(block: string): EanRow[] {
    const marker = block.search(/Colour\s+Variant name\s+Size\/Length\s+Colour code\s+EAN-No\./i);
    if (marker < 0) return [];
    const section = block.slice(marker);
    const rows: EanRow[] = [];
    const re = /^\s*(.+?)\s+(XXXL|XXL|XL|XS|S|M|L)\s+([A-Z0-9-]+(?:\s+TCX)?)\s+(\d{8,14})\s*$/gmi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section))) rows.push({ color: normalizeSpace(m[1]), size: m[2].toUpperCase(), colorCode: normalizeSpace(m[3]), ean: m[4] });
    return rows;
  }

  private parseOrderTotalColors(block: string, eans: EanRow[], warnings: string[], poNumber: string): ImportedColor[] {
    const start = block.search(/SUMMING UP THE PRODUCTION/i);
    if (start < 0) { warnings.push(`${poNumber}: ORDER TOTAL section not found`); return []; }
    const after = block.slice(start);
    const eanMarker = after.search(/Colour\s+Variant name\s+Size\/Length\s+Colour code\s+EAN-No\./i);
    const section = eanMarker >= 0 ? after.slice(0, eanMarker) : after.slice(0, 9000);
    const byColor = new Map<string, EanRow[]>();
    for (const row of eans) {
      const list = byColor.get(row.color) || [];
      list.push(row); byColor.set(row.color, list);
    }
    const results: ImportedColor[] = [];
    for (const [color, rows] of byColor.entries()) {
      const sizes = [...new Set(rows.map((x) => x.size))];
      const colorPattern = flexiblePhrase(color);
      const valuePattern = Array.from({ length: sizes.length + 1 }, () => '(\\d+)').join('\\s+');
      const re = new RegExp(`${colorPattern}\\s+[A-Za-z][A-Za-z\\s-]*?\\s+${valuePattern}`, 'i');
      let m = section.match(re);
      // Some Bestseller PDFs wrap a long color name around the numeric row
      // (e.g. "Light Grey" before the row and "Melange" after it).
      // If the full name cannot be matched, use a unique leading phrase only
      // inside the ORDER TOTAL section and still validate the resulting totals.
      if (!m) {
        const prefix = color.split(/\s+/).slice(0, Math.min(2, color.split(/\s+/).length)).join(' ');
        const fallback = new RegExp(`${flexiblePhrase(prefix)}[\\s\\S]{0,140}?${valuePattern}`, 'i');
        m = section.match(fallback);
      }
      if (!m) continue;
      const nums = m.slice(1).map(Number);
      const totalQty = nums[nums.length - 1];
      const sizeRows: ImportedSizeQty[] = sizes.map((size, idx) => ({
        size,
        qty: nums[idx] || 0,
        ean: rows.find((x) => x.size === size)?.ean,
      }));
      results.push({ color, colorCode: rows[0]?.colorCode, totalQty, sizes: sizeRows });
    }
    if (!results.length) warnings.push(`${poNumber}: color/size rows could not be parsed automatically`);
    return results;
  }
}
