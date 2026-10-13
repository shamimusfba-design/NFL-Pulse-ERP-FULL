import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

type TextLine = { y: number; x: number; text: string };

function normalizeNumber(value: string): number {
  const n = Number(String(value || '').replace(/[,\s]/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizeBuyer(value: string): string {
  const v = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (v.includes('ovs')) return 'OVS';
  if (v.includes('only sons') || v === 'ons') return 'Only & Sons';
  if (v.includes('name it') || v.includes('nameit')) return 'Name It';
  if (v === 'utg' || v.includes('united textiles')) return 'UTG';
  if (v === 'only' || v.includes('only brand')) return 'ONLY';
  return value.trim() || 'Unknown';
}

async function extractPdfLines(file: File): Promise<string[]> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
  const output: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const items = (content.items as any[])
      .filter((item) => typeof item.str === 'string' && item.str.trim())
      .map((item) => ({ x: Number(item.transform?.[4] || 0), y: Number(item.transform?.[5] || 0), text: String(item.str).trim() }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: TextLine[] = [];
    for (const item of items) {
      let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5);
      if (!line) { line = { y: item.y, x: item.x, text: item.text }; lines.push(line); }
      else { line.text += ' ' + item.text; line.x = Math.min(line.x, item.x); }
    }
    lines.sort((a, b) => b.y - a.y || a.x - b.x);
    output.push(...lines.map((line) => line.text.replace(/\s+/g, ' ').trim()).filter(Boolean));
    await page.cleanup();
  }
  await pdf.destroy();
  return output;
}

function findValue(lines: string[], patterns: RegExp[]): string {
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of patterns) {
      const match = lines[i].match(pattern);
      if (match?.[1]) return match[1].trim();
      if (match?.[2]) return match[2].trim();
      if (pattern.test(lines[i]) && lines[i + 1] && lines[i + 1].length < 100) return lines[i + 1].trim();
    }
  }
  return '';
}

function parseQty(lines: string[]): number {
  const patterns = [
    /(?:total\s+order\s+qty|order\s+quantity|total\s+quantity|order\s+qty|total\s+qty|quantity\s+ordered|qty\s+ordered|order\s+units)\s*[:#=-]?\s*([\d,]+)/i,
    /(?:total\s+pcs|total\s+pieces|grand\s+total)\s*[:#=-]?\s*([\d,]+)/i
  ];
  for (const line of lines) for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) { const qty = normalizeNumber(match[1]); if (qty > 0) return qty; }
  }
  return 0;
}

function parseSizesAndColors(lines: string[]): any[] {
  const sizes = ['2XS','XXS','XS','S','M','L','XL','2XL','XXL','3XL','XXXL','4XL','5XL','6XL','ONE SIZE','ONESIZE'];
  const colors = new Map<string, any>();
  // Handle clearly labelled color/size rows, e.g. "Navy S 120 M 240 L 180".
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/^(page|total|grand total|order quantity|delivery|shipment|style no|style number|purchase order|po number)\b/i.test(line)) continue;
    const sizeMatches = [...line.matchAll(/\b(2XS|XXS|XS|S|M|L|XL|2XL|XXL|3XL|XXXL|4XL|5XL|6XL|ONE\s*SIZE|ONESIZE)\s*[:=]?\s*([\d,]+)\b/gi)];
    if (!sizeMatches.length) continue;
    const first = sizeMatches[0].index ?? 0;
    let color = line.slice(0, first).replace(/^[\s\-:|]+|[\s\-:|]+$/g, '').trim();
    color = color.replace(/\b(?:color|colour|size|qty|quantity|pcs|pieces|total)\b/ig, '').trim();
    if (!color || color.length > 60 || /^\d+$/.test(color)) continue;
    const key = color.toLowerCase();
    const existing = colors.get(key) || { color, colorCode: '', totalQty: 0, sizes: [] as any[] };
    for (const match of sizeMatches) {
      const size = String(match[1]).replace(/\s+/g, '').toUpperCase();
      const qty = normalizeNumber(match[2]);
      if (qty <= 0) continue;
      const current = existing.sizes.find((s: any) => s.size === size);
      if (current) current.qty += qty; else existing.sizes.push({ size, qty });
    }
    existing.totalQty = existing.sizes.reduce((sum: number, item: any) => sum + item.qty, 0);
    colors.set(key, existing);
  }
  return [...colors.values()].filter((color) => color.sizes.length);
}

function parseReferences(lines: string[], isOvs: boolean, colors: any[]): any[] {
  const refs: any[] = [];
  const seen = new Set<string>();
  const patterns = isOvs
    ? [/\b(?:market|country)\s*[:#-]?\s*([A-Z][A-Z .-]{1,30})/i, /\b(OVS\s+(?:GERMANY|FRANCE|ITALY|SPAIN|AUSTRIA|SWITZERLAND|BELGIUM|NETHERLANDS|PORTUGAL))\b/i]
    : [/\b(?:purchase\s*order|p\.?o\.?\s*(?:no\.?|number|#))\s*[:#-]?\s*([A-Z0-9][A-Z0-9\/-]{2,30})/i, /\b(\d{6,12})\b/];
  for (const line of lines) for (const pattern of patterns) {
    const match = line.match(pattern);
    const reference = match?.[1]?.trim();
    if (!reference || seen.has(reference.toLowerCase())) continue;
    if (/^(?:number|no|total|date|qty|quantity)$/i.test(reference)) continue;
    seen.add(reference.toLowerCase());
    refs.push({ reference, referenceType: isOvs ? 'MARKET' : 'PO', market: isOvs ? reference : '', totalQty: 0, shipmentDate: '', ccd: '', destination: '', colors: [] });
    break;
  }
  // Only attach a breakdown when the PDF text gave a single unambiguous color/size matrix.
  if (refs.length === 1 && colors.length) {
    refs[0].colors = colors.map((c) => ({ ...c, sizes: c.sizes.map((s: any) => ({ ...s })) }));
    refs[0].totalQty = refs[0].colors.reduce((sum: number, c: any) => sum + c.totalQty, 0);
  }
  return refs;
}

export async function parseBuyerPoPdf(file: File, buyerCode: string) {
  if (!file || file.size === 0) throw new Error('The selected PDF is empty.');
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('Please upload a PDF file.');
  const buyer = normalizeBuyer(buyerCode);
  const isOvs = buyer === 'OVS';
  const parserFamily = isOvs ? 'OVS' : buyer === 'ONLY' || buyer === 'Only & Sons' || buyer === 'Name It' ? 'Bestseller' : buyer;
  const lines = await extractPdfLines(file);
  const text = lines.join('\n');
  if (!text.trim()) {
    return { parserFamily, parserVersion: 'v3.0-pdf-text', validation: { status: 'NEED_REVIEW', checks: [] }, styles: [], warnings: ['No selectable text was found in this PDF. It may be a scanned/image-only PDF; OCR is required. No sample data was inserted.'] };
  }

  const styleNo = findValue(lines, [
    /(?:style\s*(?:no\.?|number|#|ref(?:erence)?)|item\s*(?:no\.?|number)|article\s*(?:no\.?|number))\s*[:#=-]?\s*([A-Z0-9][A-Z0-9._/-]{2,30})/i,
    /\b(?:style|article)\s*[:#=-]\s*([A-Z0-9][A-Z0-9._/-]{2,30})/i
  ]);
  const description = findValue(lines, [
    /(?:style\s*description|product\s*description|garment\s*description|article\s*description|product\s*name)\s*[:#=-]?\s*(.{3,100})/i
  ]);
  const totalQty = parseQty(lines);
  const colors = parseSizesAndColors(lines);
  const orderReferences = parseReferences(lines, isOvs, colors);
  const warnings: string[] = [];
  if (!styleNo) warnings.push('Style/article number was not confidently identified. Check the PDF and complete it before confirming.');
  if (!totalQty) warnings.push('Order quantity was not confidently identified from a labelled quantity field.');
  if (!colors.length) warnings.push('Color × Size breakdown could not be confidently extracted. It has not been fabricated; review or enter the matrix manually.');
  if (!orderReferences.length) warnings.push(isOvs ? 'Country/market allocations were not confidently identified.' : 'PO/order references were not confidently identified.');
  const styleQty = totalQty || colors.reduce((sum: number, color: any) => sum + color.totalQty, 0);
  const styles = styleNo || description || styleQty
    ? [{
        styleNo,
        styleDescription: description,
        totalQty: styleQty,
        collection: findValue(lines, [/(?:collection|season\s*name)\s*[:#=-]?\s*(.{2,60})/i]),
        season: findValue(lines, [/(?:season)\s*[:#=-]?\s*(.{2,40})/i]),
        colors,
        orderReferences
      }]
    : [];
  // Do not claim a successful parse unless core data and totals reconcile.
  const styleColorTotal = colors.reduce((sum: number, color: any) => sum + color.totalQty, 0);
  const checks = [
    { code: 'STYLE_IDENTIFIED', ok: Boolean(styleNo), message: styleNo ? 'Style/article number extracted from PDF.' : 'Style/article number needs review.' },
    { code: 'ORDER_QTY_IDENTIFIED', ok: totalQty > 0, message: totalQty ? `Order quantity extracted: ${totalQty.toLocaleString()}.` : 'Order quantity needs review.' },
    { code: 'STYLE_COLOR_TOTAL', ok: colors.length > 0 && styleColorTotal === styleQty, message: colors.length ? `Color × Size total ${styleColorTotal.toLocaleString()} vs style total ${styleQty.toLocaleString()}.` : 'Color × Size matrix not extracted.' }
  ];
  return {
    parserFamily,
    parserVersion: 'v3.0-pdf-text',
    buyer,
    validation: { status: checks.every((check) => check.ok) && warnings.length === 0 ? 'VALIDATED' : 'NEED_REVIEW', checks },
    styles,
    warnings,
    extractedTextPreview: text.slice(0, 1200)
  };
}
