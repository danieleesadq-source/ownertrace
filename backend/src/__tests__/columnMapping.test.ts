import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestColumnMapping } from "../lib/columnMapping.js";

test("maps role-qualified headers directly", () => {
  const mapping = suggestColumnMapping(["Buyer Name", "Seller Name", "Property Address", "Date", "Amount"]);
  assert.equal(mapping["Buyer Name"], "buyerName");
  assert.equal(mapping["Seller Name"], "sellerName");
  assert.equal(mapping["Property Address"], "propertyAddress");
  assert.equal(mapping["Date"], "date");
  assert.equal(mapping["Amount"], "amount");
});

test("maps underscore/snake_case headers via normalization", () => {
  const mapping = suggestColumnMapping(["buyer_name", "seller_ssn", "property_address"]);
  assert.equal(mapping["buyer_name"], "buyerName");
  assert.equal(mapping["seller_ssn"], "sellerSsn");
  assert.equal(mapping["property_address"], "propertyAddress");
});

test("resolves bare/generic SSN columns to buyer, then seller, then witness in order", () => {
  const mapping = suggestColumnMapping(["SSN 1", "Social Security Number"]);
  // Both are generic-SSN-like; greedy assignment claims buyerSsn first, sellerSsn second
  const assigned = new Set(Object.values(mapping));
  assert.ok(assigned.has("buyerSsn"));
  assert.ok(assigned.has("sellerSsn"));
});

test("never assigns the same target field to two different headers", () => {
  const mapping = suggestColumnMapping(["Buyer", "Purchaser", "Seller"]);
  const assignedFields = Object.values(mapping).filter(Boolean);
  assert.equal(new Set(assignedFields).size, assignedFields.length);
});

test("leaves genuinely unrecognized columns unmapped rather than guessing wildly", () => {
  const mapping = suggestColumnMapping(["Internal Notes Field XYZ123"]);
  assert.equal(mapping["Internal Notes Field XYZ123"], null);
});

test("handles a realistic varied-header CSV row set", () => {
  const mapping = suggestColumnMapping([
    "purchaser_name", "purchaser ssn", "vendor", "vendor_ssn",
    "witness", "property address", "square feet", "category", "deal date", "sale amount",
  ]);
  assert.equal(mapping["purchaser_name"], "buyerName");
  assert.equal(mapping["purchaser ssn"], "buyerSsn");
  assert.equal(mapping["vendor"], "sellerName");
  assert.equal(mapping["vendor_ssn"], "sellerSsn");
  assert.equal(mapping["witness"], "witnessName");
  assert.equal(mapping["property address"], "propertyAddress");
  assert.equal(mapping["square feet"], "propertySize");
  assert.equal(mapping["category"], "propertyType");
  assert.equal(mapping["deal date"], "date");
  assert.equal(mapping["sale amount"], "amount");
});
