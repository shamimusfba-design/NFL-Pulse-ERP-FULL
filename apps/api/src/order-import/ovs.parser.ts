import { BuyerPoParser, ImportedColor, ImportedOrderReference, ImportedStyle, OrderImportPreview } from './order-import.types';
import { escapeRegExp, normalizeSpace, parseDateToIso, toInt, validateImportedStyles } from './parser-utils';

interface OvsOption { colorId: string; color: string; colorCode: string }

export class OvsParser implements BuyerPoParser {
  readonly family = 'OVS' as const;
  readonly version = '2.2.0-country-market-import';

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
    if (totalQty && parsedTotal && totalQty !== parsedTotal) warnings.push(`OVS style ${styleNo}: Total Quantity ${totalQty} differs from color total ${parsedTotal}.`);

    const markets = this.parseMarketAllocations(text, options, shipmentDate, colors, warnings);
    if (!markets.length) warnings.push('OVS Country/Market allocation could not be parsed; style total is available but market-wise selection needs review.');

    const marketTotal = markets.reduce((s, x) => s + x.totalQty, 0);
    if (marketTotal && styleTotal && marketTotal !== styleTotal) warnings.push(`OVS style ${styleNo}: Country/Market total ${marketTotal} differs from style total ${styleTotal}.`);

    const style: ImportedStyle = {
      styleNo,
      styleDescription: styleDescription || undefined,
      season: season || undefined,
      totalQty: styleTotal,
      colors,
      orderReferences: markets,
      metadata: {
        collectionStyle: collectionStyle || undefined,
        lot: lot || undefined,
        ovsPoRule: 'NO_TRADITIONAL_PO',
        allocationUnit: 'COUNTRY_MARKET',
        supplierAgreedDate,
        inStoreDate,
        meansOfTransport: meansOfTransport || undefined,
        departurePort: departurePort || undefined,
      },
    };
    const styles = [style];
    const validation = validateImportedStyles(styles, warnings);
    return {
      buyerCode: buyerCode || 'OVS', parserFamily: this.family, parserVersion: this.version,
      sourceFileName, styles, warnings, validation,
      sourceMetadata: { ovsPoRule: 'Style Code is the style identifier. There is no traditional PO; Country/Market is the operational allocation selector.' },
    };
  }

  private parseTechnicalOptions(text: string): OvsOption[] {
    const start = text.search(/TECHNICAL OPTIONS/i);
    if (start < 0) return [];
    const section = text.slice(start, Math.min(text.length, start + 9000));
    const re = /^\s*\d+\s+(.+?)\s+(\d{4})\s+(\d{2}-\d{4}\s+TCX)\s+/gmi;
    const options: OvsOption[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(section))) {
      const color = normalizeSpace(m[1]);
      if (!options.some(x => x.colorId === m![2])) options.push({ color, colorId: m[2], colorCode: `${m[2]} ${normalizeSpace(m[3])}` });
    }
    return options;
  }

  private parseSummaryColors(text: string, options: OvsOption[], warnings: string[]): ImportedColor[] {
    const pageOneEnd = text.indexOf('\f') >= 0 ? text.indexOf('\f') : Math.min(text.length, 16000);
    const firstPage = text.slice(0, pageOneEnd);
    const results: ImportedColor[] = [];
    const summaryStart = firstPage.search(/Total quantities per color size/i);
    const summarySection = summaryStart >= 0 ? firstPage.slice(summaryStart) : firstPage;

    for (const option of options) {
      const colorIdx = summarySection.search(new RegExp('\\b' + escapeRegExp(option.colorId) + '\\b'));
      if (colorIdx < 0) continue;
      const window = summarySection.slice(colorIdx, Math.min(summarySection.length, colorIdx + 1400));
      const itemCodeMatch = window.match(/\b(\d{7})\b/);
      if (!itemCodeMatch) {
        warnings.push('OVS ' + option.color + ': item code was not found in the page-1 summary.');
        continue;
      }

      const afterItem = window.slice((itemCodeMatch.index || 0) + itemCodeMatch[0].length);
      // Depending on the PDF extractor, table cells may be on one line or
      // emitted as separate lines. Read numeric cells until the next item code.
      const nextItemCode = afterItem.search(/\b\d{7}\b/);
      const rowText = nextItemCode >= 0 ? afterItem.slice(0, nextItemCode) : afterItem;
      const nums = (rowText.match(/\b\d+\b/g) || []).map(Number);
      if (nums.length < 12) {
        warnings.push('OVS ' + option.color + ': page-1 summary row is incomplete (expected size total and six market allocations).');
        continue;
      }

      const sizeValues = nums.slice(0, 5);
      const rowTotal = nums[5];
      if (sizeValues.reduce((sum, qty) => sum + qty, 0) !== rowTotal) {
        warnings.push('OVS ' + option.color + ': page-1 size quantities do not reconcile with color total.');
        continue;
      }
      results.push({
        color: option.color,
        colorCode: option.colorCode,
        totalQty: rowTotal,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'].map((size, idx) => ({ size, qty: sizeValues[idx] || 0 })),
        metadata: { itemCode: itemCodeMatch[1], marketTotals: nums.slice(6, 12) },
      });
    }

    if (!results.length) warnings.push('OVS page-1 color/size summary could not be parsed automatically.');
    return results;
  }

  private parseMarketAllocations(text: string, options: OvsOption[], defaultShipmentDate: string | undefined, summaryColors: ImportedColor[], warnings: string[]): ImportedOrderReference[] {
    // pdf-parse layout extraction does not reliably preserve form-feed/page separators.
    // Segment by the OVS HEADING markers themselves instead of treating the whole
    // document as one page. This is important because a Product Brief can contain
    // OVS ITALY + WARM + INDIA + MIDDLE EAST + COLD + REPL. HUB DUBAI in one PDF.
    const sections = this.findMarketSections(text);
    const refs: ImportedOrderReference[] = [];

    for (const { market, section } of sections) {
      const colorMap = new Map<string, ImportedColor>();
      for (const option of options) {
        const colorLine = new RegExp(`^\\s*${escapeRegExp(option.color)}\\s+\\d+[,.]\\d+\\s+\\$.*$`, 'gmi');
        let m: RegExpExecArray | null;
        while ((m = colorLine.exec(section))) {
          const slice = section.slice(m.index, Math.min(section.length, m.index + 1800));
          let qtyValues: number[] | null = null;
          for (const line of slice.split(/\r?\n/)) {
            const all = (line.match(/\b\d+\b/g) || []).map(Number);
            if (all.length < 6) continue;
            const v = all.slice(-6);
            if (v.slice(0, 5).reduce((sum, n) => sum + n, 0) === v[5]) { qtyValues = v; break; }
          }
          if (!qtyValues) continue;
          const nums = qtyValues;
          const existing = colorMap.get(option.color) || {
            color: option.color,
            colorCode: option.colorCode,
            totalQty: 0,
            sizes: ['S','M','L','XL','XXL'].map(size => ({ size, qty: 0 })),
            metadata: {},
          };
          existing.sizes = existing.sizes.map((x, i) => ({ ...x, qty: x.qty + nums[i] }));
          existing.totalQty += nums[5];
          colorMap.set(option.color, existing);
        }
      }

      const colors = Array.from(colorMap.values()).filter(c => c.totalQty > 0);
      if (!colors.length) {
        warnings.push(`OVS ${market}: market heading found but Color × Size allocation could not be parsed.`);
        continue;
      }
      const shipmentDate = parseDateToIso(section.match(/Shipment Date\s+([0-9]{1,2}\s+[A-Za-z]{3}\s+\d{4})/i)?.[1]) || defaultShipmentDate;
      refs.push({
        reference: this.marketReferenceName(market),
        referenceType: 'MARKET',
        market: this.marketReferenceName(market),
        destination: this.marketReferenceName(market),
        totalQty: colors.reduce((s, c) => s + c.totalQty, 0),
        shipmentDate,
        ccd: shipmentDate,
        colors,
        metadata: { sourceRule: 'OVS Product Brief Country/Market allocation; not a traditional PO.', sourceMarketHeading: market },
      });
    }

    const marketOrder = ['OVS ITALY','OVS WARM','OVS INDIA','OVS MIDDLE EAST','OVS COLD','REPL. HUB DUBAI'];
    refs.sort((a, b) => marketOrder.indexOf(String((a.metadata as any)?.sourceMarketHeading || '')) - marketOrder.indexOf(String((b.metadata as any)?.sourceMarketHeading || '')));

    // Validate each parsed market total against the page-1 market columns when available.
    if (summaryColors.length) {
      const expected = new Map<string, number>();
      marketOrder.forEach((name, idx) => expected.set(name, summaryColors.reduce((sum, color) => sum + Number((color.metadata as any)?.marketTotals?.[idx] || 0), 0)));
      for (const ref of refs) {
        const sourceMarket = String((ref.metadata as any)?.sourceMarketHeading || '');
        const exp = expected.get(sourceMarket);
        if (exp !== undefined && exp !== ref.totalQty) warnings.push(`OVS ${ref.reference}: parsed market total ${ref.totalQty} differs from page-1 market total ${exp}.`);
      }
    }
    return refs;
  }

  private findMarketSections(text: string): Array<{ market: string; section: string }> {
    const matches: Array<{ market: string; start: number }> = [];
    const headingRe = /HEADING\s*:?\s*(?:\d+\s*)?(OVS\s+ITALY|OVS\s+WARM|OVS\s+INDIA|OVS\s+MIDDLE(?:\s+EAST)?|OVS\s+COLD|REPL\.?\s*HUB(?:\s+DUBAI)?)/gi;
    let match: RegExpExecArray | null;
    while ((match = headingRe.exec(text))) {
      let market = this.cleanMarketName(match[1]);
      if (/^OVS\s+MIDDLE\b/.test(market)) market = 'OVS MIDDLE EAST';
      if (/^REPL\.?\s*HUB\b/.test(market)) market = 'REPL. HUB DUBAI';
      if (!matches.some(x => x.market === market && Math.abs(x.start - match!.index) < 50)) matches.push({ market, start: match.index });
    }

    matches.sort((a, b) => a.start - b.start);
    return matches.map((x, i) => ({
      market: x.market,
      section: text.slice(x.start, i + 1 < matches.length ? matches[i + 1].start : text.length),
    }));
  }

  private marketReferenceName(market: string) {
    // OVS has no conventional PO number: use the country/market label in the
    // reference field and retain the original PDF heading in metadata.
    const names: Record<string, string> = {
      'OVS ITALY': 'ITALY',
      'OVS INDIA': 'INDIA',
      'OVS WARM': 'WARM',
      'OVS COLD': 'COLD',
      'OVS MIDDLE EAST': 'MIDDLE EAST',
      'REPL. HUB DUBAI': 'DUBAI',
    };
    return names[market] || market;
  }

  private cleanMarketName(value: string) {
    return normalizeSpace(value).replace(/^\d+\s*/, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }
}
