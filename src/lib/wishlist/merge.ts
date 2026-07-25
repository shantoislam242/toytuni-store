/** Max stored slug length — a defensive cap so a corrupt localStorage payload
 *  can't push oversized rows at the DB. Product slugs are short. */
const MAX_SLUG_LEN = 200;

/** Keep only valid, deduped slugs, preserving first-seen order. Guards the
 *  sync path against corrupt localStorage (non-strings, blanks, absurd
 *  lengths, duplicates). */
export function normalizeSlugs(slugs: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of slugs) {
    if (typeof s !== "string") continue;
    const slug = s.trim();
    if (!slug || slug.length > MAX_SLUG_LEN || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

/**
 * Union of a signed-in user's stored (`remote`) wishlist and the slugs they
 * accumulated while signed out (`local`), first-seen order preserved. Used on
 * sign-in so nothing saved on either side is lost. Remote comes first (their
 * existing order is the more meaningful one); local-only additions follow.
 */
export function mergeWishlistSlugs(
  remote: readonly unknown[],
  local: readonly unknown[],
): string[] {
  return normalizeSlugs([...remote, ...local]);
}
