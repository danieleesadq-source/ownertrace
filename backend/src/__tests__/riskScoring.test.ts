/**
 * Confirms /api/entity/:id and /api/search return LIVE-computed risk scores
 * — not the static seeded value — and specifically that data imported via
 * the import pipeline gets scored automatically with no separate scoring
 * step needed.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "http";
import { startTestServer, stopTestServer } from "./helpers.js";

let baseUrl: string;
let server: Server;

const RUN = randomUUID().slice(0, 8);

before(async () => {
  ({ baseUrl, server } = await startTestServer());
});

after(async () => {
  await stopTestServer(server);
});

test("a freshly imported one-off transaction with no suspicious structure scores 0 / unflagged", async () => {
  const buyerName = `Clean Buyer ${RUN}`;
  const res = await fetch(`${baseUrl}/api/import/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerName,
      sellerName: `Clean Seller ${RUN}`,
      propertyAddress: `Quiet Street ${RUN}`,
      date: "2024-05-01",
      amount: "Rs. 8,000,000",
    }),
  });
  assert.equal(res.status, 200);

  const searchRes = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(buyerName)}`);
  const searchBody = (await searchRes.json()) as any;
  const node = searchBody.nodes.find((n: any) => n.label === buyerName);
  assert.ok(node, "imported buyer should be findable via search");

  const entityRes = await fetch(`${baseUrl}/api/entity/${node.id}`);
  const entity = (await entityRes.json()) as any;
  assert.equal(entity.riskScore, 0);
  assert.equal(entity.isFlagged, false);
});

test("importing a circular flip loop between two new people is picked up by the LIVE score automatically", async () => {
  const buyerA = `Flip Party A ${RUN}`;
  const buyerB = `Flip Party B ${RUN}`;
  const address = `Suspicious Plot ${RUN}`;

  // Deal 1: A sells to B
  let res = await fetch(`${baseUrl}/api/import/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyerName: buyerB, sellerName: buyerA, propertyAddress: address, date: "2024-06-01", amount: "Rs. 50,000,000" }),
  });
  assert.equal(res.status, 200);

  // Deal 2: B sells it straight back to A, 10 days later — a circular flip
  res = await fetch(`${baseUrl}/api/import/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyerName: buyerA, sellerName: buyerB, propertyAddress: address, date: "2024-06-11", amount: "Rs. 65,000,000" }),
  });
  assert.equal(res.status, 200);

  const searchRes = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(buyerA)}`);
  const searchBody = (await searchRes.json()) as any;
  const node = searchBody.nodes.find((n: any) => n.label === buyerA);
  assert.ok(node, "should be searchable");
  // The graph node's own isFlagged must also reflect the live score, not a stored default
  assert.equal(node.isFlagged, true, "search response node isFlagged should be live, not the imported default of false");

  const entityRes = await fetch(`${baseUrl}/api/entity/${node.id}`);
  const entity = (await entityRes.json()) as any;
  assert.ok(entity.riskScore > 0, "circular flip involvement must raise the live score above 0");
  assert.equal(entity.isFlagged, true);
  assert.match(entity.flagExplanation, /circular resale pattern/);
});
