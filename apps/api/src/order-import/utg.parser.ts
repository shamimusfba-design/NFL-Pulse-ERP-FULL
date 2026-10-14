import { BuyerPoParser, ImportedColor, ImportedStyle, OrderImportPreview } from './order-import.types';
import { normalizeSpace, parseDateToIso, toInt, validateImportedStyles } from './parser-utils';

export class UtgParser implements BuyerPoParser {
  readonly family = 'UTG' as const;
  readonly version = '1.0.0-production-card';

  canParse(text: string) {
    return /Production Card/i.test(text) && /\bUTG\b/i.test(text) && /Order No\./i.test(text);
  }

  parse(text: string, sourceFileName: string, buyerCode?: string): OrderImportPreview {
    const warnings: string[] = [];
    const productionCardNo = normalizeSpace(text.match(/^\s*No\.\s+([^\s]+)/mi)?.[1] || '');
    const orderNo = normalizeSpace(text.match(/^\s*Order No\.\s+([^\s]+)/mi)?.[1] || '');
    const customerOrderNo = normalizeSpace(text.match(/^\s*Customers? Order No\.\s+([^\s]+)/mi)?.[1] || '');
    const itemMatch = text.match(/^\s*Item No\.\s+(\S+)\s+(.+?)\s*$/mi);
    const itemNo = normalizeSpace(itemMatch?.[1] || '');
    const styleDescription = normalizeSpace(itemMatch?.[2] || '');
    const styleNo = itemNo || orderNo || productionCardNo || 'UNKNOWN_STYLE';
    const tariffNo = normalizeSpace(text.match(/^\s*Tariff No\.\s+([^\s]+)/mi)?.[1] || '');
    const plannedStart = parseDateToIso(text.match(/Planned Start\s+([0-9.\/-]+)/i)?.[1]);
    const plannedEnd = parseDateToIso(text.match(/Planned End\s+([0-9.\/-]+)/i)?.[1]);
    const expectedDate = parseDateToIso(text.match(/Expected Date\s+([0-9.\/-]+)/i)?.[1]);
    const totalQty = toInt(text.match(/^\s*Pcs\.\s+([\d,]+)/mi)?.[1]);
    const priceMatch = text.match(/Price\s+([\d,.]+)\s+([A-Z]{3})/i);
    const price = priceMatch ? Number(priceMatch[1].replace(',', '.')) : undefined;
    const currency = priceMatch?.[2]?.toUpperCase();

    const { sizes, colors } = this.parseColorSize(text);
    const parsedTotal = colors.reduce((s, c) => s + c.totalQty, 0);
    if (!colors.length) warnings.push('UTG Production Card color/size grid could not be parsed automatically.');
    if (totalQty && parsedTotal && totalQty !== parsedTotal) warnings.push(`UTG order ${orderNo || styleNo}: Pcs ${totalQty} differs from parsed color/size total ${parsedTotal}.`);
    const effectiveTotal = totalQty || parsedTotal;

    const orderRef = orderNo || customerOrderNo || productionCardNo || styleNo;
    const style: ImportedStyle = {
      styleNo,
      styleDescription: styleDescription || undefined,
      totalQty: effectiveTotal,
      colors,
      orderReferences: [{
        reference: orderRef,
        referenceType: 'ORDER',
        totalQty: effectiveTotal,
        shipmentDate: expectedDate,
        colors,
        metadata: {
          productionCardNo: productionCardNo || undefined,
          orderNo: orderNo || undefined,
          customerOrderNo: customerOrderNo || undefined,
          itemNo: itemNo || undefined,
          plannedStart,
          plannedEnd,
          expectedDate,
          tariffNo: tariffNo || undefined,
          price,
          currency,
          sizeColumns: sizes,
        },
      }],
      metadata: {
        productionCardNo: productionCardNo || undefined,
        orderNo: orderNo || undefined,
        customerOrderNo: customerOrderNo || undefined,
        itemNo: itemNo || undefined,
        plannedStart,
        plannedEnd,
        expectedDate,
        tariffNo: tariffNo || undefined,
        price,
        currency,
      },
    };
    const styles = [style];
    const validation = validateImportedStyles(styles, warnings);
    return {
      buyerCode: buyerCode || 'UTG',
      parserFamily: this.family,
      parserVersion: this.version,
      sourceFileName,
      styles,
      warnings,
      validation,
      sourceMetadata: { utgRule: 'Production Card Order No is the operational order/PO selector; Customers Order No is preserved as source metadata.' },
    };
  }

  private parseColorSize(text: string): { sizes: string[]; colors: ImportedColor[] } {
    const lines = text.split(/\r?\n/);
    const pcsIndex = lines.findIndex(line => /^\s*Pcs\.\s+/i.test(line));
    if (pcsIndex < 0) return { sizes: [], colors: [] };

    let sizes: string[] = [];
    let headerIndex = -1;
    for (let i = pcsIndex + 1; i < Math.min(lines.length, pcsIndex + 10); i++) {
      const tokens = lines[i].trim().split(/\s+/).filter(Boolean);
      const sizeTokens = tokens.filter(t => /^(?:XXXS|XXS|XS|S|M|L|XL|2XL|3XL|4XL|5XL|\d{2,3}\/\d{2,3}|\d+-\d+Y)$/i.test(t));
      if (sizeTokens.length >= 3) {
        sizes = sizeTokens.map(x => x.toUpperCase());
        headerIndex = i;
        break;
      }
    }
    if (!sizes.length || headerIndex < 0) return { sizes: [], colors: [] };

    const colors: ImportedColor[] = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*Expected\s*$/i.test(line) || /^\s*Type\s+Pos/i.test(line)) break;
      const trimmed = line.trim();
      if (!trimmed) continue;
      const first = trimmed.match(/^(\d{4}(?:\/\d{4})?)\s+(.+)$/);
      if (!first) continue;

      const restTokens = first[2].trim().split(/\s+/);
      const trailing: number[] = [];
      let idx = restTokens.length - 1;
      let internalRef = '';
      if (idx >= 0 && !/^\d+$/.test(restTokens[idx])) {
        internalRef = restTokens[idx];
        idx--;
      }
      while (idx >= 0 && /^\d+$/.test(restTokens[idx]) && trailing.length < sizes.length) {
        trailing.unshift(Number(restTokens[idx]));
        idx--;
      }
      if (!trailing.length) continue;
      const description = normalizeSpace(restTokens.slice(0, Math.max(0, idx + 1)).join(' '));
      const qtys = [...trailing, ...Array(Math.max(0, sizes.length - trailing.length)).fill(0)].slice(0, sizes.length);
      const total = qtys.reduce((s, n) => s + n, 0);
      colors.push({
        color: description || first[1],
        colorCode: first[1],
        totalQty: total,
        sizes: sizes.map((size, n) => ({ size, qty: qtys[n] || 0 })),
        metadata: { internalColorRef: internalRef || undefined },
      });
    }
    return { sizes, colors };
  }
}
