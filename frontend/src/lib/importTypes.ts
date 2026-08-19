export const TARGET_FIELDS = [
  'buyerName',
  'buyerSsn',
  'sellerName',
  'sellerSsn',
  'witnessName',
  'witnessSsn',
  'propertyAddress',
  'propertySize',
  'propertyType',
  'date',
  'amount',
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];

export const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  buyerName: 'Buyer name',
  buyerSsn: 'Buyer SSN',
  sellerName: 'Seller name',
  sellerSsn: 'Seller SSN',
  witnessName: 'Witness name',
  witnessSsn: 'Witness SSN',
  propertyAddress: 'Property address',
  propertySize: 'Property size',
  propertyType: 'Property type',
  date: 'Date',
  amount: 'Amount',
};

export const REQUIRED_TARGET_FIELDS: TargetField[] = ['buyerName', 'sellerName', 'propertyAddress', 'date', 'amount'];

export interface ImportPreview {
  headers: string[];
  suggestedMapping: Record<string, TargetField | null>;
  sampleRows: string[][];
  totalRows: number;
}

export interface SkippedRow {
  rowIndex: number;
  reason: string;
}

export interface ImportSummary {
  rowsProcessed: number;
  personsCreated: number;
  personsMerged: number;
  propertiesCreated: number;
  propertiesMerged: number;
  transactionsCreated: number;
  skipped: SkippedRow[];
}

export interface ManualEntryRow {
  buyerName: string;
  buyerSsn?: string | null;
  sellerName: string;
  sellerSsn?: string | null;
  witnessName?: string | null;
  witnessSsn?: string | null;
  propertyAddress: string;
  propertySize?: string | null;
  propertyType?: string | null;
  date: string;
  amount: string;
}
