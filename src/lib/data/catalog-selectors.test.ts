import { describe, it, expect } from "vitest";
import type { OverlaidProduct } from "@/lib/data/product-overlay";
import {
  selectBestSellers,
  selectNewLaunches,
  selectGiftPicks,
  selectDeals,
  selectNeemWood,
  selectRelated,
} from "@/lib/data/catalog-selectors";

/** Build a minimal OverlaidProduct fixture; only the fields the selectors read
 *  need be meaningful. */
function mk(p: Partial<OverlaidProduct> & { slug: string }): OverlaidProduct {
  return {
    slug: p.slug,
    sku: p.sku ?? `SKU-${p.slug}`,
    titleBn: p.titleBn ?? p.slug,
    price: p.price ?? 500,
    rating: p.rating ?? 4.5,
    reviewCount: p.reviewCount ?? 10,
    ageTierSlug: p.ageTierSlug ?? "1-2y",
    categorySlug: p.categorySlug ?? "rattles",
    imageTones: p.imageTones ?? ["cream", "mustard"],
    imageLabelBn: p.imageLabelBn ?? p.slug,
    availability: p.availability ?? { state: "in_stock", stockQty: 25 },
    ...(p.badge ? { badge: p.badge } : {}),
    ...(p.compareAtPrice != null ? { compareAtPrice: p.compareAtPrice } : {}),
  };
}

describe("selectBestSellers", () => {
  it("returns only badge === 'Best Seller'", () => {
    const all = [
      mk({ slug: "a", badge: "Best Seller" }),
      mk({ slug: "b", badge: "New" }),
      mk({ slug: "c" }),
      mk({ slug: "d", badge: "Best Seller" }),
    ];
    expect(selectBestSellers(all).map((p) => p.slug)).toEqual(["a", "d"]);
  });
});

describe("selectGiftPicks", () => {
  it("returns only overlaid price >= 1000 (999 out, 1000 in)", () => {
    const all = [
      mk({ slug: "cheap", price: 999 }),
      mk({ slug: "edge", price: 1000 }),
      mk({ slug: "pricey", price: 2500 }),
    ];
    expect(selectGiftPicks(all).map((p) => p.slug)).toEqual(["edge", "pricey"]);
  });
});

describe("selectDeals", () => {
  it("leaves an already-discounted item unchanged", () => {
    const discounted = mk({ slug: "on-sale", price: 800, compareAtPrice: 1000 });
    const [out] = selectDeals([discounted]);
    expect(out).toBe(discounted); // same reference — untouched
    expect(out.compareAtPrice).toBe(1000);
  });

  it("adds a compareAtPrice > price for a non-discounted item", () => {
    const plain = mk({ slug: "full-price", price: 800, compareAtPrice: undefined });
    const [out] = selectDeals([plain]);
    expect(out.compareAtPrice).toBeGreaterThan(out.price);
  });

  it("only decorates the first 10 products", () => {
    const all = Array.from({ length: 12 }, (_, i) =>
      mk({ slug: `p${i}`, price: 500 }),
    );
    expect(selectDeals(all)).toHaveLength(10);
  });
});

describe("selectNeemWood", () => {
  it("returns only the whitelisted neem-wood slugs", () => {
    const all = [
      mk({ slug: "neem-rattle-set" }),
      mk({ slug: "not-neem" }),
      mk({ slug: "stacking-ring-tower" }),
      mk({ slug: "object-permanence-box" }),
    ];
    expect(selectNeemWood(all).map((p) => p.slug)).toEqual([
      "neem-rattle-set",
      "stacking-ring-tower",
      "object-permanence-box",
    ]);
  });
});

describe("selectRelated", () => {
  const all = [
    mk({ slug: "current", categorySlug: "blocks", ageTierSlug: "1-2y" }),
    mk({ slug: "same-cat", categorySlug: "blocks", ageTierSlug: "0-6m" }),
    mk({ slug: "same-age", categorySlug: "rattles", ageTierSlug: "1-2y" }),
    mk({ slug: "other", categorySlug: "teethers", ageTierSlug: "2-3y-plus" }),
  ];

  it("excludes the current slug and prefers same category, then same age", () => {
    const result = selectRelated(all, "current").map((p) => p.slug);
    expect(result).not.toContain("current");
    expect(result).toEqual(["same-cat", "same-age", "other"]);
  });

  it("respects the limit", () => {
    expect(selectRelated(all, "current", 2).map((p) => p.slug)).toEqual([
      "same-cat",
      "same-age",
    ]);
  });

  it("returns all others (sliced) when the slug is not found", () => {
    const result = selectRelated(all, "missing", 2).map((p) => p.slug);
    expect(result).toHaveLength(2);
    expect(result).not.toContain("missing");
  });
});

describe("selectNewLaunches", () => {
  it("keeps 'traditional-push-wagon' first and excludes discounted New items", () => {
    const all = [
      mk({ slug: "new-a", badge: "New" }),
      mk({ slug: "traditional-push-wagon", badge: "New" }),
      mk({ slug: "new-discounted", badge: "New", price: 800, compareAtPrice: 1000 }),
      mk({ slug: "best", badge: "Best Seller" }),
    ];
    const result = selectNewLaunches(all).map((p) => p.slug);
    expect(result[0]).toBe("traditional-push-wagon");
    expect(result).toContain("new-a");
    expect(result).not.toContain("new-discounted"); // discounted launch excluded
    expect(result).not.toContain("best");
  });
});
