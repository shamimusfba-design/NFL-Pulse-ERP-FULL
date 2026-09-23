export type ImportParserFamily = 'BESTSELLER' | 'OVS' | 'UTG';

export type ImportValidationStatus = 'VALIDATED' | 'NEED_REVIEW';

export interface ImportedSizeQty {
  size: string;
  qty: number;
  ean?: string;
}

export interface ImportedColor {
  color: string;
  colorCode?: string;
  totalQty: number;
  sizes: ImportedSizeQty[];
  metadata?: Record<string, unknown>;
}

export interface ImportedOrderReference {
  reference: string;
  referenceType: 'PO' | 'CUSTOMER_ORDER' | 'COLLECTION_STYLE' | 'ORDER';
  totalQty: number;
  ccd?: string;
  shipmentDate?: string;
  cancelDate?: string;
  destination?: string;
  market?: string;
  colors: ImportedColor[];
  metadata?: Record<string, unknown>;
}

export interface ImportedStyle {
  styleNo: string;
  styleDescription?: string;
  collection?: string;
  season?: string;
  totalQty: number;
  colors: ImportedColor[];
  orderReferences: ImportedOrderReference[];
  metadata?: Record<string, unknown>;
}

export interface ImportValidation {
  status: ImportValidationStatus;
  checks: Array<{
    code: string;
    ok: boolean;
    message: string;
  }>;
}

export interface OrderImportPreview {
  buyerCode?: string;
  parserFamily: ImportParserFamily;
  parserVersion: string;
  sourceFileName: string;
  styles: ImportedStyle[];
  warnings: string[];
  validation: ImportValidation;
  sourceMetadata?: Record<string, unknown>;
}

export interface BuyerPoParser {
  readonly family: ImportParserFamily;
  readonly version: string;
  canParse(text: string): boolean;
  parse(text: string, sourceFileName: string, buyerCode?: string): OrderImportPreview;
}
