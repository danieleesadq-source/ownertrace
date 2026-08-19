/**
 * masking.ts — derives a display-safe masked SSN from a raw one.
 *
 * Seeded demo people never have a raw `ssn` on file (their `maskedSsn` is a
 * hand-written decorative value) — this is only exercised for people
 * created via the Phase 3 import pipeline, where a real SSN may come in
 * from a CSV/manual-entry row and needs to be masked before anything is
 * displayed.
 */

/** Standard US SSN masking convention: only the last 4 digits are ever shown, e.g. `•••-••-1392`. */
export function maskSsn(rawSsn: string | null | undefined): string | null {
  if (!rawSsn) return null;
  const digits = rawSsn.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return `•••-••-${digits.slice(-4)}`;
}
