/**
 * Integration tests for the Phase 3 import pipeline against the real seeded
 * CognoDB instance — CSV preview, commit, re-import merge behavior,
 * malformed CSV handling, and manual entry sharing the same resolution logic.
 *
 * These tests write real, persistent data (there's no "undo" for a MERGE-
 * based import). A random per-run suffix is baked into every fabricated
 * name/SSN/address so the suite is safely repeatable — every run creates
 * its own fresh identities rather than colliding with leftovers from a
 * previous run — without needing a database reseed between runs.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "http";
import { startTestServer, stopTestServer } from "./helpers.js";

let baseUrl: string;
let server: Server;

const RUN = randomUUID().slice(0, 8);
const dylan = `Dylan Prescott ${RUN}`;
const nora = `Nora Kessler ${RUN}`;
const priya = `Priya Anand ${RUN}`;
const dylanSsn = `${RUN.slice(0, 3)}-${RUN.slice(3, 5)}-6789`;

before(async () => {
  ({ baseUrl, server } = await startTestServer());
});

after(async () => {
  await stopTestServer(server);
});

// Deliberately varied header names that don't match the target field names
// directly — testing parsing of varied header
// names, not matching exact field names. Nora
// consistently has no SSN across both her appearances (seller, then
// witness) so she resolves to one name-keyed node both times — a person
// given an SSN in one row but not another would resolve as two *different*
// identities (SSN-key and name-key don't cross-reference each other),
// which is a real, documented characteristic of this algorithm, not
// something this fixture is meant to exercise.
const VARIED_CSV = `purchaser_name,purchaser ssn,vendor,vendor_ssn,witness,plot address,plot size,category,deal date,sale amount
${dylan},${dylanSsn},${nora},,,55 Willow Bend Rd ${RUN} Denver CO,1800 sq ft,Single-Family Home,2024-01-15,"$430,000"
${dylan},${dylanSsn},${priya},,${nora},9 Foundry Loop ${RUN} Portland OR,2200 sq ft,Townhouse,2024-02-02,"$610,000"
`;

const MALFORMED_CSV = `buyer_name,seller_name,property_address,deal_date
Owen Talbot ${RUN},,12 Ridgeline Dr ${RUN} Boise ID,2024-03-01
,Felix Ngata ${RUN},,2024-03-02
`;

test("preview: detects headers and suggests a reasonable column mapping", async () => {
  const res = await fetch(`${baseUrl}/api/import/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvContent: VARIED_CSV }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  assert.deepEqual(body.headers, [
    "purchaser_name", "purchaser ssn", "vendor", "vendor_ssn",
    "witness", "plot address", "plot size", "category", "deal date", "sale amount",
  ]);
  assert.equal(body.suggestedMapping["purchaser_name"], "buyerName");
  assert.equal(body.suggestedMapping["purchaser ssn"], "buyerSsn");
  assert.equal(body.suggestedMapping["vendor"], "sellerName");
  assert.equal(body.suggestedMapping["vendor_ssn"], "sellerSsn");
  assert.equal(body.suggestedMapping["witness"], "witnessName");
  assert.equal(body.suggestedMapping["plot address"], "propertyAddress");
  assert.equal(body.suggestedMapping["deal date"], "date");
  assert.equal(body.suggestedMapping["sale amount"], "amount");
  assert.equal(body.sampleRows.length, 2);
});

test("preview: rejects empty CSV content with a 400, not a crash", async () => {
  const res = await fetch(`${baseUrl}/api/import/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvContent: "" }),
  });
  assert.equal(res.status, 400);
});

test("commit: creates new people/property/transactions, then a re-import merges instead of duplicating", async () => {
  const mapping = {
    "purchaser_name": "buyerName", "purchaser ssn": "buyerSsn",
    "vendor": "sellerName", "vendor_ssn": "sellerSsn",
    "witness": "witnessName",
    "plot address": "propertyAddress", "plot size": "propertySize", "category": "propertyType",
    "deal date": "date", "sale amount": "amount",
  };

  const first = await fetch(`${baseUrl}/api/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvContent: VARIED_CSV, mapping }),
  });
  assert.equal(first.status, 200);
  const firstSummary = (await first.json()) as any;

  assert.equal(firstSummary.rowsProcessed, 2);
  assert.equal(firstSummary.skipped.length, 0);
  // Unique people across both rows: Dylan, Nora, Priya = 3. Dylan and Nora
  // each appear twice (buyer/witness overlap) and must collapse to one node.
  assert.equal(firstSummary.personsCreated, 3);
  assert.equal(firstSummary.propertiesCreated, 2);
  assert.equal(firstSummary.transactionsCreated, 5); // row1: buyer+seller (2), row2: buyer+seller+witness (3)

  // Confirm the new person is actually searchable with correctly connected edges
  const searchRes = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(dylan)}`);
  const searchBody = (await searchRes.json()) as any;
  assert.ok(searchBody.nodes.some((n: any) => n.label === dylan));

  // Re-import the exact same CSV — same people/properties must MERGE, not duplicate
  const second = await fetch(`${baseUrl}/api/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvContent: VARIED_CSV, mapping }),
  });
  assert.equal(second.status, 200);
  const secondSummary = (await second.json()) as any;

  assert.equal(secondSummary.personsCreated, 0, "re-import must not create duplicate people");
  assert.equal(secondSummary.personsMerged, 3);
  assert.equal(secondSummary.propertiesCreated, 0, "re-import must not create duplicate properties");
  assert.equal(secondSummary.propertiesMerged, 2);
});

test("commit: a malformed CSV skips invalid rows with a clear reason instead of crashing or silently partial-importing", async () => {
  const mapping = {
    buyer_name: "buyerName", seller_name: "sellerName",
    property_address: "propertyAddress", deal_date: "date",
  };

  const res = await fetch(`${baseUrl}/api/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvContent: MALFORMED_CSV, mapping }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  assert.equal(body.rowsProcessed, 2);
  // Row 1 is missing seller_name and has no amount column mapped at all;
  // row 2 is missing buyer_name and property_address. Both must be skipped.
  assert.equal(body.skipped.length, 2);
  assert.match(body.skipped[0].reason, /Missing required field/);
  assert.match(body.skipped[1].reason, /Missing required field/);
  assert.equal(body.personsCreated, 0);
  assert.equal(body.transactionsCreated, 0);
});

test("manual entry uses the same resolution logic — merges with a person created via CSV import", async () => {
  const res = await fetch(`${baseUrl}/api/import/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerName: dylan,
      buyerSsn: dylanSsn, // same SSN as the CSV-imported Dylan above
      sellerName: `Corey Vance ${RUN}`,
      propertyAddress: `77 Cinder Block Way ${RUN} Tulsa OK`,
      date: "2024-04-10",
      amount: "$275,000",
    }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  assert.equal(body.personsCreated, 1, "only Corey should be newly created — Dylan already exists");
  assert.equal(body.personsMerged, 1, "Dylan should merge into the node the CSV import created");
  assert.equal(body.propertiesCreated, 1);
  assert.equal(body.transactionsCreated, 2);
});

test("manual entry rejects a row missing a required field with a clear 400", async () => {
  const res = await fetch(`${baseUrl}/api/import/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ buyerName: "Someone", sellerName: "", propertyAddress: "Nowhere", date: "2024-01-01", amount: "$1" }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as any;
  assert.match(body.error, /Missing required field/);
});
