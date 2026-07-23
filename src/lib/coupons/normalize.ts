/** Canonical coupon-code form: trimmed + uppercased. Codes are stored and
 *  compared in this form so entry is case-insensitive and whitespace-tolerant. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}
