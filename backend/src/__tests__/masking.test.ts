import { test } from "node:test";
import assert from "node:assert/strict";
import { maskSsn } from "../lib/masking.js";

test("masks a real SSN using only its digits (bullets, last 4 shown)", () => {
  assert.equal(maskSsn("123-45-6789"), "•••-••-6789");
});

test("returns null for null/undefined/empty input", () => {
  assert.equal(maskSsn(null), null);
  assert.equal(maskSsn(undefined), null);
  assert.equal(maskSsn(""), null);
});

test("returns null for input too short to meaningfully mask", () => {
  assert.equal(maskSsn("12"), null);
});
