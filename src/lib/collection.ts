// Pure, UI-free helpers for the collection / product-listing page (PLP).
// Filtering and sorting are kept here so they can be reasoned about and
// tested independently of any React component.

import type { Product } from "@/lib/types";

/** Sort options offered in the toolbar dropdown. */
export type SortKey =
  | "featured" // mock array order (default)
  | "best-selling" // reviewCount desc
  | "price-asc"
  | "price-desc"
  | "title-asc"
  | "title-desc";

/** Active facet selections. Empty arrays mean "no constraint" for that facet. */
export type Filters = {
  ages: string[]; // ageTierSlug[]
  badges: string[]; // ("New" | "Best Seller" | "Limited")[]
  maxPrice: number; // upper bound from the price slider
};

/** Ordered label map for the sort `Select`. */
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "best-selling", label: "Best selling" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "title-asc", label: "Alphabetically, A–Z" },
  { value: "title-desc", label: "Alphabetically, Z–A" },
];

/** Highest product price → used as the price slider's ceiling. */
export const priceCeiling = (items: Product[]): number =>
  items.reduce((max, p) => Math.max(max, p.price), 0);

/** A Filters value that selects everything (no constraints). */
export const emptyFilters = (items: Product[]): Filters => ({
  ages: [],
  badges: [],
  maxPrice: priceCeiling(items),
});

/**
 * Apply facet filters. Within a facet the match is OR (any selected age),
 * across facets it is AND (age AND badge AND price).
 */
export function applyFilters(items: Product[], f: Filters): Product[] {
  return items.filter((p) => {
    const ageOk = f.ages.length === 0 || f.ages.includes(p.ageTierSlug);
    const badgeOk =
      f.badges.length === 0 || (p.badge ? f.badges.includes(p.badge) : false);
    const priceOk = p.price <= f.maxPrice;
    return ageOk && badgeOk && priceOk;
  });
}

/** Return a new, sorted array (never mutates the input). */
export function applySort(items: Product[], key: SortKey): Product[] {
  const copy = [...items];
  switch (key) {
    case "best-selling":
      return copy.sort((a, b) => b.reviewCount - a.reviewCount);
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "title-asc":
      return copy.sort((a, b) => a.titleBn.localeCompare(b.titleBn));
    case "title-desc":
      return copy.sort((a, b) => b.titleBn.localeCompare(a.titleBn));
    case "featured":
    default:
      return copy; // preserve mock order
  }
}
