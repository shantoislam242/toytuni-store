import type { Tone } from "@/lib/types";

export type TaxonomyKind = "category" | "ageTier";

/** kind → its DB table + the products FK column that references it + a UI label. */
export const TAXONOMY_TABLES: Record<
  TaxonomyKind,
  { table: "categories" | "age_tiers"; fkColumn: "category_slug" | "age_tier_slug"; label: string }
> = {
  category: { table: "categories", fkColumn: "category_slug", label: "Category" },
  ageTier: { table: "age_tiers", fkColumn: "age_tier_slug", label: "Age tier" },
};

/** The 8 theme tones (mirrors the `Tone` union in src/lib/types.ts). */
export const TONES: Tone[] = [
  "cream", "neem", "neem-soft", "wood", "terracotta", "mustard", "dusty-blue", "blush",
];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate a taxonomy create/edit input. `requireSlug` is true on create (slug
 *  is immutable on edit, so it isn't validated there). Pure. */
export function validateTaxonomyInput(
  input: { slug?: string; title: string; tone: string; sort: number },
  opts: { requireSlug: boolean },
): { ok: true } | { ok: false; error: string } {
  if (opts.requireSlug && (!input.slug || !SLUG_RE.test(input.slug))) {
    return { ok: false, error: "Slug must be lowercase letters, numbers and single dashes." };
  }
  if (input.title.trim() === "") return { ok: false, error: "Name is required." };
  if (!(TONES as string[]).includes(input.tone)) return { ok: false, error: `Invalid tone: ${input.tone}` };
  if (!Number.isInteger(input.sort) || input.sort < 0) {
    return { ok: false, error: "Sort must be a non-negative whole number." };
  }
  return { ok: true };
}

/** Is `next` a permutation of `current` (same set + size, no duplicates)? Pure. */
export function isPermutation(next: string[], current: string[]): boolean {
  if (next.length !== current.length) return false;
  if (new Set(next).size !== next.length) return false;
  const cur = new Set(current);
  return next.every((s) => cur.has(s));
}
