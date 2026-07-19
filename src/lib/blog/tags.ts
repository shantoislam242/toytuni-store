/** Sanitize admin-supplied post tags: trim whitespace, drop empties, dedupe.
 *  Pure — order-preserving (first occurrence wins). */
export function cleanTags(tags?: string[]): string[] {
  return [...new Set((tags ?? []).map((t) => t.trim()).filter(Boolean))];
}
