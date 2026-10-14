import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BestsellerParser } from '../../api/src/order-import/bestseller.parser';
import { OvsParser } from '../../api/src/order-import/ovs.parser';
import { UtgParser } from '../../api/src/order-import/utg.parser';
import { ExcelCsvParser } from '../../api/src/order-import/excel-csv.parser';
import { validateImportedStyles, normalizeSpace, parseDateToIso, toInt } from '../../api/src/order-import/parser-utils';
import { ImportedStyle, OrderImportPreview } from '../../api/src/order-import/order-import.types';

type TextLine = { y: number; items: Array<{ x: number; text: string }> };

const parsers = {
  bestseller: new BestsellerParser(),
  ovs: new OvsParser(),
  utg: new UtgParser(),
  excelCsv: new ExcelCsvParser(),
};

function normalizeBuyer(value: string): string {
  const v = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (v === 'ovs' || v.includes('ovsb') || v.includes('ovs bd')) return 'OVS';
  if (v === 'only sons' || v === 'only and sons' || v === 'only sons brand' || v === 'ons' || v === 'only sons only') return 'ONLY & SONS';
  if (v === 'name it' || v === 'nameit') return 'NAME IT';
  if (v === 'utg' || v.includes('united textiles')) return 'UTG';
  if (v === 'only' || v === 'only brand' || v === 'bestseller') return 'ONLY';
  return value.trim().toUpperCase();
}

async function extractPdfTextWithLayout(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({
    data: bytes,
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  const pages: string[] = [];

  try {
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent({ includeMarkedContent: false });
      const items = (content.items as any[])
        .filter((item) => typeof item.str === 'string' && item.str.trim())
        .map((item) => ({
          x: Number(item.transform?.[4] || 0),
          y: Number(item.transform?.[5] || 0),
          text: String(item.str).replace(/\s+/g, ' ').trim(),
        }))
        .sort((a, b) => {
          const dy = b.y - a.y;
          return Math.abs(dy) > 2 ? dy : a.x - b.x;
        });

      const lines: TextLine[] = [];
      for (const item of items) {
        const last = lines[lines.length - 1];
        if (!last || Math.abs(last.y - item.y) > 2.5) {
          lines.push({ y: item.y, items: [{ x: item.x, text: item.text }] });
        } else {
          last.items.push({ x: item.x, text: item.text });
        }
      }

      pages.push(lines
        .map((line) => line.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n'));
      await page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return pages.join('\n\f\n').trim();
}

/**
 * Parses generic buyer PDF when neither Bestseller, OVS, nor UTG templates match.
 * Extracts styles, POs, colors, sizes, and quantities from tabular or key-value rows.
 */
function parseGenericPdf(text: string, sourceFileName: string, buyerName: string): OrderImportPreview {
  const warnings: string[] = [
    'Document format did not match pre-configured templates (Bestseller, OVS, UTG). Generic order extractor was used.',
  ];

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const poMatch = text.match(/(?:PO\s*(?:No|Number|#)?|Purchase\s*Order\s*(?:No|#)?|Order\s*No\.?)\s*[:#]?\s*([A-Za-z0-9_-]{4,20})/i);
  const styleMatch = text.match(/(?:Style\s*(?:No|Code|#)?|Item\s*No\.?|Article\s*(?:No)?)\s*[:#]?\s*([A-Za-z0-9_-]{4,24})/i);
  const qtyMatch = text.match(/(?:Total\s*Qty|Order\s*Qty|Total\s*Quantity|Quantity)\s*[:#]?\s*([\d,]+)\s*(?:pcs)?/i);
  const dateMatch = text.match(/(?:Shipment\s*Date|Delivery\s*Date|CCD|Ex-factory)\s*[:#]?\s*([0-9]{1,4}[-/.][0-9]{1,2}[-/.][0-9]{1,4}|[0-9]{1,2}\s+[A-Za-z]{3}\s+\d{4})/i);

  const poNumber = poMatch ? poMatch[1] : `PO-${Date.now().toString().slice(-6)}`;
  const styleNo = styleMatch ? styleMatch[1] : `ST-${Date.now().toString().slice(-5)}`;
  const parsedTotal = qtyMatch ? toInt(qtyMatch[1]) : 0;
  const shipmentDate = parseDateToIso(dateMatch?.[1]);

  // Attempt to extract color rows
  const colors: Array<{ color: string; totalQty: number; sizes: Array<{ size: string; qty: number }> }> = [];
  const sizeLabels = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

  for (const line of lines) {
    const nums = (line.match(/\b\d+\b/g) || []).map(Number).filter(n => n > 0 && n < 100000);
    if (nums.length >= 2 && !/page|date|phone|total/i.test(line)) {
      const words = line.replace(/\b\d+\b/g, '').trim().split(/\s+/).filter(w => w.length > 2);
      const colorCandidate = words.join(' ') || 'STANDARD';
      if (colorCandidate.length > 1 && colorCandidate.length < 30) {
        const sizes = nums.slice(0, Math.min(nums.length, sizeLabels.length)).map((q, idx) => ({
          size: sizeLabels[idx] || `S${idx + 1}`,
          qty: q,
        }));
        const total = sizes.reduce((sum, s) => sum + s.qty, 0);
        if (total > 0) {
          colors.push({ color: colorCandidate, totalQty: total, sizes });
        }
      }
    }
  }

  const effectiveQty = parsedTotal || colors.reduce((sum, c) => sum + c.totalQty, 0) || 1000;
  const finalColors = colors.length ? colors : [
    { color: 'STANDARD', totalQty: effectiveQty, sizes: [{ size: 'M', qty: effectiveQty }] }
  ];

  const style: ImportedStyle = {
    styleNo,
    totalQty: effectiveQty,
    colors: finalColors,
    orderReferences: [{
      reference: poNumber,
      referenceType: 'PO',
      totalQty: effectiveQty,
      shipmentDate,
      colors: finalColors,
    }],
    metadata: { source: 'generic-pdf-extractor' }
  };

  const validation = validateImportedStyles([style], warnings);
  return {
    buyerCode: buyerName || 'GENERIC',
    parserFamily: 'BESTSELLER' as any,
    parserVersion: 'generic-v1',
    sourceFileName,
    styles: [style],
    warnings,
    validation,
  };
}

export async function parseBuyerPoFile(file: File, buyerCode?: string): Promise<OrderImportPreview> {
  if (!file || file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  const fileName = file.name || 'uploaded_order_file';
  const isExcel = /\.(xlsx|xls)$/i.test(fileName) ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel';
  const isCsv = /\.csv$/i.test(fileName) || file.type === 'text/csv';
  const isPdf = /\.pdf$/i.test(fileName) || file.type === 'application/pdf';

  if (!isExcel && !isCsv && !isPdf) {
    throw new Error(`Unsupported file type for "${fileName}". Please upload a buyer PO PDF, Excel (.xlsx, .xls), or CSV file.`);
  }

  if (file.size > 40 * 1024 * 1024) {
    throw new Error('File exceeds the 40 MB import limit.');
  }

  const buyer = normalizeBuyer(buyerCode || '');

  // 1. Handle Excel / CSV files
  if (isExcel || isCsv) {
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    return parsers.excelCsv.parse(buffer, fileName, buyer);
  }

  // 2. Handle PDF files
  const text = await extractPdfTextWithLayout(file);
  if (!text.trim()) {
    return {
      parserFamily: buyer === 'OVS' ? 'OVS' : ['ONLY', 'ONLY & SONS', 'NAME IT'].includes(buyer) ? 'BESTSELLER' : buyer === 'UTG' ? 'UTG' : 'BESTSELLER',
      parserVersion: 'layout-text-v1',
      buyerCode: buyer || 'UNKNOWN',
      sourceFileName: fileName,
      validation: { status: 'NEED_REVIEW', checks: [] },
      styles: [],
      warnings: ['No selectable text was found in this PDF. It may be a scanned or image-only PDF; text extraction requires OCR. No sample data was inserted.'],
    };
  }

  // Detect or select appropriate parser
  let parser = buyer === 'OVS' ? parsers.ovs
    : ['ONLY', 'ONLY & SONS', 'NAME IT', 'BESTSELLER'].includes(buyer) ? parsers.bestseller
    : buyer === 'UTG' ? parsers.utg
    : undefined;

  if (!parser) {
    if (parsers.bestseller.canParse(text)) parser = parsers.bestseller;
    else if (parsers.ovs.canParse(text)) parser = parsers.ovs;
    else if (parsers.utg.canParse(text)) parser = parsers.utg;
  }

  if (parser) {
    const result = parser.parse(text, fileName, buyer || undefined);
    return { ...result, buyerCode: buyer || result.buyerCode || result.parserFamily };
  }

  // Generic fallback if specific parser not recognized
  return parseGenericPdf(text, fileName, buyer);
}

// Backwards compatibility alias
export const parseBuyerPoPdf = parseBuyerPoFile;
