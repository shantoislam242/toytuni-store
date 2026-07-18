import { describe, it, expect, vi } from "vitest";

// `full-catalog.ts` is marked `server-only`, which throws on import outside a
// React Server Component. Stub it so the pure `rowToFullProduct` mapper can
// be unit-tested here without a Next.js server runtime.
vi.mock("server-only", () => ({}));

import { rowToFullProduct, type FullProductRow } from "@/lib/data/full-catalog";

describe("rowToFullProduct", () => {
  it("maps every Product field from a fully-populated row (variants + kit_contents + image_url)", () => {
    const row: FullProductRow = {
      slug: "explorer-gift-kit",
      sku: "NWR-0099",
      title: "Explorer Gift Kit",
      price: 2500,
      compare_at_price: 3000,
      rating: 4.9,
      review_count: 42,
      age_tier_slug: "1-2y",
      category_slug: "gift-kits",
      badge: "Limited",
      image_label: "Explorer Kit",
      image_tones: ["mustard", "cream"],
      image_url: "https://example.com/img.png",
      kit_contents: ["Rattle", "Blocks", "Book"],
      preorder_ship_date: null,
      product_variants: [
        { name: "Neem", tone: "neem-soft" },
        { name: "Teak", tone: "wood" },
      ],
    };

    const p = rowToFullProduct(row);

    expect(p).toEqual({
      slug: "explorer-gift-kit",
      sku: "NWR-0099",
      titleBn: "Explorer Gift Kit",
      price: 2500,
      compareAtPrice: 3000,
      rating: 4.9,
      reviewCount: 42,
      ageTierSlug: "1-2y",
      categorySlug: "gift-kits",
      badge: "Limited",
      imageTones: ["mustard", "cream"],
      imageLabelBn: "Explorer Kit",
      imageUrl: "https://example.com/img.png",
      kitContents: ["Rattle", "Blocks", "Book"],
      variants: [
        { name: "Neem", tone: "neem-soft" },
        { name: "Teak", tone: "wood" },
      ],
    });
  });

  it("leaves compareAtPrice, imageUrl, kitContents, variants and badge undefined when the row has none", () => {
    const row: FullProductRow = {
      slug: "wooden-shape-sorter",
      sku: "NWR-0003",
      title: "Wooden Shape Sorter",
      price: 980,
      compare_at_price: null,
      rating: 4.7,
      review_count: 76,
      age_tier_slug: "1-2y",
      category_slug: "stacking-sorting-puzzles",
      badge: null,
      image_label: "Shape Sorter",
      image_tones: ["terracotta", "cream"],
      image_url: null,
      kit_contents: null,
      preorder_ship_date: null,
      product_variants: [],
    };

    const p = rowToFullProduct(row);

    expect(p.compareAtPrice).toBeUndefined();
    expect(p.imageUrl).toBeUndefined();
    expect(p.kitContents).toBeUndefined();
    expect(p.variants).toBeUndefined();
    expect(p.badge).toBeUndefined();
    // structure still maps correctly
    expect(p.slug).toBe("wooden-shape-sorter");
    expect(p.titleBn).toBe("Wooden Shape Sorter");
    expect(p.imageTones).toEqual(["terracotta", "cream"]);
    expect(p.rating).toBe(4.7);
    expect(p.reviewCount).toBe(76);
    expect(p.ageTierSlug).toBe("1-2y");
    expect(p.categorySlug).toBe("stacking-sorting-puzzles");
  });

  it("also tolerates a row missing product_variants entirely (no join requested)", () => {
    const row: FullProductRow = {
      slug: "wooden-shape-sorter",
      sku: "NWR-0003",
      title: "Wooden Shape Sorter",
      price: 980,
      compare_at_price: null,
      rating: 4.7,
      review_count: 76,
      age_tier_slug: "1-2y",
      category_slug: "stacking-sorting-puzzles",
      badge: null,
      image_label: "Shape Sorter",
      image_tones: ["terracotta", "cream"],
      image_url: null,
      kit_contents: null,
      preorder_ship_date: null,
    };

    const p = rowToFullProduct(row);
    expect(p.variants).toBeUndefined();
  });
});
