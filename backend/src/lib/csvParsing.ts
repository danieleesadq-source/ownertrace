import { parse } from 'csv-parse/sync';

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export class CsvParseError extends Error {}

/** Parses raw CSV text into a header row + data rows. No column-format assumptions. */
export function parseCsv(content: string): ParsedCsv {
  let records: string[][];
  try {
    records = parse(content, { columns: false, skip_empty_lines: true, trim: true, relax_column_count: true }) as string[][];
  } catch (err) {
    throw new CsvParseError(err instanceof Error ? err.message : 'Could not parse CSV content.');
  }

  if (records.length === 0) {
    throw new CsvParseError('CSV file is empty.');
  }

  const [headers, ...rows] = records;
  if (headers.some((h) => !h || h.trim() === '')) {
    throw new CsvParseError('CSV header row has one or more empty column names.');
  }

  return { headers, rows };
}
