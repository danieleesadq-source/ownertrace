/**
 * Integration tests for GET /api/patterns — the SQL-awkward fraud-pattern
 * detection query, confirmed against the real seeded scenario.
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

test("detects both temporally-distinct flip-backs in the Marcus/Ray 3-deal chain on Harbor View Blvd (prop3)", async () => {
  const res = await fetch(`${baseUrl}/api/patterns`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  // /api/patterns is global/unfiltered, and other test files (import.test.ts,
  // riskScoring.test.ts) legitimately create their own fabricated circular-flip
  // data with random names — so this only asserts on prop3-involving flips
  // specifically, not the raw total array length, to stay robust regardless
  // of what other tests have run in the same shared database this session.
  const flips = body.patterns.filter((p: any) => p.type === "circular_flip" && p.property.id === "prop3");
  // The 3-deal chain (Marcus→Ray Jan 20, Ray→Marcus Feb 8, Marcus→Ray Feb 28)
  // contains two genuinely distinct, non-overlapping flip-back pairs: deal1→deal2
  // and deal2→deal3. Both are real signal, not duplicates of each other — see
  // the comment on detectCircularFlips for why an earlier version of this query
  // wrongly collapsed this to one row via an ID-ordering filter that only
  // looked correct by coincidence with the seed data's specific IDs.
  assert.equal(flips.length, 2, "should find both distinct flip-back pairs in the chain");
  for (const flip of flips) {
    assert.equal(new Set([flip.personA.id, flip.personB.id]).size, 2);
    assert.ok(["p1", "p3"].includes(flip.personA.id) && ["p1", "p3"].includes(flip.personB.id));
  }
});

test("detects Ray witnessing prop1 then buying into connected prop3", async () => {
  const res = await fetch(`${baseUrl}/api/patterns`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  // Same reasoning as above: filter to the seed-specific hit rather than
  // asserting the raw global array length.
  const witnessHits = body.patterns.filter(
    (p: any) => p.type === "witness_then_buyer" && p.witnessedProperty.id === "prop1" && p.purchasedProperty.id === "prop3",
  );
  assert.equal(witnessHits.length, 1);
  assert.equal(witnessHits[0].witness.id, "p3");
  assert.equal(witnessHits[0].sharedParticipant.id, "p1");
});

test("maxDays parameter narrows the circular-flip window", async () => {
  // The real flip loop spans 19-20 days between consecutive deals — a
  // window shorter than that should exclude both prop3 pairs.
  const res = await fetch(`${baseUrl}/api/patterns?maxDays=5`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  const flips = body.patterns.filter((p: any) => p.type === "circular_flip" && p.property.id === "prop3");
  assert.equal(flips.length, 0, "a 5-day window should be too narrow to catch either 19+ day flip pair");
});
