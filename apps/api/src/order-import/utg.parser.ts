import { BuyerPoParser, ImportedStyle, OrderImportPreview } from './order-import.types';
import { normalizeSpace, parseDateToIso, toInt, validateImportedStyles } from './parser-utils';

export class UtgParser implements BuyerPoParser {
  readonly family = 'UTG' as const;
  readonly version = '0.1.0-photo-spec';

  canParse(text: string) {
    return /Production Card/i.test(text) && /\bUTG\b/i.test(text);
  }

  parse(text: string, sourceFileName: string, buyerCode?: string): OrderImportPreview {
    const warnings: string[] = ['UTG parser is based on the supplied Production Card photo and must be verified against a full UTG PDF before production use.'];
    const productionCardNo = normalizeSpace(text.match(/No\.\s*([A-Z0-9-]+)/i)?.[1] || '');
    const orderNo = normalizeSpace(text.match(/Order No\.\s*([A-Z0-9-]+)/i)?.[1] || '');
    const customerOrderNo = normalizeSpace(text.match(/Customers? Order No\.\s*([A-Z0-9-]+)/i)?.[1] || '');
    const itemLine = text.match(/Item No\.\s*([A-Z0-9-]+)\s+([A-Z0-9-]+)/i);
    const itemNo = itemLine?.[1] || '';
    const styleRef = itemLine?.[2] || itemNo || productionCardNo || 'UNKNOWN_STYLE';
    const qty = toInt(text.match(/Pcs\.\s*([\d,]+)/i)?.[1]);
    const plannedStart = parseDateToIso(text.match(/Planned Start\s*([0-9.\/-]+)/i)?.[1]);
    const plannedEnd = parseDateToIso(text.match(/Planned End\s*([0-9.\/-]+)/i)?.[1]);
    const expectedDate = parseDateToIso(text.match(/Expected Date\s*([0-9.\/-]+)/i)?.[1]);

    const colorRow = text.match(/(\d{4})\s+([A-Za-z ]+?)\s+(\d{2}-\d{4}\s*TCX)\s+[A-Z0-9-]+\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);
    const color = colorRow ? normalizeSpace(colorRow[2]) : 'NEED REVIEW';
    const sizes = ['XS', 'S', 'M', 'L', 'XL'].map((size, idx) => ({ size, qty: colorRow ? Number(colorRow[4 + idx]) : 0 }));
    const parsedColorTotal = sizes.reduce((s, x) => s + x.qty, 0);
    const totalQty = qty || parsedColorTotal;
    const importedColor = { color, colorCode: colorRow ? `${colorRow[1]} ${normalizeSpace(colorRow[3])}` : undefined, totalQty: parsedColorTotal || totalQty, sizes };

    const style: ImportedStyle = {
      styleNo: styleRef,
      totalQty,
      colors: [importedColor],
      orderReferences: [{
        reference: customerOrderNo || orderNo || productionCardNo || styleRef,
        referenceType: customerOrderNo ? 'CUSTOMER_ORDER' : 'ORDER',
        totalQty,
        colors: [importedColor],
        metadata: { productionCardNo, orderNo, customerOrderNo, itemNo, plannedStart, plannedEnd, expectedDate },
      }],
      metadata: { productionCardNo, orderNo, customerOrderNo, itemNo, plannedStart, plannedEnd, expectedDate },
    };
    const styles = [style];
    const validation = validateImportedStyles(styles, warnings);
    return { buyerCode: buyerCode || 'UTG', parserFamily: this.family, parserVersion: this.version, sourceFileName, styles, warnings, validation };
  }
}
