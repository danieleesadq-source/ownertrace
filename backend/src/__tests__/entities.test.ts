/**
 * Integration tests for GET /api/entities against the real seeded CognoDB
 * instance. Backs the sidebar's "Data" tab — see routes/entities.ts.
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

test("lists every Person and Property node with the right shape", async () => {
  const res = await fetch(`${baseUrl}/api/entities`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  assert.ok(Array.isArray(body.nodes), "response should have a nodes array");
  assert.ok(body.nodes.length >= 7, "should include at least the 4 seeded people + 3 seeded properties");

  const nodeIds = new Set(body.nodes.map((n: { id: string }) => n.id));
  assert.ok(nodeIds.has("p1"), "Marcus Whitfield (p1) should be listed");
  assert.ok(nodeIds.has("prop1"), "1420 Maple Avenue (prop1) should be listed");

  for (const node of body.nodes) {
    assert.ok(node.id, "every node needs an id");
    assert.ok(node.type === "person" || node.type === "property", "type must be person or property");
    assert.equal(typeof node.label, "string", "label must be a string");
    assert.equal(typeof node.isFlagged, "boolean", "isFlagged must be a boolean");
  }
});

test("is sorted alphabetically by label, case-insensitive", async () => {
  const res = await fetch(`${baseUrl}/api/entities`);
  const body = (await res.json()) as any;
  const labels = body.nodes.map((n: { label: string }) => n.label.toLowerCase());
  const sorted = [...labels].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(labels, sorted);
});

test("marks Marcus Whitfield (p1) as flagged, consistent with /api/entity/p1", async () => {
  const res = await fetch(`${baseUrl}/api/entities`);
  const body = (await res.json()) as any;
  const marcus = body.nodes.find((n: { id: string }) => n.id === "p1");
  assert.ok(marcus, "p1 should be present");
  assert.equal(marcus.isFlagged, true);
});
