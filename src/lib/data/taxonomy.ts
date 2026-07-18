import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import type { AgeTier, Category, Tone } from "@/lib/types";
import { categories as mockCategories } from "@/lib/mock/categories";
import { ageTiers as mockAgeTiers } from "@/lib/mock/age-tiers";

/** Row shape for the taxonomy selects. Supplied via `.overrideTypes()` rather
 *  than inferred from the `.select()` string — see the note in
 *  `src/lib/data/products.ts` for why automatic `.select()` parsing resolves to
 *  `never` under this repo's pinned `@supabase/ssr` version. `tone`/`tagline`
 *  are nullable (added in migration 0005; a row seeded before it, or an
 *  admin-added row, may have neither). */
type TaxonomyRow = {
  slug: string;
  title: string;
  tone: string | null;
  tagline: string | null;
  sort: number;
};

/** `/collections/<slug>` — both categories and age tiers link here. */
const href = (slug: string) => `/collections/${slug}`;

/**
 * Product categories, read from the DB (`categories`: slug, title, tone,
 * tagline, sort), ordered by `sort`, mapped to the app `Category` shape.
 *
 * Fail-soft: any DB error (or a query against a column that doesn't exist yet,
 * e.g. `tone`/`tagline` before migration 0005) falls back to the mock
 * categories so the storefront nav/hubs never 500 on a Supabase blip.
 *
 * Uses the cookie-less public client (user-independent read, no session) and
 * is wrapped in `unstable_cache` (tag `"taxonomy"`) so it persists across
 * requests, stays out of the per-route dynamic path, and is invalidated on
 * demand by an admin taxonomy write via `revalidateTag("taxonomy")`.
 */
export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("categories")
      .select("slug, title, tone, tagline, sort")
      .order("sort", { ascending: true })
      .overrideTypes<TaxonomyRow[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map((r) => ({
      slug: r.slug,
      nameBn: r.title,
      href: href(r.slug),
      tone: (r.tone ?? "cream") as Tone,
      taglineBn: r.tagline ?? undefined,
    }));
  } catch (err) {
    console.error("getCategories failed; falling back to mock:", err);
    return mockCategories;
  }
  },
  ["taxonomy-categories"],
  { tags: ["taxonomy"], revalidate: 3600 },
);

/**
 * Age tiers, read from the DB (`age_tiers`: slug, title, tone, tagline, sort),
 * ordered by `sort`, mapped to the app `AgeTier` shape. Fail-soft to mock.
 * Cookie-less public client, wrapped in `unstable_cache` (tag `"taxonomy"`).
 */
export const getAgeTiers = unstable_cache(
  async (): Promise<AgeTier[]> => {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("age_tiers")
      .select("slug, title, tone, tagline, sort")
      .order("sort", { ascending: true })
      .overrideTypes<TaxonomyRow[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map((r) => ({
      slug: r.slug,
      labelBn: r.title,
      href: href(r.slug),
      tone: (r.tone ?? "cream") as Tone,
      taglineBn: r.tagline ?? undefined,
    }));
  } catch (err) {
    console.error("getAgeTiers failed; falling back to mock:", err);
    return mockAgeTiers;
  }
  },
  ["taxonomy-age-tiers"],
  { tags: ["taxonomy"], revalidate: 3600 },
);
