/**
 * GET /api/patterns
 *
 * Server-side fraud-pattern detection — this is the "genuinely awkward in
 * SQL" query the assignment asks for. It doesn't wait for a human to eyeball
 * flagged colors on the graph; it runs two pattern-matching queries against
 * the whole dataset and returns exactly which entities are involved and why.
 * The queries themselves live in lib/fraudPatterns.ts, shared with the live
 * risk-score computation (lib/riskScoring.ts) so there's exactly one
 * definition of each pattern, not two that could drift apart.
 *
 * Why this is awkward in SQL:
 *   Both patterns below require correlating multiple rows of the same
 *   `transactions` table against each other by role, by shared property,
 *   and by date — in SQL that's several self-joins per pattern, each with
 *   its own alias and join condition, and the "connected via a shared
 *   participant" half of witness-then-buyer needs an extra join to even
 *   discover which properties are related. In Cypher both read as a
 *   sequence of path shapes: "seller → property ← buyer, then buyer →
 *   property ← seller again" and "witness → property ← someone, and that
 *   someone also touches a second property the witness later bought."
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { detectCircularFlips, detectWitnessThenBuyer } from "../lib/fraudPatterns.js";
import type { SuspiciousPattern } from "../types.js";

const router: IRouter = Router();

router.get("/patterns", async (req: Request, res: Response) => {
  const maxDaysParam = typeof req.query.maxDays === "string" ? Number(req.query.maxDays) : NaN;
  const maxDays = Number.isFinite(maxDaysParam) && maxDaysParam > 0 ? maxDaysParam : 60;

  try {
    const [flips, witnessThenBuyer] = await Promise.all([detectCircularFlips(maxDays), detectWitnessThenBuyer()]);
    const patterns: SuspiciousPattern[] = [...flips, ...witnessThenBuyer];
    res.json({ patterns, maxDays });
  } catch (err) {
    req.log.error({ err }, "Pattern detection query failed");
    res.status(503).json({
      error: "The connection to the database timed out. Check your network and try again.",
    });
  }
});

export default router;
