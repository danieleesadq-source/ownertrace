/**
 * GET /api/entities
 *
 * Returns every Person and Property node in the case file as a flat,
 * alphabetically-sorted list — no traversal, unlike /api/search. Backs the
 * sidebar's "Data" tab, a directory view for browsing everything on file
 * (rather than only what a name/address query happens to match) before
 * jumping into a specific entity's graph.
 *
 * Response shape matches frontend/src/lib/types.ts GraphNode[], the same
 * shape /api/search already returns nodes in, so the frontend can reuse one
 * node-rendering convention across both.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { runQuery } from "../db/driver.js";
import { computeRiskScores } from "../lib/riskScoring.js";
import type { GraphNode } from "../types.js";

const router: IRouter = Router();

router.get("/entities", async (req: Request, res: Response) => {
  try {
    const records = await runQuery(
      `
      MATCH (n)
      WHERE n:Person OR n:Property
      RETURN n, labels(n) AS labels
      ORDER BY toLower(coalesce(n.name, n.address))
      `,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = records.map((r) => ({ node: r.get("n") as any, labels: r.get("labels") as string[] }));
    const ids = rows.map((r) => String(r.node.properties.id));
    const riskById = await computeRiskScores(ids);

    const nodes: GraphNode[] = rows.map(({ node, labels }) => {
      const props = node.properties as Record<string, unknown>;
      const isPerson = labels.includes("Person");
      const rawSublabel = isPerson ? props.maskedSsn : props.maskedPropertyId;
      const id = String(props.id);
      return {
        id,
        type: isPerson ? "person" : "property",
        label: String(isPerson ? props.name : props.address),
        sublabel: rawSublabel ? String(rawSublabel) : "",
        isFlagged: riskById.get(id)?.isFlagged ?? false,
      };
    });

    res.json({ nodes });
  } catch (err) {
    req.log.error({ err }, "Entities listing failed");
    res.status(503).json({
      error: "The connection to the database timed out. Check your network and try again.",
    });
  }
});

export default router;
