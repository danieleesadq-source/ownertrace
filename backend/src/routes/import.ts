/**
 * POST /api/import/preview, POST /api/import/commit, POST /api/import/manual
 *
 * Dynamic CSV import + manual entry. `commit` and `manual` both funnel
 * into the same `importTransactionRows`
 * pipeline (`lib/importPipeline.ts`) — one entity-resolution code path, not
 * two that could drift apart.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { parseCsv, CsvParseError } from "../lib/csvParsing.js";
import { suggestColumnMapping, TARGET_FIELDS, type TargetField } from "../lib/columnMapping.js";
import { importTransactionRows, ImportError, type TransactionRow } from "../lib/importPipeline.js";

const router: IRouter = Router();

const SAMPLE_ROW_COUNT = 10;

function isTargetField(value: unknown): value is TargetField {
  return typeof value === "string" && (TARGET_FIELDS as readonly string[]).includes(value);
}

function rowToTransactionRow(headers: string[], row: string[], mapping: Record<string, TargetField | null>): TransactionRow {
  const values: Partial<Record<TargetField, string>> = {};
  headers.forEach((header, i) => {
    const field = mapping[header];
    if (!field) return;
    const value = row[i]?.trim();
    if (value) values[field] = value;
  });

  return {
    buyerName: values.buyerName ?? "",
    buyerSsn: values.buyerSsn ?? null,
    sellerName: values.sellerName ?? "",
    sellerSsn: values.sellerSsn ?? null,
    witnessName: values.witnessName ?? null,
    witnessSsn: values.witnessSsn ?? null,
    propertyAddress: values.propertyAddress ?? "",
    propertySize: values.propertySize ?? null,
    propertyType: values.propertyType ?? null,
    date: values.date ?? "",
    amount: values.amount ?? "",
  };
}

router.post("/import/preview", (req: Request, res: Response) => {
  const { csvContent } = req.body as { csvContent?: unknown };
  if (typeof csvContent !== "string" || !csvContent.trim()) {
    res.status(400).json({ error: "Request body must include non-empty 'csvContent'." });
    return;
  }

  try {
    const { headers, rows } = parseCsv(csvContent);
    res.json({
      headers,
      suggestedMapping: suggestColumnMapping(headers),
      sampleRows: rows.slice(0, SAMPLE_ROW_COUNT),
      totalRows: rows.length,
    });
  } catch (err) {
    if (err instanceof CsvParseError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "CSV preview failed");
    res.status(500).json({ error: "Could not read that CSV file." });
  }
});

router.post("/import/commit", async (req: Request, res: Response) => {
  const { csvContent, mapping } = req.body as { csvContent?: unknown; mapping?: unknown };
  if (typeof csvContent !== "string" || !csvContent.trim()) {
    res.status(400).json({ error: "Request body must include non-empty 'csvContent'." });
    return;
  }
  if (typeof mapping !== "object" || mapping === null) {
    res.status(400).json({ error: "Request body must include a 'mapping' object." });
    return;
  }

  const cleanMapping: Record<string, TargetField | null> = {};
  for (const [header, field] of Object.entries(mapping as Record<string, unknown>)) {
    cleanMapping[header] = isTargetField(field) ? field : null;
  }

  try {
    const { headers, rows } = parseCsv(csvContent);
    const transactionRows = rows.map((row) => rowToTransactionRow(headers, row, cleanMapping));
    const summary = await importTransactionRows(transactionRows);
    res.json(summary);
  } catch (err) {
    if (err instanceof CsvParseError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof ImportError) {
      req.log.error({ err }, "Import commit partially failed");
      res.status(502).json({ error: err.message, partialSummary: err.partialSummary });
      return;
    }
    req.log.error({ err }, "Import commit failed");
    res.status(503).json({ error: "The connection to the database timed out. Check your network and try again." });
  }
});

router.post("/import/manual", async (req: Request, res: Response) => {
  const body = req.body as Partial<TransactionRow>;

  const row: TransactionRow = {
    buyerName: body.buyerName ?? "",
    buyerSsn: body.buyerSsn ?? null,
    sellerName: body.sellerName ?? "",
    sellerSsn: body.sellerSsn ?? null,
    witnessName: body.witnessName ?? null,
    witnessSsn: body.witnessSsn ?? null,
    propertyAddress: body.propertyAddress ?? "",
    propertySize: body.propertySize ?? null,
    propertyType: body.propertyType ?? null,
    date: body.date ?? "",
    amount: body.amount ?? "",
  };

  try {
    const summary = await importTransactionRows([row]);
    if (summary.skipped.length > 0) {
      res.status(400).json({ error: summary.skipped[0].reason });
      return;
    }
    res.json(summary);
  } catch (err) {
    if (err instanceof ImportError) {
      req.log.error({ err }, "Manual entry partially failed");
      res.status(502).json({ error: err.message, partialSummary: err.partialSummary });
      return;
    }
    req.log.error({ err }, "Manual entry failed");
    res.status(503).json({ error: "The connection to the database timed out. Check your network and try again." });
  }
});

export default router;
