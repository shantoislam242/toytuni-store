import "server-only";
import { cache } from "react";
import { products as mockProducts } from "@/lib/mock/products";
import { giftKits, giftCards } from "@/lib/mock/gifts";
import { getProductOverrides } from "@/lib/data/products";
import { applyOverride, type OverlaidProduct } from "@/lib/data/product-overlay";
import * as sel from "@/lib/data/catalog-selectors";

/**
 * Overlay catalogue data module. The mock stays the source of truth for
 * structure + editorial content; the DB is the source of truth for
 * price / compareAtPrice / stock / pre-order. `applyOverride` merges the two.
 *
 * All reads go through React `cache`, so no matter how many selectors a single
 * request calls, the DB is hit at most once per render pass (per the Next.js
 * "Deduplicating requests" guidance for non-`fetch` data access).
 */

// One DB round-trip per request regardless of how many callers.
const overrides = cache(getProductOverrides);

/** The 17 catalogue products, overlaid with DB price/stock/pre-order. */
export const getCatalog = cache(async (): Promise<OverlaidProduct[]> => {
  const map = await overrides();
  return mockProducts.map((p) => applyOverride(p, map.get(p.slug)));
});

/**
 * Resolve any sellable product (catalogue + gift kits + gift cards) for the
 * PDP. Gift kits/cards have no DB override, so they keep their mock price and
 * read as in stock — this is what keeps `/products/gift-card-500` and the
 * gift-kit PDPs working.
 */
export async function getCatalogProduct(
  slug: string,
): Promise<OverlaidProduct | null> {
  const map = await overrides();
  const base = [...mockProducts, ...giftKits, ...giftCards].find(
    (p) => p.slug === slug,
  );
  return base ? applyOverride(base, map.get(slug)) : null;
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
