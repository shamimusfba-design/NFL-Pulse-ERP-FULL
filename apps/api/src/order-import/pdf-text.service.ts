import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class PdfTextService {
  async extract(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (data: Buffer, options?: Record<string, unknown>) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      if (!result.text?.trim()) throw new Error('No embedded text found');
      return result.text;
    } catch (error: any) {
      throw new BadRequestException(`PDF text could not be extracted. Scanned/image-only PDFs will require OCR fallback. ${error?.message || ''}`.trim());
    }
  }

  /**
   * BESTSELLER PO tables need row-aware text. pdf-parse's default extraction can
   * emit table columns one after another (all colors, then all sizes, etc.).
   * Grouping PDF.js text items by Y and sorting by X restores the visual row
   * order closely enough for deterministic PO parsing without OCR.
   */
  async extractLayout(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (data: Buffer, options?: Record<string, unknown>) => Promise<{ text: string }>;
      const pagerender = async (pageData: any) => {
        const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
        const items = (content?.items || [])
          .map((item: any) => ({
            text: String(item?.str || '').trim(),
            x: Number(item?.transform?.[4] || 0),
            y: Number(item?.transform?.[5] || 0),
          }))
          .filter((item: any) => item.text);

        items.sort((a: any, b: any) => {
          const dy = b.y - a.y;
          return Math.abs(dy) > 2 ? dy : a.x - b.x;
        });

        const lines: Array<{ y: number; items: Array<{ text: string; x: number }> }> = [];
        for (const item of items) {
          const last = lines[lines.length - 1];
          if (!last || Math.abs(last.y - item.y) > 2) lines.push({ y: item.y, items: [{ text: item.text, x: item.x }] });
          else last.items.push({ text: item.text, x: item.x });
        }

        return lines.map((line) => line.items.sort((a, b) => a.x - b.x).map((x) => x.text).join(' ')).join('\n');
      };

      const result = await pdfParse(buffer, { pagerender });
      if (!result.text?.trim()) throw new Error('No embedded text found');
      return result.text;
    } catch (error: any) {
      // Layout extraction is an enhancement, not a reason to make a readable PDF fail.
      return this.extract(buffer);
    }
  }
}
