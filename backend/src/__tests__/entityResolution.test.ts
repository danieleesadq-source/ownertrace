import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeName, normalizeAddress, computePersonResolutionKey, computeAddressKey } from "../lib/entityResolution.js";

test("normalizeName lowercases, trims, and collapses whitespace", () => {
  assert.equal(normalizeName("  Marcus   Whitfield  "), "marcus whitfield");
  assert.equal(normalizeName("RAY DELGADO"), "ray delgado");
});

test("normalizeAddress lowercases, strips punctuation, collapses whitespace", () => {
  assert.equal(
    normalizeAddress("1420 Maple Avenue, Austin, TX 78701."),
    "1420 maple avenue austin tx 78701",
  );
});

test("computePersonResolutionKey prefers SSN over name when present", () => {
  assert.equal(computePersonResolutionKey("123-45-6789", "Marcus Whitfield"), "123-45-6789");
});

test("computePersonResolutionKey falls back to normalized name when SSN is absent", () => {
  assert.equal(computePersonResolutionKey(null, "Marcus Whitfield"), "marcus whitfield");
  assert.equal(computePersonResolutionKey(undefined, "  Marcus   Whitfield "), "marcus whitfield");
  assert.equal(computePersonResolutionKey("   ", "Marcus Whitfield"), "marcus whitfield", "whitespace-only SSN should not count as present");
});

test("the same person resolves to the same key regardless of casing/spacing variation", () => {
  const a = computePersonResolutionKey(null, "Marcus Whitfield");
  const b = computePersonResolutionKey(null, "  marcus  whitfield ");
  assert.equal(a, b);
});

test("computeAddressKey normalizes consistently so near-identical addresses collapse to one key", () => {
  const a = computeAddressKey("1420 Maple Avenue, Austin, TX 78701");
  const b = computeAddressKey("1420 maple avenue austin tx 78701");
  assert.equal(a, b);
});

test("computeAddressKey does NOT merge genuinely different-looking addresses (documented limitation)", () => {
  const a = computeAddressKey("742 Elm St");
  const b = computeAddressKey("742 Elm Street");
  assert.notEqual(a, b, "exact-normalized matching intentionally does not catch this — documented limitation");
});
