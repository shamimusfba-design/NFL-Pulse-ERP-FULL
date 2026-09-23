import { BadRequestException, Injectable } from '@nestjs/common';
import { BestsellerParser } from './bestseller.parser';
import { OvsParser } from './ovs.parser';
import { UtgParser } from './utg.parser';
import { BuyerPoParser, OrderImportPreview } from './order-import.types';
import { PdfTextService } from './pdf-text.service';

@Injectable()
export class OrderImportService {
  private readonly parsers: BuyerPoParser[] = [new BestsellerParser(), new OvsParser(), new UtgParser()];
  constructor(private readonly pdfText: PdfTextService) {}

  async preview(file: { buffer: Buffer; originalname: string }, buyerCode?: string): Promise<OrderImportPreview> {
    if (!file?.buffer?.length) throw new BadRequestException('PDF file is required');
    const text = await this.pdfText.extract(file.buffer);
    const parser = this.selectParser(text, buyerCode);
    return parser.parse(text, file.originalname, buyerCode);
  }

  private selectParser(text: string, buyerCode?: string): BuyerPoParser {
    const normalizedBuyer = (buyerCode || '').trim().toUpperCase();
    if (['ONLY', 'NAME IT', 'NAMEIT', 'ONLY & SONS', 'ONLY AND SONS', 'ONLY&SONS'].includes(normalizedBuyer)) {
      return this.parsers.find((p) => p.family === 'BESTSELLER')!;
    }
    if (normalizedBuyer === 'OVS') return this.parsers.find((p) => p.family === 'OVS')!;
    if (normalizedBuyer === 'UTG') return this.parsers.find((p) => p.family === 'UTG')!;
    const detected = this.parsers.find((p) => p.canParse(text));
    if (!detected) throw new BadRequestException('Buyer PO format not recognized. Add a buyer-specific parser before importing this file.');
    return detected;
  }
}
