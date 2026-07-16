import type { OverlaidProduct } from "@/lib/data/product-overlay";

/**
 * Pure derived-catalogue selectors. Each takes the full list of OVERLAID
 * products (mock structure + DB price/stock/pre-order) and returns a curated
 * subset. The logic mirrors the original mock selectors in
 * `src/lib/mock/products.ts` exactly — the only behavioural change is that
 * prices come from the DB overlay, so e.g. `selectGiftPicks` (price >= 1000)
 * and `selectDeals` (discount off `price`) reflect live pricing.
 *
 * No I/O here — kept pure so the behaviour is unit-testable without the DB.
 */

/** Best Sellers rail = products flagged "Best Seller". */
export function selectBestSellers(all: OverlaidProduct[]): OverlaidProduct[] {
  return all.filter((p) => p.badge === "Best Seller");
}

// The Traditional Push Wagon is the latest launch — lead New Arrivals with it.
const FEATURED_NEW_SLUG = "traditional-push-wagon";

/** New Arrivals rail = "New" items that aren't discounted, push-wagon first. */
export function selectNewLaunches(all: OverlaidProduct[]): OverlaidProduct[] {
  return all
    .filter(
      (p) =>
        p.badge === "New" &&
        !(p.compareAtPrice != null && p.compareAtPrice > p.price),
    )
    .sort((a, b) =>
      a.slug === FEATURED_NEW_SLUG ? -1 : b.slug === FEATURED_NEW_SLUG ? 1 : 0,
    );
}

/** Gift Picks rail = anything at or above ৳1000 (overlaid price). */
export function selectGiftPicks(all: OverlaidProduct[]): OverlaidProduct[] {
  return all.filter((p) => p.price >= 1000);
}

/**
 * Deterministic "random" discount from a slug seed, so the server and client
 * render the same value (no hydration mismatch). UI-only — no pricing backend.
 * Identical to the original mock helper so Deals discounts are unchanged.
 */
function seededDiscountPct(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const choices = [10, 15, 20, 25, 30, 35];
  return choices[h % choices.length];
}

/**
 * Deals rail = the first 10 products shown at a discount. Items already marked
 * down keep their real compareAtPrice; the rest get a deterministic mock
 * discount off the (now DB-sourced) price so the whole rail reads as on-sale.
 */
export function selectDeals(all: OverlaidProduct[]): OverlaidProduct[] {
  return all.slice(0, 10).map((p) => {
    if (p.compareAtPrice != null && p.compareAtPrice > p.price) return p;
    const pct = seededDiscountPct(p.slug);
    return { ...p, compareAtPrice: Math.round(p.price / (1 - pct / 100)) };
  });
}

const NEEM_WOOD_SLUGS = [
  "neem-rattle-set",
  "neem-teether-ring",
  "stacking-ring-tower",
  "wooden-shape-sorter",
  "building-block-set",
  "object-permanence-box",
];

/** Neem-wood collection = a fixed whitelist of slugs. */
export function selectNeemWood(all: OverlaidProduct[]): OverlaidProduct[] {
  return all.filter((p) => NEEM_WOOD_SLUGS.includes(p.slug));
}

/**
 * Related products for the PDP "You may also like" rail. Prefers same category,
 * then same age tier (different category), then the rest; excludes the current
 * product. If the slug isn't found, returns all others sliced to `limit`.
 */
export function selectRelated(
  all: OverlaidProduct[],
  slug: string,
  limit = 10,
): OverlaidProduct[] {
  const current = all.find((p) => p.slug === slug);
  if (!current) return all.filter((p) => p.slug !== slug).slice(0, limit);

  const sameCategory = all.filter(
    (p) => p.slug !== slug && p.categorySlug === current.categorySlug,
  );
  const sameAge = all.filter(
    (p) =>
      p.slug !== slug &&
      p.categorySlug !== current.categorySlug &&
      p.ageTierSlug === current.ageTierSlug,
  );
  const rest = all.filter(
    (p) =>
      p.slug !== slug &&
      p.categorySlug !== current.categorySlug &&
      p.ageTierSlug !== current.ageTierSlug,
  );

  return [...sameCategory, ...sameAge, ...rest].slice(0, limit);
}
