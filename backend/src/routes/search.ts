/**
 * GET /api/search?q=<query>
 *
 * Finds Person or Property nodes whose name/address contains the query string,
 * then expands 2 hops outward to build the ownership subgraph.
 *
 * Why graph traversal beats SQL here:
 *   A SQL "2-hop" query requires multiple self-joins on a relationship table
 *   with growing complexity as hops increase. In Cypher, variable-length path
 *   matching `(start)-[*1..2]-(n)` reads naturally and the graph engine handles
 *   the traversal without explicit join logic. Adding a 3rd hop is one character.
 *
 * Response shape matches frontend/src/lib/types.ts GraphData:
 *   { nodes: GraphNode[], links: GraphEdge[] }
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { runQuery } from "../db/driver.js";
import { computeRiskScores } from "../lib/riskScoring.js";
import type { GraphNode, GraphEdge } from "../types.js";

const router: IRouter = Router();

router.get("/search", async (req: Request, res: Response) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!query) {
    res.status(400).json({ error: "Query parameter 'q' is required." });
    return;
  }

  try {
    /**
     * MULTI-HOP TRAVERSAL QUERY
     *
     * Step 1: Find all nodes where name/address matches the query (case-insensitive).
     * Step 2: From each match, walk up to 2 relationship hops in any direction.
     *         This surfaces the owner, their connected properties, witnesses, and
     *         any second-degree connections — the full local ownership web.
     * Step 3: Collect every distinct node and relationship encountered across all
     *         paths and return them in a single result set.
     *
     * The `*1..2` syntax is the key graph-native primitive — Cypher understands
     * variable-length paths natively; SQL would need recursive CTEs or application-
     * level loop logic for the equivalent.
     *
     * BUG FIX (node/edge ID mismatch): the frontend graph renderer matches
     * `link.source`/`link.target` against `node.id`, and `node.id` is always the
     * app-level `id` property (e.g. "p1", "prop1") — never Neo4j's internal
     * elementId. A relationship on its own only exposes internal start/end
     * element IDs, which live in a completely different ID space and will never
     * match `node.id`. So instead of returning bare relationship objects, this
     * query resolves `startNode(rel).id` / `endNode(rel).id` explicitly — the
     * same app-level `id` property used for nodes — so every edge already
     * points at IDs the frontend can actually match against.
     */
    const records = await runQuery(
      `
      MATCH (start)
      WHERE (start:Person AND toLower(start.name) CONTAINS toLower($query))
         OR (start:Property AND toLower(start.address) CONTAINS toLower($query))
      WITH collect(DISTINCT start) AS starts

      UNWIND starts AS s
      MATCH path = (s)-[*1..2]-(n)

      WITH
        starts +
        [node IN nodes(path) | node] AS allNodes,
        [rel  IN relationships(path) | rel] AS allRels

      UNWIND allNodes AS node
      WITH collect(DISTINCT node) AS nodes, collect(allRels) AS relLists
      UNWIND relLists AS relList
      UNWIND relList AS rel

      WITH nodes, collect(DISTINCT rel) AS rels
      UNWIND rels AS r
      RETURN nodes,
             collect(DISTINCT {
               sourceId:  startNode(r).id,
               targetId:  endNode(r).id,
               isFlagged: r.isFlagged,
               role:      r.role
             }) AS edges
      `,
      { query },
    );

    if (records.length === 0) {
      // No matches — return empty graph
      res.json({ nodes: [], links: [] });
      return;
    }

    const row = records[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawNodes = (row.get("nodes") as any[]) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawEdges = (row.get("edges") as any[]) ?? [];

    // Node-level isFlagged is computed live (lib/riskScoring.ts) from graph
    // structure, same as /api/entity/:id — batched into one call so a
    // search returning several nodes doesn't fire an N+1 risk query per node.
    const ids = rawNodes.map((n) => String(n.properties.id));
    const riskById = await computeRiskScores(ids);

    const nodes: GraphNode[] = rawNodes.map((n) => nodeToGraphNode(n, riskById));
    const links: GraphEdge[] = rawEdges.map(edgeMapToGraphEdge);

    res.json({ nodes, links });
  } catch (err) {
    req.log.error({ err }, "Search query failed");
    res.status(503).json({
      error: "The connection to the database timed out. Check your network and try again.",
    });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nodeToGraphNode(n: any, riskById: Map<string, { isFlagged: boolean }>): GraphNode {
  const props = n.properties as Record<string, unknown>;
  const isPerson = (n.labels as string[]).includes("Person");
  // Imported people/properties may not have a maskedSsn/maskedPropertyId
  // (e.g. no SSN was supplied on import) — fall back to an empty string
  // rather than the literal "null" a bare String() cast would produce.
  const rawSublabel = isPerson ? props.maskedSsn : props.maskedPropertyId;
  const id = String(props.id);
  return {
    id,
    type:      isPerson ? "person" : "property",
    label:     String(isPerson ? props.name : props.address),
    sublabel:  rawSublabel ? String(rawSublabel) : "",
    isFlagged: riskById.get(id)?.isFlagged ?? false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function edgeMapToGraphEdge(e: any): GraphEdge {
  return {
    source:    String(e.sourceId),
    target:    String(e.targetId),
    isFlagged: Boolean(e.isFlagged),
    label:     typeof e.role === "string" ? e.role : undefined,
  };
}

export default router;
