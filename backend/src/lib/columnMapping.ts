/**
 * columnMapping.ts — suggests which CSV column maps to which known
 * transaction field, so the Import page doesn't force users to hand-map
 * every column on every upload.
 *
 * This is intentionally a starting suggestion, not an automatic silent
 * import — the user confirms or overrides every mapping in the Import UI
 * before anything is committed.
 */

export const TARGET_FIELDS = [
  'buyerName',
  'buyerSsn',
  'sellerName',
  'sellerSsn',
  'witnessName',
  'witnessSsn',
  'propertyAddress',
  'propertySize',
  'propertyType',
  'date',
  'amount',
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];

const FIELD_ALIASES: Record<TargetField, string[]> = {
  buyerName: ['buyer', 'buyer name', 'purchaser', 'purchaser name'],
  buyerSsn: ['buyer ssn', 'buyer social security', 'buyer social security number', 'purchaser ssn', 'buyer tax id'],
  sellerName: ['seller', 'seller name', 'vendor', 'vendor name'],
  sellerSsn: ['seller ssn', 'seller social security', 'seller social security number', 'vendor ssn', 'seller tax id'],
  witnessName: ['witness', 'witness name'],
  witnessSsn: ['witness ssn', 'witness social security', 'witness social security number'],
  propertyAddress: ['address', 'property address', 'location', 'property location'],
  propertySize: ['size', 'property size', 'square feet', 'sq ft', 'area'],
  propertyType: ['type', 'property type', 'category'],
  date: ['date', 'transaction date', 'deal date', 'sale date'],
  amount: ['amount', 'price', 'sale amount', 'value', 'transaction amount'],
};

// Bare, role-less columns (e.g. just "SSN") resolve to the next unclaimed
// slot in this priority order — the "context/column position" fallback
// used for generic columns, without needing true positional analysis.
const GENERIC_SSN_PRIORITY: TargetField[] = ['buyerSsn', 'sellerSsn', 'witnessSsn'];
const GENERIC_NAME_PRIORITY: TargetField[] = ['buyerName', 'sellerName', 'witnessName'];
const GENERIC_SSN_ALIASES = ['ssn', 'social security', 'social security number', 'govt id', 'government id', 'id number', 'tax id'];
const GENERIC_NAME_ALIASES = ['name'];
const ROLE_WORDS = ['buyer', 'purchaser', 'seller', 'vendor', 'witness'];

// A header only counts as "bare/generic" if it has no role word at all —
// otherwise "seller_ssn" (which *contains* "ssn") would wrongly get
// treated the same as a genuinely unqualified "SSN" column.
function hasRoleWord(normalizedHeader: string): boolean {
  return ROLE_WORDS.some((word) => normalizedHeader.includes(word));
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\-.]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** 0..1 similarity — exact match highest, substring containment next, else Levenshtein-based. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) {
    return 0.85 + 0.15 * (Math.min(a.length, b.length) / Math.max(a.length, b.length));
  }
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 0 : 1 - dist / maxLen;
}

function bestScoreForField(normalizedHeader: string, field: TargetField): number {
  let best = 0;
  for (const alias of FIELD_ALIASES[field]) {
    best = Math.max(best, similarity(normalizedHeader, alias));
  }
  return best;
}

/**
 * Suggests a target field for each CSV header. Role-qualified headers
 * ("buyer_ssn") score directly against that field's aliases. Bare/generic
 * headers ("ssn", "name") fall back to the next unclaimed slot in a fixed
 * priority order instead of guessing blindly. Greedy highest-score-first
 * assignment so two headers never claim the same field.
 */
export function suggestColumnMapping(headers: string[]): Record<string, TargetField | null> {
  const normalized = headers.map(normalizeHeader);
  const claimed = new Set<TargetField>();
  const result: Record<string, TargetField | null> = {};
  for (const h of headers) result[h] = null;

  type Candidate = { header: string; field: TargetField; score: number };
  const candidates: Candidate[] = [];

  headers.forEach((header, i) => {
    const norm = normalized[i];
    const isGenericSsn = !hasRoleWord(norm) && GENERIC_SSN_ALIASES.some((alias) => similarity(norm, alias) > 0.8);
    const isGenericName = !hasRoleWord(norm) && (norm === 'name' || GENERIC_NAME_ALIASES.some((alias) => similarity(norm, alias) > 0.9));

    if (isGenericSsn) {
      GENERIC_SSN_PRIORITY.forEach((field, priority) => candidates.push({ header, field, score: 0.5 - priority * 0.01 }));
      return;
    }
    if (isGenericName) {
      GENERIC_NAME_PRIORITY.forEach((field, priority) => candidates.push({ header, field, score: 0.5 - priority * 0.01 }));
      return;
    }

    for (const field of TARGET_FIELDS) {
      const score = bestScoreForField(norm, field);
      if (score >= 0.4) candidates.push({ header, field, score });
    }
  });

  candidates.sort((a, b) => b.score - a.score);

  const headerClaimed = new Set<string>();
  for (const c of candidates) {
    if (headerClaimed.has(c.header) || claimed.has(c.field)) continue;
    result[c.header] = c.field;
    claimed.add(c.field);
    headerClaimed.add(c.header);
  }

  return result;
}
