import { BuyerPoParser, ImportedColor, ImportedStyle, OrderImportPreview } from './order-import.types';
import { normalizeSpace, parseDateToIso, toInt, validateImportedStyles } from './parser-utils';

interface OvsOption { colorId: string; color: string; colorCode: string }

export class OvsParser implements BuyerPoParser {
  readonly family = 'OVS' as const;
  readonly version = '1.0.0';

  canParse(text: string) {
    return /Style Code:/i.test(text) && /OVS BD/i.test(text) && /Main Supplier:/i.test(text);
  }

  parse(text: string, sourceFileName: string, buyerCode?: string): OrderImportPreview {
    const warnings: string[] = [];
    const styleNo = normalizeSpace(text.match(/Style Code:\s*([^\s]+)/i)?.[1] || 'UNKNOWN_STYLE');
    const styleDescription = normalizeSpace(text.match(/Style Description:\s*(.*?)\s+Creation Season:/i)?.[1] || '');
    const season = normalizeSpace(text.match(/Creation Season:\s*([^\s]+)/i)?.[1] || '');
    const collectionStyle = normalizeSpace(text.match(/Style Coll Id:\s*(\d+)/i)?.[1] || text.match(/COLLECTION STYLE\s*:\s*(\d+)/i)?.[1] || '');
    const lot = normalizeSpace(text.match(/Supply Lot:\s*(\d+)/i)?.[1] || text.match(/LOT\s*:\s*(\d+)/i)?.[1] || '');
    const totalQty = toInt(text.match(/Total Quantity:\s*([\d,]+)/i)?.[1]);
    const shipmentDate = parseDateToIso(text.match(/Shipment Date:\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+\d{4})/i)?.[1]);
    const inStoreDate = parseDateToIso(text.match(/In Store Date:\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+\d{4})/i)?.[1]);
    const supplierAgreedDate = parseDateToIso(text.match(/Supplier Agreed Date:\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+\d{4})/i)?.[1]);
    const meansOfTransport = normalizeSpace(text.match(/Means of Transport:\s*(SEA|AIR|TRUCK|ROAD|RAIL)/i)?.[1] || '');
    const departurePort = normalizeSpace(text.match(/Departure port:\s*(?:\d+\s+)?([A-Z ]+?)(?=\s{2,}|Comm Date:|$)/i)?.[1] || '');

    const options = this.parseTechnicalOptions(text);
    const colors = this.parseSummaryColors(text, options, warnings);
    const parsedTotal = colors.reduce((s, c) => s + c.totalQty, 0);
    const styleTotal = totalQty || parsedTotal;
    if (totalQty && parsedTotal && totalQty !== parsedTotal) warnings.push(`OVS style ${styleNo}: Total Quantity ${totalQty} differs from color total ${parsedTotal}`);
    if (!collectionStyle) warnings.push('OVS Collection Style was not found; order reference needs review');

    const style: ImportedStyle = {
      styleNo,
      styleDescription: styleDescription || undefined,
      season: season || undefined,
      totalQty: styleTotal,
      colors,
      orderReferences: [{
        reference: collectionStyle || styleNo,
        referenceType: collectionStyle ? 'COLLECTION_STYLE' : 'ORDER',
        totalQty: styleTotal,
        shipmentDate,
        colors,
        metadata: {
          lot: lot || undefined,
          supplierAgreedDate,
          inStoreDate,
          meansOfTransport: meansOfTransport || undefined,
          departurePort: departurePort || undefined,
          sourceRule: 'OVS has no explicit PO No. in this Product Brief; Collection Style is preserved as the buyer order reference.',
        },
      }],
      metadata: { collectionStyle: collectionStyle || undefined, lot: lot || undefined },
    };
    const styles = [style];
    const validation = validateImportedStyles(styles, warnings);
    return { buyerCode: buyerCode || 'OVS', parserFamily: this.family, parserVersion: this.version, sourceFileName, styles, warnings, validation };
  }

  private parseTechnicalOptions(text: string): OvsOption[] {
    const start = text.search(/TECHNICAL OPTIONS/i);
    if (start < 0) return [];
    const section = text.slice(start, Math.min(text.length, start + 8000));
    const re = /^\s*\d+\s+(.+?)\s+(\d{4})\s+(\d{2}-\d{4}\s+TCX)\s+/gmi;
    const options: OvsOption[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(section))) options.push({ color: normalizeSpace(m[1]), colorId: m[2], colorCode: `${m[2]} ${normalizeSpace(m[3])}` });
    return options;
  }

  private parseSummaryColors(text: string, options: OvsOption[], warnings: string[]): ImportedColor[] {
    const pageOneEnd = text.indexOf('\f') >= 0 ? text.indexOf('\f') : Math.min(text.length, 14000);
    const firstPage = text.slice(0, pageOneEnd);
    const results: ImportedColor[] = [];
    for (const option of options) {
      const codeOnly = option.colorCode.replace(`${option.colorId} `, '');
      const re = new RegExp(`(?:^|\\n)\\s*${option.colorId}\\s+${codeOnly.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[\\s\\S]{0,180}?\\s+(\\d{7})\\s+((?:\\d+\\s+){11}\\d+)`, 'i');
      const m = firstPage.match(re);
      if (!m) continue;
      const nums = m[2].trim().split(/\s+/).map(Number);
      const sizeValues = nums.slice(0, 5);
      const rowTotal = nums[5];
      results.push({
        color: option.color,
        colorCode: option.colorCode,
        totalQty: rowTotal,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'].map((size, idx) => ({ size, qty: sizeValues[idx] || 0 })),
        metadata: { itemCode: m[1], marketTotals: nums.slice(6) },
      });
    }
    if (!results.length) warnings.push('OVS page-1 color/size summary could not be parsed automatically');
    return results;
  }
}
