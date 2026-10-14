import * as XLSX from 'xlsx';
import { BuyerPoParser, ImportedColor, ImportedOrderReference, ImportedStyle, OrderImportPreview } from './order-import.types';
import { aggregateColors, normalizeSpace, parseDateToIso, toInt, validateImportedStyles } from './parser-utils';

export class ExcelCsvParser {
  readonly family = 'GENERIC' as const;
  readonly version = '2.0.0-multi-format';

  parse(buffer: Buffer | Uint8Array, sourceFileName: string, buyerCode?: string): OrderImportPreview {
    const warnings: string[] = [];
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    if (!workbook.SheetNames.length) {
      throw new Error(`The file "${sourceFileName}" does not contain any readable sheets.`);
    }

    const detectedBuyer = this.detectBuyer(workbook, buyerCode);
    const stylesByNo = new Map<string, {
      styleNo: string;
      styleDescription?: string;
      collection?: string;
      season?: string;
      totalQty: number;
      colors: ImportedColor[];
      orderReferences: Map<string, ImportedOrderReference>;
      metadata?: Record<string, unknown>;
    }>();

    // Iterate through all sheets to support multi-sheet workbooks
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rawRows.length) continue;

      this.parseSheetRows(rawRows, sheetName, detectedBuyer, stylesByNo, warnings);
    }

    if (!stylesByNo.size) {
      warnings.push(`No structured purchase order rows could be recognized in "${sourceFileName}". Ensure column headers include Style, PO, Color, and Size/Qty.`);
      return {
        buyerCode: detectedBuyer,
        parserFamily: (detectedBuyer === 'OVS' ? 'OVS' : detectedBuyer === 'UTG' ? 'UTG' : 'BESTSELLER') as any,
        parserVersion: this.version,
        sourceFileName,
        styles: [],
        warnings,
        validation: {
          status: 'NEED_REVIEW',
          checks: [{ code: 'NO_RECORDS', ok: false, message: 'No styles or purchase order quantities were extracted from this file.' }]
        },
        sourceMetadata: { sheetCount: workbook.SheetNames.length, sheets: workbook.SheetNames }
      };
    }

    // Convert map to canonical styles array
    const styles: ImportedStyle[] = [];
    for (const entry of stylesByNo.values()) {
      const refs = Array.from(entry.orderReferences.values());
      const aggregatedColors = aggregateColors(refs.flatMap((r) => r.colors));
      const refTotal = refs.reduce((sum, r) => sum + r.totalQty, 0);
      const colorTotal = aggregatedColors.reduce((sum, c) => sum + c.totalQty, 0);
      const effectiveTotal = entry.totalQty || refTotal || colorTotal;

      styles.push({
        styleNo: entry.styleNo,
        styleDescription: entry.styleDescription,
        collection: entry.collection,
        season: entry.season,
        totalQty: effectiveTotal,
        colors: aggregatedColors.length ? aggregatedColors : entry.colors,
        orderReferences: refs,
        metadata: {
          ...entry.metadata,
          sourceSheetCount: workbook.SheetNames.length,
          sheets: workbook.SheetNames,
        }
      });
    }

    const validation = validateImportedStyles(styles, warnings);
    const parserFamily = detectedBuyer === 'OVS' ? 'OVS' : detectedBuyer === 'UTG' ? 'UTG' : 'BESTSELLER';

    return {
      buyerCode: detectedBuyer,
      parserFamily: parserFamily as any,
      parserVersion: this.version,
      sourceFileName,
      styles,
      warnings,
      validation,
      sourceMetadata: {
        detectedBuyer,
        sheetCount: workbook.SheetNames.length,
        sheets: workbook.SheetNames,
        parsedStyleCount: styles.length,
        parsedPoCount: styles.reduce((acc, s) => acc + s.orderReferences.length, 0),
      }
    };
  }

  private detectBuyer(workbook: XLSX.WorkBook, buyerCode?: string): string {
    if (buyerCode) {
      const b = buyerCode.trim().toUpperCase();
      if (b.includes('OVS')) return 'OVS';
      if (b.includes('UTG')) return 'UTG';
      if (b.includes('ONLY') || b.includes('BESTSELLER') || b.includes('NAME IT') || b.includes('JACK')) return 'BESTSELLER';
      return buyerCode.trim();
    }

    // Look inside first sheet for buyer indicators
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (firstSheet) {
      const csv = XLSX.utils.sheet_to_csv(firstSheet).toUpperCase();
      if (csv.includes('OVS') || csv.includes('46626 NORTHERN FASHION')) return 'OVS';
      if (csv.includes('UTG') || csv.includes('UNITED TEXTILES') || csv.includes('PRODUCTION CARD')) return 'UTG';
      if (csv.includes('BESTSELLER') || csv.includes('ONLY') || csv.includes('NAME IT') || csv.includes('JACK & JONES')) return 'BESTSELLER';
    }

    return 'BESTSELLER';
  }

  private parseSheetRows(
    rows: any[][],
    sheetName: string,
    buyer: string,
    stylesByNo: Map<string, any>,
    warnings: string[]
  ) {
    // 1. Locate header row
    let headerRowIdx = -1;
    let colIndices: Record<string, number> = {};
    let sizeCols: Array<{ index: number; size: string }> = [];

    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      const headers = row.map((cell) => normalizeSpace(String(cell || '')).toLowerCase());
      const hasStyle = headers.some((h) => /style|article|item\s*no|design/i.test(h));
      const hasPo = headers.some((h) => /po|order\s*no|reference|contract|market/i.test(h));
      const hasQty = headers.some((h) => /qty|quantity|total|pcs/i.test(h));
      const hasColor = headers.some((h) => /color|colour|shade|option/i.test(h));

      if ((hasStyle && (hasQty || hasColor)) || (hasPo && hasQty)) {
        headerRowIdx = r;
        colIndices = this.mapHeaderColumns(headers);
        sizeCols = this.findSizeColumns(row, colIndices);
        break;
      }
    }

    // If no explicit header row, try row 0
    if (headerRowIdx === -1 && rows.length > 1) {
      headerRowIdx = 0;
      const headers = rows[0].map((cell) => normalizeSpace(String(cell || '')).toLowerCase());
      colIndices = this.mapHeaderColumns(headers);
      sizeCols = this.findSizeColumns(rows[0], colIndices);
    }

    if (headerRowIdx === -1) return;

    // 2. Parse data rows
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.length) continue;

      const styleNo = normalizeSpace(String(this.getColVal(row, colIndices.style) || sheetName || 'STYLE-1'));
      if (!styleNo || /^total/i.test(styleNo)) continue;

      const poNo = normalizeSpace(String(this.getColVal(row, colIndices.po) || `PO-${styleNo}`));
      const description = normalizeSpace(String(this.getColVal(row, colIndices.description) || ''));
      const season = normalizeSpace(String(this.getColVal(row, colIndices.season) || ''));
      const collection = normalizeSpace(String(this.getColVal(row, colIndices.collection) || ''));
      const colorName = normalizeSpace(String(this.getColVal(row, colIndices.color) || 'STANDARD'));
      const colorCode = normalizeSpace(String(this.getColVal(row, colIndices.colorCode) || ''));
      const destination = normalizeSpace(String(this.getColVal(row, colIndices.destination) || ''));
      const dateVal = this.getColVal(row, colIndices.date);
      const deliveryDate = parseDateToIso(dateVal ? String(dateVal) : undefined);
      const rowTotalQty = toInt(String(this.getColVal(row, colIndices.totalQty)));

      // Collect size quantities
      const sizeBreakdown: Array<{ size: string; qty: number }> = [];
      if (sizeCols.length > 0) {
        for (const sc of sizeCols) {
          const q = toInt(String(row[sc.index] || '0'));
          if (q > 0) {
            sizeBreakdown.push({ size: sc.size, qty: q });
          }
        }
      } else if (colIndices.size !== undefined && colIndices.qty !== undefined) {
        const sizeName = normalizeSpace(String(row[colIndices.size] || 'M')).toUpperCase();
        const singleQty = toInt(String(row[colIndices.qty] || '0'));
        if (singleQty > 0) {
          sizeBreakdown.push({ size: sizeName, qty: singleQty });
        }
      }

      const calculatedTotal = sizeBreakdown.reduce((sum, s) => sum + s.qty, 0);
      const effectiveQty = calculatedTotal > 0 ? calculatedTotal : rowTotalQty;
      if (effectiveQty <= 0) continue;

      // Ensure style entry
      let styleEntry = stylesByNo.get(styleNo);
      if (!styleEntry) {
        styleEntry = {
          styleNo,
          styleDescription: description || undefined,
          season: season || undefined,
          collection: collection || undefined,
          totalQty: 0,
          colors: [],
          orderReferences: new Map(),
          metadata: { sheetName }
        };
        stylesByNo.set(styleNo, styleEntry);
      } else {
        if (!styleEntry.styleDescription && description) styleEntry.styleDescription = description;
        if (!styleEntry.season && season) styleEntry.season = season;
      }

      // Ensure order reference entry
      let refEntry = styleEntry.orderReferences.get(poNo);
      if (!refEntry) {
        const isOvs = buyer === 'OVS';
        refEntry = {
          reference: poNo,
          referenceType: isOvs ? 'MARKET' : 'PO',
          totalQty: 0,
          ccd: deliveryDate,
          shipmentDate: deliveryDate,
          destination: destination || undefined,
          market: isOvs ? poNo : (destination || undefined),
          colors: [],
          metadata: { sheetName }
        };
        styleEntry.orderReferences.set(poNo, refEntry);
      }

      // Add to reference colors
      const colorSizes = sizeBreakdown.length ? sizeBreakdown : [{ size: 'M', qty: effectiveQty }];
      refEntry.colors.push({
        color: colorName,
        colorCode: colorCode || undefined,
        totalQty: effectiveQty,
        sizes: colorSizes
      });
      refEntry.totalQty += effectiveQty;
      styleEntry.totalQty += effectiveQty;
    }
  }

  private mapHeaderColumns(headers: string[]): Record<string, number> {
    const indices: Record<string, number> = {};
    headers.forEach((h, idx) => {
      if (/style\s*no|style\s*code|article|item\s*no/i.test(h) && indices.style === undefined) indices.style = idx;
      else if (/^style$/i.test(h) && indices.style === undefined) indices.style = idx;
      else if (/po\s*no|po\s*number|order\s*no|purchase\s*order|contract|reference/i.test(h) && indices.po === undefined) indices.po = idx;
      else if (/^po$/i.test(h) && indices.po === undefined) indices.po = idx;
      else if (/desc|item\s*desc|product\s*name/i.test(h) && indices.description === undefined) indices.description = idx;
      else if (/season/i.test(h) && indices.season === undefined) indices.season = idx;
      else if (/collection/i.test(h) && indices.collection === undefined) indices.collection = idx;
      else if (/colou?r\s*code|tcx|shade\s*code/i.test(h) && indices.colorCode === undefined) indices.colorCode = idx;
      else if (/colou?r|shade|option/i.test(h) && indices.color === undefined) indices.color = idx;
      else if (/destination|country|market|ship\s*to/i.test(h) && indices.destination === undefined) indices.destination = idx;
      else if (/delivery|shipment|ship\s*date|ccd|ex-factory/i.test(h) && indices.date === undefined) indices.date = idx;
      else if (/total\s*qty|order\s*qty|total\s*pcs|^total$/i.test(h) && indices.totalQty === undefined) indices.totalQty = idx;
      else if (/^qty$|^quantity$/i.test(h) && indices.qty === undefined) indices.qty = idx;
      else if (/^size$/i.test(h) && indices.size === undefined) indices.size = idx;
    });
    return indices;
  }

  private findSizeColumns(row: any[], colIndices: Record<string, number>): Array<{ index: number; size: string }> {
    const sizeCols: Array<{ index: number; size: string }> = [];
    const sizeRegex = /^(?:XXS|XS|S|M|L|XL|XXL|2XL|XXXL|3XL|4XL|5XL|\d{2,3}(?:[/-]\d{2,3})?|\d+-\d+Y|\d+Y)$/i;

    row.forEach((cell, idx) => {
      // Don't mistake mapped columns for sizes
      if (Object.values(colIndices).includes(idx)) return;
      const str = normalizeSpace(String(cell || '')).toUpperCase();
      if (sizeRegex.test(str)) {
        sizeCols.push({ index: idx, size: str });
      }
    });

    return sizeCols;
  }

  private getColVal(row: any[], idx?: number) {
    if (idx === undefined || idx < 0 || idx >= row.length) return undefined;
    return row[idx];
  }
}
