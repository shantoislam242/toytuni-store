import "server-only";
import { cache } from "react";
import { getFullCatalog } from "@/lib/data/full-catalog";
import type { OverlaidProduct } from "@/lib/data/product-overlay";
import * as sel from "@/lib/data/catalog-selectors";

/**
 * Storefront catalogue module. The DB (`products` + joined `inventory` /
 * `product_variants`) is now the source of truth for the whole catalogue —
 * structure AND price / stock / pre-order — via `getFullCatalog`, which already
 * returns each product with a computed `availability`. The Phase-1 mock →
 * overlay merge is gone; the full row is the product.
 *
 * All reads go through React `cache`, so no matter how many selectors a single
 * request calls, the DB is hit at most once per render pass (per the Next.js
 * "Deduplicating requests" guidance for non-`fetch` data access).
 */

// One DB round-trip per request regardless of how many callers.
const fullCatalog = cache(getFullCatalog);

// Gift kits + gift cards are cart-addable products that also live in the DB
// (seeded so checkout can resolve them), but — like in Phase 1 — they must NOT
// surface in the main PLPs, rails or hub counts; they appear only on /gift and
// their own PDPs. They carry no shelf category in the DB (`category_slug` is
// nulled by the seed, mapped to "" by `rowToFullProduct`), so exclude them
// from the shelf catalogue by that DB-native discriminator rather than a
// mock-derived slug list.
/** The shelf catalogue: every active product except gift kits/cards. */
export const getCatalog = cache(async (): Promise<OverlaidProduct[]> => {
  const all = await fullCatalog();
  return all.filter((p) => p.categorySlug !== "");
});

/**
 * Resolve any sellable product (shelf catalogue + gift kits + gift cards) for
 * the PDP. Gift kits/cards are in the DB catalogue too, so a single lookup over
 * the full (unfiltered) list resolves them — this is what keeps
 * `/products/gift-card-500` and the gift-kit PDPs working.
 */
export async function getCatalogProduct(
  slug: string,
): Promise<OverlaidProduct | null> {
  const all = await fullCatalog();
  return all.find((p) => p.slug === slug) ?? null;
}

export const getBestSellers = async (): Promise<OverlaidProduct[]> =>
  sel.selectBestSellers(await getCatalog());
export const getNewLaunches = async (): Promise<OverlaidProduct[]> =>
  sel.selectNewLaunches(await getCatalog());
export const getGiftPicks = async (): Promise<OverlaidProduct[]> =>
  sel.selectGiftPicks(await getCatalog());
export const getDeals = async (): Promise<OverlaidProduct[]> =>
  sel.selectDeals(await getCatalog());
export const getNeemWood = async (): Promise<OverlaidProduct[]> =>
  sel.selectNeemWood(await getCatalog());
export const getRelated = async (
  slug: string,
  limit = 10,
): Promise<OverlaidProduct[]> => sel.selectRelated(await getCatalog(), slug, limit);
