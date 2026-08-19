/**
 * Integration tests for GET /api/search against the real seeded CognoDB
 * instance.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "http";
import { startTestServer, stopTestServer } from "./helpers.js";

let baseUrl: string;
let server: Server;

before(async () => {
  ({ baseUrl, server } = await startTestServer());
});

after(async () => {
  await stopTestServer(server);
});

test("normal search returns matching nodes with correctly connected edges", async () => {
  const res = await fetch(`${baseUrl}/api/search?q=Marcus`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  const nodeIds = new Set(body.nodes.map((n: { id: string }) => n.id));
  assert.ok(nodeIds.has("p1"), "Marcus Whitfield (p1) should be in the results");
  assert.ok(body.nodes.length > 1, "should include Marcus's connected network, not just Marcus");
  assert.ok(body.links.length > 0, "should include edges");

  // The Phase 0 bug: every edge endpoint must resolve to an app-level node id
  // that actually exists in the returned node set, not an internal element id.
  for (const link of body.links) {
    assert.ok(nodeIds.has(link.source), `edge source "${link.source}" must match a returned node id`);
    assert.ok(nodeIds.has(link.target), `edge target "${link.target}" must match a returned node id`);
  }
});

test("search with no results returns an empty graph, not an error", async () => {
  const res = await fetch(`${baseUrl}/api/search?q=ThisMatchesNobodyXYZ`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.deepEqual(body, { nodes: [], links: [] });
});

test("search without a query parameter returns 400", async () => {
  const res = await fetch(`${baseUrl}/api/search`);
  assert.equal(res.status, 400);
  const body = (await res.json()) as any;
  assert.ok(body.error);
});
