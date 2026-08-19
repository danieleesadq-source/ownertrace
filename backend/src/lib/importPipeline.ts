/**
 * importPipeline.ts — the single shared entity-resolution/import function
 * both `/api/import/commit` (CSV) and `/api/import/manual` (single-row form)
 * call: one code path, not two parallel implementations that could drift.
 *
 * Same two-phase shape as the seed script: MERGE all people, MERGE all
 * properties, then create TRANSACTION relationships using the resolved
 * node ids — all as parameterized `UNWIND $rows AS row ...` batches (the
 * pattern already validated safe on CognoDB; see seed.ts).
 */
import { randomUUID } from 'node:crypto';
import { runQuery } from '../db/driver.js';
import { computePersonResolutionKey, computeAddressKey } from './entityResolution.js';
import { maskSsn } from './masking.js';

export interface TransactionRow {
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

/** Thrown when part of an import succeeds and part fails — carries what already happened. */
export class ImportError extends Error {
  constructor(message: string, public readonly partialSummary: ImportSummary, public readonly cause: unknown) {
    super(message);
    this.name = 'ImportError';
  }
}

const REQUIRED_FIELDS: (keyof TransactionRow)[] = ['buyerName', 'sellerName', 'propertyAddress', 'date', 'amount'];

function validateRows(rows: TransactionRow[]): { validRows: TransactionRow[]; skipped: SkippedRow[] } {
  const validRows: TransactionRow[] = [];
  const skipped: SkippedRow[] = [];

  rows.forEach((row, i) => {
    const missing = REQUIRED_FIELDS.filter((field) => !row[field] || String(row[field]).trim() === '');
    if (missing.length > 0) {
      skipped.push({ rowIndex: i + 1, reason: `Missing required field(s): ${missing.join(', ')}` });
      return;
    }
    validRows.push(row);
  });

  return { validRows, skipped };
}

interface PersonInput {
  resolutionKey: string;
  id: string;
  name: string;
  ssn: string | null;
  maskedSsn: string | null;
}

function collectUniquePersons(rows: TransactionRow[]): PersonInput[] {
  const byKey = new Map<string, PersonInput>();
  for (const row of rows) {
    const candidates: [string, string | null | undefined][] = [
      [row.buyerName, row.buyerSsn],
      [row.sellerName, row.sellerSsn],
      ...(row.witnessName ? ([[row.witnessName, row.witnessSsn]] as [string, string | null | undefined][]) : []),
    ];
    for (const [name, ssn] of candidates) {
      const trimmedSsn = ssn?.trim() || null;
      const resolutionKey = computePersonResolutionKey(trimmedSsn, name);
      if (!byKey.has(resolutionKey)) {
        byKey.set(resolutionKey, {
          resolutionKey,
          id: randomUUID(),
          name: name.trim(),
          ssn: trimmedSsn,
          maskedSsn: maskSsn(trimmedSsn),
        });
      }
    }
  }
  return [...byKey.values()];
}

interface PropertyInput {
  addressKey: string;
  id: string;
  address: string;
  maskedPropertyId: string;
  size: string | null;
  propertyType: string | null;
}

function collectUniqueProperties(rows: TransactionRow[]): PropertyInput[] {
  const byKey = new Map<string, PropertyInput>();
  for (const row of rows) {
    const addressKey = computeAddressKey(row.propertyAddress);
    if (!byKey.has(addressKey)) {
      const id = randomUUID();
      byKey.set(addressKey, {
        addressKey,
        id,
        address: row.propertyAddress.trim(),
        maskedPropertyId: `IMP-${id.slice(0, 8).toUpperCase()}`,
        size: row.propertySize?.trim() || null,
        propertyType: row.propertyType?.trim() || null,
      });
    }
  }
  return [...byKey.values()];
}

async function mergePersons(persons: PersonInput[]): Promise<{ idByKey: Map<string, string>; created: number; merged: number }> {
  const keys = persons.map((p) => p.resolutionKey);
  const existing = await runQuery('UNWIND $keys AS k MATCH (n:Person {resolutionKey: k}) RETURN k', { keys });
  const existingKeys = new Set(existing.map((r) => r.get('k') as string));

  const records = await runQuery(
    `
    UNWIND $persons AS p
    MERGE (n:Person {resolutionKey: p.resolutionKey})
    ON CREATE SET
      n.id = p.id, n.name = p.name, n.ssn = p.ssn, n.maskedSsn = p.maskedSsn,
      n.role = 'Imported', n.riskScore = 0, n.isFlagged = false,
      n.connectionsCount = 0, n.flagExplanation = null
    ON MATCH SET
      n.ssn = coalesce(n.ssn, p.ssn),
      n.maskedSsn = coalesce(n.maskedSsn, p.maskedSsn)
    RETURN p.resolutionKey AS resolutionKey, n.id AS id
    `,
    { persons },
  );

  const idByKey = new Map<string, string>();
  for (const r of records) idByKey.set(r.get('resolutionKey') as string, r.get('id') as string);

  return { idByKey, created: keys.length - existingKeys.size, merged: existingKeys.size };
}

async function mergeProperties(properties: PropertyInput[]): Promise<{ idByKey: Map<string, string>; created: number; merged: number }> {
  const keys = properties.map((p) => p.addressKey);
  const existing = await runQuery('UNWIND $keys AS k MATCH (n:Property {addressKey: k}) RETURN k', { keys });
  const existingKeys = new Set(existing.map((r) => r.get('k') as string));

  const records = await runQuery(
    `
    UNWIND $properties AS p
    MERGE (n:Property {addressKey: p.addressKey})
    ON CREATE SET
      n.id = p.id, n.address = p.address, n.maskedPropertyId = p.maskedPropertyId,
      n.location = '', n.size = p.size, n.propertyType = p.propertyType,
      n.riskScore = 0, n.isFlagged = false, n.flagExplanation = null
    ON MATCH SET
      n.size = coalesce(n.size, p.size),
      n.propertyType = coalesce(n.propertyType, p.propertyType)
    RETURN p.addressKey AS addressKey, n.id AS id
    `,
    { properties },
  );

  const idByKey = new Map<string, string>();
  for (const r of records) idByKey.set(r.get('addressKey') as string, r.get('id') as string);

  return { idByKey, created: keys.length - existingKeys.size, merged: existingKeys.size };
}

async function createTransactions(
  rows: TransactionRow[],
  personIdByKey: Map<string, string>,
  propertyIdByKey: Map<string, string>,
): Promise<number> {
  const transactions: Record<string, unknown>[] = [];

  for (const row of rows) {
    const propertyId = propertyIdByKey.get(computeAddressKey(row.propertyAddress))!;

    const buyerId = personIdByKey.get(computePersonResolutionKey(row.buyerSsn?.trim() || null, row.buyerName))!;
    transactions.push({ fromId: buyerId, toId: propertyId, txId: randomUUID(), role: 'Buyer', date: row.date, amount: row.amount, isFlagged: false, statusText: 'Imported' });

    const sellerId = personIdByKey.get(computePersonResolutionKey(row.sellerSsn?.trim() || null, row.sellerName))!;
    transactions.push({ fromId: sellerId, toId: propertyId, txId: randomUUID(), role: 'Seller', date: row.date, amount: row.amount, isFlagged: false, statusText: 'Imported' });

    if (row.witnessName) {
      const witnessId = personIdByKey.get(computePersonResolutionKey(row.witnessSsn?.trim() || null, row.witnessName))!;
      transactions.push({ fromId: witnessId, toId: propertyId, txId: randomUUID(), role: 'Witness', date: row.date, amount: 'N/A', isFlagged: false, statusText: 'Imported' });
    }
  }

  await runQuery(
    `
    UNWIND $transactions AS t
    MATCH (a {id: t.fromId})
    MATCH (b {id: t.toId})
    CREATE (a)-[:TRANSACTION {
      txId: t.txId, role: t.role, date: t.date,
      amount: t.amount, isFlagged: t.isFlagged, statusText: t.statusText
    }]->(b)
    `,
    { transactions },
  );

  return transactions.length;
}

export async function importTransactionRows(rows: TransactionRow[]): Promise<ImportSummary> {
  const { validRows, skipped } = validateRows(rows);

  const summary: ImportSummary = {
    rowsProcessed: rows.length,
    personsCreated: 0,
    personsMerged: 0,
    propertiesCreated: 0,
    propertiesMerged: 0,
    transactionsCreated: 0,
    skipped,
  };

  if (validRows.length === 0) return summary;

  let personIdByKey: Map<string, string>;
  try {
    const result = await mergePersons(collectUniquePersons(validRows));
    personIdByKey = result.idByKey;
    summary.personsCreated = result.created;
    summary.personsMerged = result.merged;
  } catch (err) {
    throw new ImportError('Failed while creating/merging people — no properties or transactions were written.', summary, err);
  }

  let propertyIdByKey: Map<string, string>;
  try {
    const result = await mergeProperties(collectUniqueProperties(validRows));
    propertyIdByKey = result.idByKey;
    summary.propertiesCreated = result.created;
    summary.propertiesMerged = result.merged;
  } catch (err) {
    throw new ImportError('People were created/merged successfully, but failed while creating/merging properties — no transactions were written.', summary, err);
  }

  try {
    summary.transactionsCreated = await createTransactions(validRows, personIdByKey, propertyIdByKey);
  } catch (err) {
    throw new ImportError('People and properties were created/merged successfully, but failed while creating transactions.', summary, err);
  }

  return summary;
}
