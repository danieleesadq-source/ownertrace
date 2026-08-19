/**
 * Integration tests for GET /api/entity/:id against the real seeded CognoDB
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

test("entity lookup for a flagged person returns full dossier with transactions", async () => {
  const res = await fetch(`${baseUrl}/api/entity/p1`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  assert.equal(body.type, "person");
  assert.equal(body.name, "Marcus Whitfield");
  assert.equal(body.isFlagged, true);
  assert.ok(body.flagExplanation, "flagged person should have a flagExplanation");
  assert.ok(body.transactions.length >= 3, "Marcus should have multiple transactions (flip loop)");
});

test("entity lookup for a clean property returns dossier with no flag explanation", async () => {
  const res = await fetch(`${baseUrl}/api/entity/prop2`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  assert.equal(body.type, "property");
  assert.equal(body.isFlagged, false);
  assert.equal(body.flagExplanation, undefined);
  assert.ok(body.ownershipHistory.length > 0);
});

test("entity lookup for an unknown id returns 404", async () => {
  const res = await fetch(`${baseUrl}/api/entity/does-not-exist`);
  assert.equal(res.status, 404);
  const body = (await res.json()) as any;
  assert.ok(body.error);
});
