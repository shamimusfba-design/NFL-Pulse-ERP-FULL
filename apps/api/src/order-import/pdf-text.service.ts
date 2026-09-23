import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class PdfTextService {
  async extract(buffer: Buffer): Promise<string> {
    try {
      // Kept as require so this starter compiles cleanly with CommonJS/NestJS.
      // pdf-parse is intentionally pinned in package.json for deterministic setup.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<{ text: string }>;
      const result = await pdfParse(buffer);
      if (!result.text?.trim()) throw new Error('No embedded text found');
      return result.text;
    } catch (error: any) {
      throw new BadRequestException(`PDF text could not be extracted. Scanned/image-only PDFs will require OCR fallback. ${error?.message || ''}`.trim());
    }
  }
}
