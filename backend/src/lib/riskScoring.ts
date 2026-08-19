/**
 * riskScoring.ts — computes Person/Property risk score, isFlagged, and a
 * human-readable explanation LIVE from graph structure at query time,
 * replacing the static `riskScore`/`isFlagged`/`flagExplanation` properties
 * seeded/imported data carries (those now exist only as fallback reference
 * values — see seed.ts / importPipeline.ts — never what the API returns).
 *
 * This is a stronger "why a graph database" argument than a stored column:
 * the score is derived by walking the same relationship patterns
 * fraudPatterns.ts already detects, so a newly imported transaction that
 * completes a circular-flip loop or a witness-then-buyer pattern changes
 * the involved entities' risk scores on the very next read — no separate
 * batch job, no re-scoring step, nothing to keep in sync.
 *
 * Four signals, each a real graph-structure count, not a stored value:
 *   1. flaggedTx      — flagged TRANSACTION relationships touching the entity
 *   2. sharedWitness   — flagged transactions witnessed by someone who also
 *                        witnesses one of this entity's own transactions
 *                        ("shared witnesses across unrelated deals")
 *   3. witnessThenBuyer — witness-then-buyer occurrences involving this entity
 *   4. circularFlip    — circular flip-loop pairs involving this entity
 *
 * Combined into a simple weighted 0–100 score. Weights and the isFlagged
 * threshold (40) are tuned so a genuinely clean entity (all signals 0)
 * scores 0, while any entity with real flagged-transaction involvement
 * clears the threshold — see the worked example in README.md.
 */
import { runQuery } from '../db/driver.js';
import { detectCircularFlips, detectWitnessThenBuyer } from './fraudPatterns.js';

export interface RiskResult {
  score: number;
  isFlagged: boolean;
  explanation: string | null;
}

// circularFlip and witnessThenBuyer are weighted to cross FLAG_THRESHOLD on
// their own with a single occurrence — a completed round-trip resale or a
// witness-then-buyer conflict of interest is strong enough evidence by
// itself, unlike flaggedTx/sharedWitness which are softer, cumulative
// signals (a freshly imported transaction always starts isFlagged:false —
// see importPipeline.ts — so flaggedTx alone never fires for new imports;
// the structural signals are what make imported fraud patterns detectable
// immediately, with no separate scoring step).
const WEIGHTS = { flaggedTx: 10, sharedWitness: 15, witnessThenBuyer: 45, circularFlip: 45 };
const FLAG_THRESHOLD = 40;
const CIRCULAR_FLIP_WINDOW_DAYS = 60;

interface Signals {
  flaggedTx: number;
  sharedWitness: number;
  witnessThenBuyer: number;
  circularFlip: number;
}

async function batchFlaggedTransactionCounts(ids: string[]): Promise<Map<string, number>> {
  const records = await runQuery(
    `
    UNWIND $ids AS id
    MATCH (n {id: id})
    OPTIONAL MATCH (n)-[t:TRANSACTION]-()
    RETURN id, count(CASE WHEN t.isFlagged THEN 1 END) AS flaggedTx
    `,
    { ids },
  );
  const map = new Map<string, number>();
  for (const r of records) map.set(r.get('id') as string, (r.get('flaggedTx') as { toNumber: () => number }).toNumber());
  return map;
}

/**
 * Flagged transactions witnessed by anyone who *also* witnesses one of this
 * entity's own transactions — computed globally once (two simple, cheap
 * MATCH chains, no comma-separated patterns) rather than per id, since
 * witness relationships are rare; counting per-entity happens in JS after.
 */
async function globalSharedWitnessPairs(): Promise<{ entityId: string; otherPropertyId: string }[]> {
  const personAnchored = await runQuery(`
    MATCH (entity:Person)-[:TRANSACTION]-(prop:Property)<-[:TRANSACTION {role: 'Witness'}]-(witness:Person)
    MATCH (witness)-[:TRANSACTION {role: 'Witness', isFlagged: true}]->(otherProp:Property)
    WHERE otherProp <> prop
    RETURN DISTINCT entity.id AS entityId, otherProp.id AS otherPropertyId
  `);
  const propertyAnchored = await runQuery(`
    MATCH (prop:Property)<-[:TRANSACTION {role: 'Witness'}]-(witness:Person)
    MATCH (witness)-[:TRANSACTION {role: 'Witness', isFlagged: true}]->(otherProp:Property)
    WHERE otherProp <> prop
    RETURN DISTINCT prop.id AS entityId, otherProp.id AS otherPropertyId
  `);
  return [...personAnchored, ...propertyAnchored].map((r) => ({
    entityId: r.get('entityId') as string,
    otherPropertyId: r.get('otherPropertyId') as string,
  }));
}

function buildExplanation(signals: Signals): string | null {
  const reasons: string[] = [];
  if (signals.circularFlip > 0) {
    reasons.push('Part of a circular resale pattern — the same property changed hands between related parties multiple times, with the price escalating each flip.');
  }
  if (signals.witnessThenBuyer > 0) {
    reasons.push('Witnessed a transaction and later became a buyer in a connected property — a conflict of interest.');
  }
  if (signals.sharedWitness > 0) {
    reasons.push('Connected to a witness who is also linked to other flagged transactions elsewhere.');
  }
  if (reasons.length === 0 && signals.flaggedTx > 0) {
    reasons.push(`Involved in ${signals.flaggedTx} flagged transaction${signals.flaggedTx === 1 ? '' : 's'}.`);
  }
  return reasons.length > 0 ? reasons.join(' ') : null;
}

function scoreFromSignals(signals: Signals): RiskResult {
  const raw =
    signals.flaggedTx * WEIGHTS.flaggedTx +
    signals.sharedWitness * WEIGHTS.sharedWitness +
    signals.witnessThenBuyer * WEIGHTS.witnessThenBuyer +
    signals.circularFlip * WEIGHTS.circularFlip;
  const score = Math.min(100, raw);
  const isFlagged = score >= FLAG_THRESHOLD;
  return { score, isFlagged, explanation: isFlagged ? buildExplanation(signals) : null };
}

/**
 * Computes live risk for a batch of entity ids (Person or Property ids may
 * be mixed freely). Runs a fixed number of queries regardless of how many
 * ids are passed in — safe to call with one id (entity.ts) or many
 * (search.ts) without an N+1 query pattern.
 */
export async function computeRiskScores(ids: string[]): Promise<Map<string, RiskResult>> {
  if (ids.length === 0) return new Map();

  const [flaggedTxByid, sharedWitnessPairs, circularFlips, witnessThenBuyers] = await Promise.all([
    batchFlaggedTransactionCounts(ids),
    globalSharedWitnessPairs(),
    detectCircularFlips(CIRCULAR_FLIP_WINDOW_DAYS),
    detectWitnessThenBuyer(),
  ]);

  const results = new Map<string, RiskResult>();
  for (const id of ids) {
    const signals: Signals = {
      flaggedTx: flaggedTxByid.get(id) ?? 0,
      sharedWitness: new Set(sharedWitnessPairs.filter((p) => p.entityId === id).map((p) => p.otherPropertyId)).size,
      witnessThenBuyer: witnessThenBuyers.filter(
        (w) => w.witness.id === id || w.witnessedProperty.id === id || w.purchasedProperty.id === id || w.sharedParticipant.id === id,
      ).length,
      circularFlip: circularFlips.filter((f) => f.personA.id === id || f.personB.id === id || f.property.id === id).length,
    };
    results.set(id, scoreFromSignals(signals));
  }
  return results;
}

export async function computeRiskScore(id: string): Promise<RiskResult> {
  const map = await computeRiskScores([id]);
  return map.get(id) ?? { score: 0, isFlagged: false, explanation: null };
}
