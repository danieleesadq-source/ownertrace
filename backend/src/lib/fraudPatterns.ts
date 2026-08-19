/**
 * fraudPatterns.ts — the two SQL-awkward fraud-detection queries, factored
 * out of routes/patterns.ts so the live risk-score computation
 * (lib/riskScoring.ts) can reuse the exact same, already-tested Cypher
 * instead of re-deriving a second copy of it.
 */
import { runQuery } from "../db/driver.js";
import type { CircularFlipPattern, WitnessThenBuyerPattern } from "../types.js";

/**
 * CIRCULAR FLIP LOOP
 *
 * Finds two people who sold the same property back and forth to each
 * other within `maxDays` days: A sells to B, then B sells the same
 * property back to A. `buy1.date = sell1.date` / `buy2.date = sell2.date`
 * pin the buyer-side and seller-side relationship of each deal together
 * (both sides of one transaction share a date in this model) — without
 * that, the query would independently match every Seller relationship
 * against every Buyer relationship on the property and produce a
 * Cartesian blow-up of spurious combinations rather than real deals.
 *
 * No `a.id < b.id`-style filter is needed to avoid "matching the same pair
 * twice": `a` and `b` are already uniquely role/date-bound (`a` is whoever
 * sold in the earlier of the two dated deals), so a fixed date-pair can only
 * bind one way. An earlier version of this query *did* add an `a.id < b.id`
 * filter, intending to collapse a longer flip *chain* (3+ back-and-forth
 * deals) down to one row — but that used arbitrary ID ordering to decide
 * which of several genuinely distinct, temporally-non-overlapping flip-back
 * pairs to keep, silently dropping real detections whenever the "wrong"
 * party happened to sort first. It only ever looked correct because the
 * seed data's hardcoded IDs (`p1` < `p3`) happened to align with who sold
 * first; it broke close to 50% of the time once entities got randomly
 * generated IDs (Phase 3 imports). Every temporally-distinct flip-back pair
 * within a chain is now reported as its own row, which is arguably more
 * informative for a longer chain anyway, not less correct.
 */
export async function detectCircularFlips(maxDays: number): Promise<CircularFlipPattern[]> {
  const records = await runQuery(
    `
    MATCH (a:Person)-[sell1:TRANSACTION {role: 'Seller'}]->(prop:Property)<-[buy1:TRANSACTION {role: 'Buyer'}]-(b:Person)
    WHERE buy1.date = sell1.date
    MATCH (b)-[sell2:TRANSACTION {role: 'Seller'}]->(prop)<-[buy2:TRANSACTION {role: 'Buyer'}]-(a)
    WHERE buy2.date = sell2.date
      AND sell2.date > sell1.date
      AND duration.between(date(sell1.date), date(sell2.date)).days <= $maxDays
    RETURN DISTINCT
      a.id AS personAId, a.name AS personAName,
      b.id AS personBId, b.name AS personBName,
      prop.id AS propertyId, prop.address AS propertyAddress,
      sell1.date AS firstDate, sell2.date AS secondDate,
      sell1.amount AS firstAmount, sell2.amount AS secondAmount
    `,
    { maxDays },
  );

  return records.map((r) => ({
    type: "circular_flip",
    personA: { id: String(r.get("personAId")), name: String(r.get("personAName")) },
    personB: { id: String(r.get("personBId")), name: String(r.get("personBName")) },
    property: { id: String(r.get("propertyId")), address: String(r.get("propertyAddress")) },
    firstDate: String(r.get("firstDate")),
    secondDate: String(r.get("secondDate")),
    firstAmount: String(r.get("firstAmount")),
    secondAmount: String(r.get("secondAmount")),
  }));
}

/**
 * WITNESS-THEN-BUYER
 *
 * Finds a person who witnessed a transaction on one property, then
 * bought a *different* property — where that second property is
 * connected back to the first deal through a shared participant. A
 * witness buying an unrelated property is unremarkable; a witness
 * buying into a property that shares a participant with the deal they
 * witnessed is a conflict of interest worth surfacing.
 */
export async function detectWitnessThenBuyer(): Promise<WitnessThenBuyerPattern[]> {
  const records = await runQuery(`
    MATCH (witness:Person)-[:TRANSACTION {role: 'Witness'}]->(witnessedProp:Property)
    MATCH (witness)-[:TRANSACTION {role: 'Buyer'}]->(otherProp:Property)
    WHERE otherProp.id <> witnessedProp.id
    MATCH (witnessedProp)<-[:TRANSACTION]-(participant:Person)-[:TRANSACTION]-(otherProp)
    WHERE participant.id <> witness.id
    RETURN DISTINCT
      witness.id AS witnessId, witness.name AS witnessName,
      witnessedProp.id AS witnessedPropertyId, witnessedProp.address AS witnessedAddress,
      otherProp.id AS purchasedPropertyId, otherProp.address AS purchasedAddress,
      participant.id AS participantId, participant.name AS participantName
  `);

  return records.map((r) => ({
    type: "witness_then_buyer",
    witness: { id: String(r.get("witnessId")), name: String(r.get("witnessName")) },
    witnessedProperty: { id: String(r.get("witnessedPropertyId")), address: String(r.get("witnessedAddress")) },
    purchasedProperty: { id: String(r.get("purchasedPropertyId")), address: String(r.get("purchasedAddress")) },
    sharedParticipant: { id: String(r.get("participantId")), name: String(r.get("participantName")) },
  }));
}
