/**
 * GET /api/entity/:id
 *
 * Returns full dossier details for a single node (Person or Property).
 *
 * `riskScore`/`isFlagged`/`flagExplanation` are computed LIVE from graph
 * structure at request time (lib/riskScoring.ts) — not read off the static
 * property the node was seeded/imported with. See riskScoring.ts for why
 * and exactly what's being counted; the seeded values still exist on the
 * node as fallback reference data but are never what this endpoint returns.
 *
 * Why this query is awkward in SQL:
 *   Detecting the "witness-then-buyer" pattern (a person who witnesses a sale
 *   and later becomes a buyer in an overlapping property network) requires
 *   joining the relationship table against itself twice, then filtering on
 *   temporal and network proximity. In Cypher it reads as a path expression:
 *
 *     MATCH (p)-[:TRANSACTION {role:'Witness'}]->(prop)<-[:TRANSACTION]-(other)
 *     WHERE (p)-[:TRANSACTION {role:'Buyer'}]->(something)--(other)
 *
 *   The graph model makes the suspicious topology explicit rather than derived
 *   from multi-table join algebra.
 *
 * Response shape matches frontend/src/lib/types.ts EntityDetails (Person | Property).
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { runQuery } from "../db/driver.js";
import { computeRiskScore } from "../lib/riskScoring.js";
import type { EntityDetails, Transaction, OwnerHistory } from "../types.js";

const router: IRouter = Router();

router.get("/entity/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  try {
    /**
     * Fetch the node by its application-level `id` property, then collect all
     * TRANSACTION relationships it participates in (in either direction — as
     * buyer, seller, or witness). Returning relationships alongside the node
     * in one query avoids an N+1 round-trip.
     */
    const records = await runQuery(
      `
      MATCH (n {id: $id})
      OPTIONAL MATCH (n)-[r:TRANSACTION]-(prop)
      RETURN n, collect(r) AS txRels, collect(prop) AS txProps, labels(n) AS labels
      `,
      { id },
    );

    if (records.length === 0) {
      res.status(404).json({ error: "Entity not found in the case file." });
      return;
    }

    const row     = records[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node    = row.get("n") as any;
    const props   = node.properties as Record<string, unknown>;
    const labels  = row.get("labels") as string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txRels  = row.get("txRels")  as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txProps = row.get("txProps") as any[];

    const isPerson = labels.includes("Person");
    const risk = await computeRiskScore(String(props.id));

    if (isPerson) {
      const transactions: Transaction[] = txRels
        .filter(Boolean)
        .map((rel, i) => {
          const rp    = rel.properties as Record<string, unknown>;
          const tprop = txProps[i];
          const pp    = tprop?.properties as Record<string, unknown> | undefined;
          return {
            id:         String(rp.txId ?? rel.elementId),
            date:       String(rp.date ?? ""),
            propertyId: String(pp?.maskedPropertyId ?? "Unknown"),
            role:       typeof rp.role === "string" ? rp.role : undefined,
            amount:     String(rp.amount ?? "N/A"),
            isFlagged:  Boolean(rp.isFlagged),
            statusText: typeof rp.statusText === "string" ? rp.statusText : undefined,
          };
        });

      const entity: EntityDetails = {
        id:              String(props.id),
        type:            "person",
        name:            String(props.name),
        // Imported people may have no SSN on file at all — fall back to
        // empty string rather than the literal "null" a bare cast would give.
        ssn:             props.maskedSsn ? String(props.maskedSsn) : "",
        role:            String(props.role ?? "Unknown"),
        riskScore:       risk.score,
        isFlagged:       risk.isFlagged,
        connectionsCount: transactions.length,
        flagExplanation: risk.explanation ?? undefined,
        transactions,
      };
      res.json(entity);
    } else {
      // Build ownership history from TRANSACTION rels where role = Buyer/Seller/Owner
      const ownerHistory: OwnerHistory[] = txRels
        .filter(Boolean)
        .map((rel, i) => {
          const rp    = rel.properties as Record<string, unknown>;
          const tprop = txProps[i];
          const pp    = tprop?.properties as Record<string, unknown> | undefined;
          return {
            name:      String(pp?.name ?? "Unknown"),
            date:      String(rp.date ?? ""),
            amount:    String(rp.amount ?? "N/A"),
            isFlagged: Boolean(rp.isFlagged),
          };
        })
        // Sort newest first
        .sort((a, b) => b.date.localeCompare(a.date));

      const entity: EntityDetails = {
        id:               String(props.id),
        type:             "property",
        address:          String(props.address),
        propertyId:       String(props.maskedPropertyId),
        location:         String(props.location ?? ""),
        size:             String(props.size ?? ""),
        propertyType:     String(props.propertyType ?? ""),
        riskScore:        risk.score,
        isFlagged:        risk.isFlagged,
        flagExplanation:  risk.explanation ?? undefined,
        ownershipHistory: ownerHistory,
      };
      res.json(entity);
    }
  } catch (err) {
    req.log.error({ err }, "Entity lookup failed");
    res.status(503).json({
      error: "The connection to the database timed out. Check your network and try again.",
    });
  }
});

export default router;
