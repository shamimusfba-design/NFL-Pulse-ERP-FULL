import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BestsellerParser } from '../../api/src/order-import/bestseller.parser';
import { OvsParser } from '../../api/src/order-import/ovs.parser';
import { UtgParser } from '../../api/src/order-import/utg.parser';

type TextLine = { y: number; items: Array<{ x: number; text: string }> };

const parsers = {
  bestseller: new BestsellerParser(),
  ovs: new OvsParser(),
  utg: new UtgParser(),
};

function normalizeBuyer(value: string): string {
  const v = value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (v === 'ovs' || v.includes('ovsb')) return 'OVS';
  if (v === 'only sons' || v === 'only and sons' || v === 'only sons brand' || v === 'ons' || v === 'only sons only') return 'ONLY & SONS';
  if (v === 'name it' || v === 'nameit') return 'NAME IT';
  if (v === 'utg' || v.includes('united textiles')) return 'UTG';
  if (v === 'only' || v === 'only brand') return 'ONLY';
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

export async function parseBuyerPoPdf(file: File, buyerCode: string) {
  if (!file || file.size === 0) throw new Error('The selected PDF is empty.');
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') throw new Error('Please upload a PDF file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('PDF exceeds the 25 MB import limit.');

  const buyer = normalizeBuyer(buyerCode || '');
  const text = await extractPdfTextWithLayout(file);
  if (!text.trim()) {
    return {
      parserFamily: buyer === 'OVS' ? 'OVS' : ['ONLY', 'ONLY & SONS', 'NAME IT'].includes(buyer) ? 'BESTSELLER' : buyer === 'UTG' ? 'UTG' : 'UNKNOWN',
      parserVersion: 'layout-text-v1',
      buyer,
      buyerCode: buyer,
      sourceFileName: file.name,
      validation: { status: 'NEED_REVIEW', checks: [] },
      styles: [],
      warnings: ['No selectable text was found in this PDF. It may be a scanned/image-only PDF; OCR is required. No sample data was inserted.'],
    };
  }

  let parser = buyer === 'OVS' ? parsers.ovs
    : ['ONLY', 'ONLY & SONS', 'NAME IT'].includes(buyer) ? parsers.bestseller
    : buyer === 'UTG' ? parsers.utg
    : undefined;

  if (!parser) {
    parser = [parsers.bestseller, parsers.ovs, parsers.utg].find((candidate) => candidate.canParse(text));
  }
  if (!parser) {
    throw new Error(`Buyer PO format is not supported for "${buyer || 'unselected buyer'}". Choose the correct buyer or add a buyer-specific parser. No data was imported.`);
  }

  // Use the explicitly selected buyer parser first, matching the production API.
  // Each parser returns warnings for unreadable fields; server-side reconciliation
  // prevents incomplete or mismatched quantities from being confirmed.

  const result = parser.parse(text, file.name, buyer || undefined);
  return { ...result, buyer: buyer || result.buyerCode || result.parserFamily };
}
