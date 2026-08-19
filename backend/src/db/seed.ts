/**
 * seed.ts — Populate CognoDB with the OwnerTrace dataset.
 *
 * Run with:  pnpm --filter backend run seed
 *            (after building: pnpm --filter backend run build)
 *
 * The seed mirrors the mock data in frontend/src/lib/mockApi.ts exactly so
 * the UI scenario works against the real database.
 *
 * Graph model:
 *   (:Person {..., ssn, resolutionKey})
 *     -[:TRANSACTION {role, date, amount, isFlagged, statusText}]->
 *   (:Property {..., addressKey})
 *
 * `resolutionKey`/`addressKey` are the same entity-resolution fields the
 * import pipeline `MERGE`s new data on — computed here via the
 * exact same shared utility (`lib/entityResolution.ts`) so seeded and
 * imported data behave identically. None of the seeded people have an SSN
 * on file, so their resolutionKey falls back to their normalized name, same
 * as it would for any import row that doesn't supply one.
 *
 * Fraud patterns embedded in this dataset (a compact sample US
 * scenario — a handful of people/properties, not a large randomized
 * dataset; that's what CSV import is for):
 *   1. Circular flip loop: 501 Harbor View Blvd changes hands 3 times in 39
 *      days between the same two related parties (Marcus ⇄ Ray ⇄ Marcus ⇄
 *      Ray), with the price escalating on every flip ($2.1M → $2.6M →
 *      $3.2M) — a textbook property-flipping ring pattern.
 *   2. Witness-then-buyer: Ray Delgado witnessed the Maple Avenue sale, then
 *      became the buyer of Harbor View Blvd — the same property Marcus
 *      later sold. A witness who directly profits from a connected deal is
 *      a conflict-of-interest red flag.
 *   3. Below-market sale: Maple Avenue sold for $650,000 when comparable
 *      homes in the area go for $850,000+.
 */
import { getDriver, closeDriver } from './driver.js';
import { computePersonResolutionKey, computeAddressKey } from '../lib/entityResolution.js';

const people = [
  {
    id: 'p1', name: 'Marcus Whitfield', ssn: null, maskedSsn: '•••-••-4521',
    role: 'Frequent Buyer / Seller', riskScore: 85, isFlagged: true,
    connectionsCount: 6,
    flagExplanation: 'This person repeatedly flips the same property back and forth with Ray Delgado at escalating prices — a circular transaction pattern within a short timeframe.',
  },
  {
    id: 'p2', name: 'Diane Castellano', ssn: null, maskedSsn: '•••-••-1122',
    role: 'Seller', riskScore: 12, isFlagged: false,
    connectionsCount: 2,
    flagExplanation: null,
  },
  {
    id: 'p3', name: 'Ray Delgado', ssn: null, maskedSsn: '•••-••-9988',
    role: 'Witness / Buyer', riskScore: 78, isFlagged: true,
    connectionsCount: 6,
    flagExplanation: 'This person witnessed a transaction they later profited from, then repeatedly flipped the same property back and forth with the seller at escalating prices.',
  },
  {
    id: 'p4', name: 'Angela Brooks', ssn: null, maskedSsn: '•••-••-4433',
    role: 'Owner', riskScore: 5, isFlagged: false,
    connectionsCount: 1,
    flagExplanation: null,
  },
].map((p) => ({ ...p, resolutionKey: computePersonResolutionKey(p.ssn, p.name) }));

const properties = [
  {
    id: 'prop1',
    address: '1420 Maple Avenue, Austin, TX 78701',
    maskedPropertyId: 'APN-4471-020-015',
    location: 'Austin, TX',
    size: '2,400 sq ft',
    propertyType: 'Single-Family Home',
    riskScore: 82,
    isFlagged: true,
    flagExplanation: 'Property was sold below market value and involves a high-risk individual (Marcus Whitfield) in its recent transaction chain.',
  },
  {
    id: 'prop2',
    address: '88 Birchwood Court, Denver, CO 80202',
    maskedPropertyId: 'APN-2203-118-004',
    location: 'Denver, CO',
    size: '1,100 sq ft',
    propertyType: 'Condominium',
    riskScore: 15,
    isFlagged: false,
    flagExplanation: null,
  },
  {
    id: 'prop3',
    address: '501 Harbor View Blvd, Miami, FL 33131',
    maskedPropertyId: 'APN-7790-045-201',
    location: 'Miami, FL',
    size: '8,500 sq ft',
    propertyType: 'Commercial',
    riskScore: 90,
    isFlagged: true,
    flagExplanation: '3 transactions between the same two related parties within 39 days, price escalating on every flip ($2.1M → $2.6M → $3.2M). Clear signs of an orchestrated flip ring.',
  },
].map((p) => ({ ...p, addressKey: computeAddressKey(p.address) }));

// prop1 sale: Diane sold to Marcus, Ray witnessed
// prop3 circular flip loop: Marcus and Ray flip the same property back and
// forth 3 times in 39 days, price escalating each time. Deal 1 lands 8 days
// after Ray witnessed the prop1 sale — witness-then-buyer.
// prop2: clean ownership chain
const transactions = [
  { fromId: 'p1', toId: 'prop1', txId: 't1', role: 'Buyer', date: '2024-01-12', amount: '$650,000', isFlagged: true, statusText: 'Flagged' },
  { fromId: 'p2', toId: 'prop1', txId: 't2', role: 'Seller', date: '2024-01-12', amount: '$650,000', isFlagged: false, statusText: 'Clean' },
  { fromId: 'p3', toId: 'prop1', txId: 't3', role: 'Witness', date: '2024-01-12', amount: 'N/A', isFlagged: true, statusText: 'Flagged' },

  { fromId: 'p1', toId: 'prop3', txId: 't4', role: 'Seller', date: '2024-01-20', amount: '$2,100,000', isFlagged: true, statusText: 'Flagged' },
  { fromId: 'p3', toId: 'prop3', txId: 't5', role: 'Buyer', date: '2024-01-20', amount: '$2,100,000', isFlagged: true, statusText: 'Flagged' },
  { fromId: 'p3', toId: 'prop3', txId: 't8', role: 'Seller', date: '2024-02-08', amount: '$2,600,000', isFlagged: true, statusText: 'Flagged' },
  { fromId: 'p1', toId: 'prop3', txId: 't9', role: 'Buyer', date: '2024-02-08', amount: '$2,600,000', isFlagged: true, statusText: 'Flagged' },
  { fromId: 'p1', toId: 'prop3', txId: 't10', role: 'Seller', date: '2024-02-28', amount: '$3,200,000', isFlagged: true, statusText: 'Flagged' },
  { fromId: 'p3', toId: 'prop3', txId: 't11', role: 'Buyer', date: '2024-02-28', amount: '$3,200,000', isFlagged: true, statusText: 'Flagged' },

  { fromId: 'p4', toId: 'prop2', txId: 't6', role: 'Buyer', date: '2019-06-15', amount: '$410,000', isFlagged: false, statusText: 'Clean' },
  { fromId: 'p2', toId: 'prop2', txId: 't7', role: 'Seller', date: '2019-06-15', amount: '$410,000', isFlagged: false, statusText: 'Clean' },
];

async function seed(): Promise<void> {
  const driver = getDriver();
  const session = driver.session();

  try {
    console.log('Clearing existing data…');
    // DETACH DELETE removes all nodes and relationships — safe for a fresh seed
    await session.run('MATCH (n) DETACH DELETE n');

    console.log('Creating Person nodes…');
    // Parameterized batch write — the same UNWIND-per-row shape the Phase 3
    // import pipeline uses, verified not to trigger CognoDB's comma-MATCH
    // duplication bug (that bug is specific to comma-separated MATCH
    // patterns, not UNWIND; confirmed empirically before relying on it here).
    await session.run('UNWIND $people AS p CREATE (n:Person) SET n = p', { people });

    console.log('Creating Property nodes…');
    await session.run('UNWIND $properties AS p CREATE (n:Property) SET n = p', { properties });

    console.log('Creating TRANSACTION relationships…');
    await session.run(
      `
      UNWIND $transactions AS t
      MATCH (a {id: t.fromId})
      MATCH (b {id: t.toId})
      CREATE (a)-[:TRANSACTION {
        txId: t.txId, role: t.role, date: t.date,
        amount: t.amount, isFlagged: t.isFlagged, statusText: t.statusText
      }]->(b)
      `,
      { transactions },
    );

    // Verify what we created
    const countResult = await session.run(`
      MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count
      UNION ALL
      MATCH ()-[r]->() RETURN type(r) AS label, count(r) AS count
    `);

    console.log('\nSeeded successfully:');
    for (const record of countResult.records) {
      console.log(
        `  ${record.get('label') as string}: ${(record.get('count') as { toNumber: () => number }).toNumber()}`,
      );
    }
  } finally {
    await session.close();
    await closeDriver();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
