import { BuyerPoParser, ImportedColor, ImportedOrderReference, ImportedSizeQty, ImportedStyle, OrderImportPreview } from './order-import.types';
import { aggregateColors, flexiblePhrase, normalizeSpace, parseDateToIso, toInt, validateImportedStyles } from './parser-utils';

interface EanRow { color: string; size: string; colorCode?: string; ean?: string }
interface PoAnchor { poNumber: string; firstOrderIndex: number; blockStart: number }

/**
 * BESTSELLER family parser (ONLY / NAME IT / ONLY & SONS).
 *
 * v1.3 changes:
 * - Keeps both style-level and exact PO-level Color × Size matrices.
 * - Any subset of POs can therefore be combined into a Production Lot without estimating quantities.
 * - Retains the column-oriented ORDER TOTAL + EAN reconstruction introduced in v1.2.
 * - CCD and Shipment Date are treated as the same operational date for this buyer.
 */
export class BestsellerParser implements BuyerPoParser {
  readonly family = 'BESTSELLER' as const;
  readonly version = '1.3.0-production-lot';

  canParse(text: string) {
    return /PURCHASE ORDER/i.test(text) && /Order no\./i.test(text)
      && (/BESTSELLER/i.test(text) || /Northern Fashions? (?:Ltd\.|Limited)/i.test(text));
  }

  parse(text: string, sourceFileName: string, buyerCode?: string): OrderImportPreview {
    const warnings: string[] = [];
    const anchors = this.findPoAnchors(text);
    if (!anchors.length) throw new Error('No Bestseller order numbers found');

    const refsByStyle = new Map<string, ImportedOrderReference[]>();
    const parsedColorsByStyle = new Map<string, ImportedColor[]>();
    const styleMeta = new Map<string, Partial<ImportedStyle>>();

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const end = i + 1 < anchors.length ? anchors[i + 1].blockStart : text.length;
      const block = text.slice(anchor.blockStart, end);
      const firstPage = block.slice(0, Math.min(block.length, 14000));

      const styleNo = this.parseStyleNo(firstPage) || 'UNKNOWN_STYLE';
      if (styleNo === 'UNKNOWN_STYLE') warnings.push(`${anchor.poNumber}: style number could not be read automatically`);

      const qty = toInt(firstPage.match(/Quantity:\s*([\d,]+)\s*PCS/i)?.[1]);
      const collection = normalizeSpace(firstPage.match(/Collection\s+([^\n]+)/i)?.[1] || '');
      const orderType = normalizeSpace(firstPage.match(/Order stat\. type\s+([^\n]+)/i)?.[1] || '');
      const destination = normalizeSpace(firstPage.match(/Destination\s+([^\n]+)/i)?.[1] || '');
      const description = this.parseStyleDescription(firstPage);
      const pricePerItem = this.parseMoney(firstPage.match(/Price per item:\s*([\d,.]+)\s*([A-Z]{3})?/i));
      const fabricComposition = normalizeSpace(firstPage.match(/Extended Composition[\s\S]{0,500}?Shell:\s*([^\n]+)/i)?.[1] || '');
      const descriptionComposition = normalizeSpace(firstPage.match(/\bLGM:\s*([^\n]+)/i)?.[1] || '');
      const manufacture = normalizeSpace(firstPage.match(/Manufacture:\s*([^\n]+)/i)?.[1] || '');
      const manufactureDetail = normalizeSpace(firstPage.match(/Manufacture Detail:\s*([^\n]+)/i)?.[1] || '');
      const sourceStyleEan = normalizeSpace(firstPage.match(/\bEAN:\s*(\d{8,14})/i)?.[1] || '');
      const yarnCount = normalizeSpace(firstPage.match(/\.YARN COUNT:\s*([^\n]+)/i)?.[1] || '');
      const fabricFamily = normalizeSpace(firstPage.match(/\.DTF\s*-\s*FABRIC FAMILY:\s*([^\n]+)/i)?.[1] || '');

      const ccd = this.parseFirstDateAfter(block, /Cargo closing date \(CCD\)/i);
      const cancelDate = this.parseFirstDateAfter(block, /Cancel date/i);

      const eans = this.parseEanRows(block);
      const poColors = this.parseOrderTotalColors(block, eans);
      const colorTotal = poColors.reduce((s, c) => s + c.totalQty, 0);
      const effectiveQty = qty || colorTotal;

      if (!effectiveQty) warnings.push(`${anchor.poNumber}: PO quantity could not be read automatically`);
      if (qty && colorTotal && qty !== colorTotal) {
        warnings.push(`${anchor.poNumber}: PDF quantity ${qty} differs from parsed overall row total ${colorTotal}`);
      }

      const parsedForStyle = parsedColorsByStyle.get(styleNo) || [];
      parsedForStyle.push(...poColors);
      parsedColorsByStyle.set(styleNo, parsedForStyle);

      // Keep PO-level Color × Size so Production Lots can select any subset of POs
      // and immediately aggregate the exact selected quantity. Style-level colors are
      // still aggregated below for the overall order summary.
      const ref: ImportedOrderReference = {
        reference: anchor.poNumber,
        referenceType: 'PO',
        totalQty: effectiveQty,
        ccd,
        shipmentDate: ccd,
        cancelDate,
        destination: destination || undefined,
        colors: poColors,
        metadata: {
          collection: collection || undefined,
          orderType: orderType || undefined,
          pricePerItem: pricePerItem?.amount,
          currency: pricePerItem?.currency,
          fabricComposition: fabricComposition || undefined,
        },
      };

      const list = refsByStyle.get(styleNo) || [];
      list.push(ref);
      refsByStyle.set(styleNo, list);

      if (!styleMeta.has(styleNo)) {
        styleMeta.set(styleNo, {
          styleNo,
          styleDescription: description || undefined,
          collection: collection || undefined,
          metadata: {
            pricePerItem: pricePerItem?.amount,
            currency: pricePerItem?.currency,
            fabricComposition: fabricComposition || undefined,
            descriptionComposition: descriptionComposition || undefined,
            manufacture: manufacture || undefined,
            manufactureDetail: manufactureDetail || undefined,
            sourceStyleEan: sourceStyleEan || undefined,
            yarnCount: yarnCount || undefined,
            fabricFamily: fabricFamily || undefined,
          },
        });
      }
    }

    const styles: ImportedStyle[] = [...refsByStyle.entries()].map(([styleNo, orderReferences]) => {
      const colors = aggregateColors(parsedColorsByStyle.get(styleNo) || []);
      const totalQty = orderReferences.reduce((s, p) => s + p.totalQty, 0);
      const colorTotal = colors.reduce((s, c) => s + c.totalQty, 0);
      if (colorTotal !== totalQty) {
        warnings.push(`${styleNo}: overall Color × Size total ${colorTotal} differs from style total ${totalQty}`);
      }
      return {
        styleNo,
        styleDescription: styleMeta.get(styleNo)?.styleDescription,
        collection: styleMeta.get(styleNo)?.collection,
        totalQty,
        colors,
        orderReferences,
        metadata: styleMeta.get(styleNo)?.metadata,
      };
    });

    const validation = validateImportedStyles(styles, warnings);
    return {
      buyerCode,
      parserFamily: this.family,
      parserVersion: this.version,
      sourceFileName,
      styles,
      warnings,
      validation,
      sourceMetadata: { detectedPoCount: anchors.length, breakdownScope: 'PO_AND_STYLE' },
    };
  }

  private findPoAnchors(text: string): PoAnchor[] {
    const firstByPo = new Map<string, number>();

    // Normal extraction: the value follows "Order no." directly. Require at
    // least one digit so header words such as "Collection" cannot be mistaken
    // for an order number on column-oriented PDF text.
    const direct = [...text.matchAll(/Order no\.\s*((?=[A-Z0-9-]*\d)[A-Z0-9-]+)/gi)];
    for (const m of direct) {
      const po = m[1];
      if (po) { const idx = m.index || 0; const existing = firstByPo.get(po); if (existing === undefined || idx < existing) firstByPo.set(po, idx); }
    }

    // Column-oriented extraction may print all header labels first and all values
    // afterwards. BESTSELLER order numbers are stable alpha+numeric tokens such
    // as NOF4754678, so discover those tokens near a PURCHASE ORDER page as a
    // fallback.
    const tokens = [...text.matchAll(/\bNOF\d{6,}\b/g)];
    for (const m of tokens) {
      const po = m[0];
      const idx = m.index || 0;
      const context = text.slice(Math.max(0, idx - 1800), Math.min(text.length, idx + 1800));
      if (!/Order no\.|PURCHASE ORDER/i.test(context)) continue;
      const existing = firstByPo.get(po);
      if (existing === undefined || idx < existing) firstByPo.set(po, idx);
    }

    const unique = [...firstByPo.entries()].sort((a, b) => a[1] - b[1]);
    return unique.map(([poNumber, firstOrderIndex]) => ({
      poNumber,
      firstOrderIndex,
      blockStart: this.findPageOneStart(text, firstOrderIndex),
    }));
  }

  private findPageOneStart(text: string, firstOrderIndex: number): number {
    const lookbackStart = Math.max(0, firstOrderIndex - 14000);
    const purchaseOrder = text.lastIndexOf('PURCHASE ORDER', firstOrderIndex);
    const subsupplier = text.lastIndexOf('Subsupplier', firstOrderIndex);

    // If Subsupplier belongs to the same page it must occur after that page's
    // PURCHASE ORDER marker. Otherwise it is from the previous PO and must not
    // become the block boundary.
    if (subsupplier >= lookbackStart && subsupplier > purchaseOrder) return subsupplier;
    if (purchaseOrder >= lookbackStart) return purchaseOrder;
    if (subsupplier >= lookbackStart) return subsupplier;
    return lookbackStart;
  }

  private parseStyleNo(firstPage: string): string | undefined {
    return firstPage.match(/Style Information[\s\S]{0,1400}?\bNo:\s*([A-Z0-9-]+)/i)?.[1]
      || firstPage.match(/\bNo:\s*([0-9]{5,})\s+(?:EAN:|Name:)/i)?.[1]
      || firstPage.match(/\bEAN:\s*\d{8,14}[\s\S]{0,250}?\bNo:\s*([A-Z0-9-]+)/i)?.[1];
  }

  private parseStyleDescription(firstPage: string): string {
    const multiLine = firstPage.match(/Name:\s*([\s\S]{1,260}?)(?=\s*Gender:|\s*Category:)/i)?.[1];
    if (multiLine) return normalizeSpace(multiLine);
    return normalizeSpace(firstPage.match(/Name:\s*([^\n]+)/i)?.[1] || '');
  }

  private parseMoney(match: RegExpMatchArray | null): { amount?: number; currency?: string } | undefined {
    if (!match) return undefined;
    const amount = Number((match[1] || '').replace(/,/g, ''));
    return { amount: Number.isFinite(amount) ? amount : undefined, currency: match[2]?.toUpperCase() };
  }

  private parseFirstDateAfter(block: string, marker: RegExp): string | undefined {
    const match = marker.exec(block);
    if (!match || match.index === undefined) return undefined;
    const window = block.slice(match.index + match[0].length, match.index + match[0].length + 12000);
    const date = window.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
    return parseDateToIso(date);
  }

  private parseEanRows(block: string): EanRow[] {
    const rowWise = this.parseRowWiseEans(block);
    if (rowWise.length) return rowWise;
    return this.parseColumnarEans(block);
  }

  private parseRowWiseEans(block: string): EanRow[] {
    const marker = block.search(/Colour\s+Variant name\s+Size\/Length\s+Colour code\s+EAN-No\./i);
    if (marker < 0) return [];
    const section = block.slice(marker);
    const rows: EanRow[] = [];
    const re = /^\s*(.+?)\s+(XXXL|XXL|XL|XS|S|M|L)\s+([A-Z0-9-]+(?:\s+TCX)?)\s+(\d{8,14})\s*$/gmi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(section))) {
      rows.push({ color: normalizeSpace(m[1]), size: m[2].toUpperCase(), colorCode: normalizeSpace(m[3]), ean: m[4] });
    }
    return rows;
  }

  /**
   * pdf-parse may serialize BESTSELLER tables column-by-column, e.g. all Color
   * values first, then all Size values, then all Colour Codes, then all EANs.
   * Rebuild the original rows by zipping those four columns.
   */
  private parseColumnarEans(block: string): EanRow[] {
    // Use the final EAN table in the PO. Earlier packing pages also contain
    // Size/Length headings, so taking the first one can point at the wrong table.
    const eanHeaderIndex = Math.max(block.lastIndexOf('EAN-No.'), block.lastIndexOf('EAN-No'));
    if (eanHeaderIndex < 0) return [];
    const sizeMarker = block.lastIndexOf('Size/Length', eanHeaderIndex);
    if (sizeMarker < 0) return [];

    const beforeSize = block.slice(Math.max(0, sizeMarker - 24000), sizeMarker);
    const colourMarker = beforeSize.lastIndexOf('Colour');
    const variantMarker = beforeSize.lastIndexOf('Variant name');
    if (colourMarker < 0 || variantMarker <= colourMarker) return [];

    const colorLines = this.cleanColumnLines(beforeSize.slice(colourMarker + 'Colour'.length, variantMarker))
      .filter((x) => !/^(total|length|business|model|color \+ variant name)$/i.test(x));
    if (!colorLines.length) return [];

    let tail = block.slice(eanHeaderIndex + (block.slice(eanHeaderIndex).match(/^EAN-No\.?/i)?.[0].length || 'EAN-No.'.length));
    const nextPurchase = tail.indexOf('\fPURCHASE ORDER');
    if (nextPurchase >= 0) tail = tail.slice(0, nextPurchase);

    const lines = this.cleanColumnLines(tail);
    const count = colorLines.length;
    const sizeLines = lines.filter((x) => /^(XXXL|XXL|XL|XS|S|M|L)$/i.test(x)).slice(0, count);
    const eanLines = lines.filter((x) => /^\d{8,14}$/.test(x)).slice(0, count);
    const codeLines = lines.filter((x) => {
      if (/^(XXXL|XXL|XL|XS|S|M|L)$/i.test(x)) return false;
      if (/^\d{8,14}$/.test(x)) return false;
      return /^[A-Z0-9-]+(?:\s+TCX)?$/i.test(x);
    }).slice(0, count);

    const actualCount = Math.min(count, sizeLines.length, codeLines.length, eanLines.length);
    if (!actualCount) return [];
    const rows: EanRow[] = [];
    for (let i = 0; i < actualCount; i++) {
      rows.push({
        color: normalizeSpace(colorLines[i]),
        size: sizeLines[i].toUpperCase(),
        colorCode: normalizeSpace(codeLines[i]),
        ean: eanLines[i],
      });
    }
    return rows;
  }

  private cleanColumnLines(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((x) => normalizeSpace(x))
      .filter(Boolean)
      .filter((x) => !/^(PURCHASE ORDER|NORTHERN FASHIONS? (?:LTD\.|LIMITED)|Print Date|Order no\.|Collection|Page)$/i.test(x));
  }

  private parseOrderTotalColors(block: string, eans: EanRow[]): ImportedColor[] {
    const rowWise = this.parseRowWiseOrderTotalColors(block, eans);
    const rowWiseValid = rowWise.length > 0 && rowWise.every((color) => color.sizes.reduce((sum, x) => sum + x.qty, 0) === color.totalQty);
    if (rowWiseValid) return rowWise;
    return this.parseColumnarOrderTotalColors(block, eans);
  }

  private parseRowWiseOrderTotalColors(block: string, eans: EanRow[]): ImportedColor[] {
    const start = block.search(/SUMMING UP THE PRODUCTION/i);
    if (start < 0 || !eans.length) return [];

    const after = block.slice(start);
    const eanMarker = after.search(/Colour\s+Variant name\s+Size\/Length\s+Colour code\s+EAN-No\./i);
    const section = eanMarker >= 0 ? after.slice(0, eanMarker) : after.slice(0, 12000);
    const byColor = this.groupEans(eans);
    const results: ImportedColor[] = [];

    for (const [color, rows] of byColor.entries()) {
      const sizes = [...new Set(rows.map((x) => x.size))];
      const colorPattern = flexiblePhrase(color);
      const valuePattern = Array.from({ length: sizes.length + 1 }, () => '(\\d+)').join('\\s+');
      const re = new RegExp(`${colorPattern}\\s+[A-Za-z][A-Za-z\\s-]*?\\s+${valuePattern}`, 'i');
      let m = section.match(re);
      if (!m) {
        const words = color.split(/\s+/);
        const prefix = words.slice(0, Math.min(2, words.length)).join(' ');
        const fallback = new RegExp(`${flexiblePhrase(prefix)}[\\s\\S]{0,180}?${valuePattern}`, 'i');
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
    return results;
  }

  /**
   * BESTSELLER ORDER TOTAL tables are frequently extracted column-wise:
   * all values for XS, then all for S, ... then all row totals, then grand totals.
   * Knowing the EAN color/size grid lets us reconstruct the matrix exactly.
   */
  private parseColumnarOrderTotalColors(block: string, eans: EanRow[]): ImportedColor[] {
    const start = block.search(/SUMMING UP THE PRODUCTION/i);
    if (start < 0 || !eans.length) return [];
    const orderTotalIndex = block.slice(start).search(/ORDER TOTAL/i);
    if (orderTotalIndex < 0) return [];
    const matrixStart = start + orderTotalIndex + 'ORDER TOTAL'.length;

    const sizeLengthIndex = block.slice(matrixStart).search(/\bSize\/Length\b/i);
    if (sizeLengthIndex < 0) return [];
    const matrixSection = block.slice(matrixStart, matrixStart + sizeLengthIndex);

    const byColor = this.groupEans(eans);
    const colors = [...byColor.keys()];
    const sizes: string[] = [];
    for (const row of eans) if (!sizes.includes(row.size)) sizes.push(row.size);
    const n = colors.length;
    const s = sizes.length;
    if (!n || !s) return [];

    const values = matrixSection
      .split(/\r?\n/)
      .map((x) => normalizeSpace(x))
      .filter((x) => /^\d[\d,]*$/.test(x))
      .map((x) => Number(x.replace(/,/g, '')))
      .filter((x) => Number.isFinite(x));

    // Expected: N values for each size column + N row totals + (S+1) grand totals.
    const bodyCount = n * (s + 1);
    const expected = bodyCount + (s + 1);
    if (values.length < bodyCount) return [];

    // If stray numeric labels are present, the useful matrix is normally the tail
    // immediately before the grand totals. Prefer exact expected length, otherwise
    // take the last expected/bodyCount values conservatively.
    const usable = values.length >= expected ? values.slice(values.length - expected, values.length - (s + 1)) : values.slice(0, bodyCount);
    if (usable.length < bodyCount) return [];

    const results: ImportedColor[] = colors.map((color, colorIdx) => {
      const rows = byColor.get(color) || [];
      const sizeRows: ImportedSizeQty[] = sizes.map((size, sizeIdx) => ({
        size,
        qty: usable[sizeIdx * n + colorIdx] || 0,
        ean: rows.find((x) => x.size === size)?.ean,
      }));
      const totalQty = usable[s * n + colorIdx] || sizeRows.reduce((sum, x) => sum + x.qty, 0);
      return { color, colorCode: rows[0]?.colorCode, totalQty, sizes: sizeRows };
    });

    // Only accept a reconstruction that internally reconciles.
    if (results.some((r) => r.sizes.reduce((sum, x) => sum + x.qty, 0) !== r.totalQty)) return [];
    return results;
  }

  private groupEans(eans: EanRow[]): Map<string, EanRow[]> {
    const byColor = new Map<string, EanRow[]>();
    for (const row of eans) {
      const list = byColor.get(row.color) || [];
      list.push(row);
      byColor.set(row.color, list);
    }
    return byColor;
  }
}
