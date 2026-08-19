/**
 * entityResolution.ts — normalization + resolution-key logic shared by the
 * seed script and the (Phase 3) import pipeline.
 *
 * Why this exists: the same person or property can show up across many
 * transaction rows — sometimes with an SSN, sometimes without, sometimes
 * with slightly different casing/whitespace in a name or address. Without a
 * stable key to `MERGE` on, every import would create duplicate nodes for
 * the same real-world entity instead of folding into the existing graph.
 * This file is the single source of truth for computing that key, so the
 * seed script and the import pipeline can never drift out of sync with each
 * other on what "the same person" means.
 */

/** Lowercase, trim, collapse internal whitespace to single spaces. */
export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Lowercase, strip punctuation, collapse whitespace. Intentionally simple —
 * exact-string address matching is a documented limitation rather than
 * something to over-engineer here (e.g. "742 Elm St" vs "742 Elm Street"
 * will not resolve to the same
 * key — no abbreviation expansion is attempted).
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * The key a Person node is `MERGE`d on: their SSN if we have one (the
 * strongest identity signal available), otherwise their normalized name.
 */
export function computePersonResolutionKey(ssn: string | null | undefined, name: string): string {
  const trimmedSsn = ssn?.trim();
  return trimmedSsn ? trimmedSsn : normalizeName(name);
}

/** The key a Property node is `MERGE`d on. */
export function computeAddressKey(address: string): string {
  return normalizeAddress(address);
}
