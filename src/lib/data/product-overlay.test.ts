import { describe, it, expect } from "vitest";
import { applyOverride } from "@/lib/data/product-overlay";
import type { Product } from "@/lib/types";

const now = new Date("2026-07-16T00:00:00Z");
const base: Product = {
  slug: "nesting-cups", sku: "NWR-0016", titleBn: "Stacking Nesting Cups",
  price: 720, rating: 4.8, reviewCount: 118, ageTierSlug: "6-12m",
  categorySlug: "stacking-sorting-puzzles", badge: "Best Seller",
  imageTones: ["dusty-blue", "cream"], imageLabelBn: "Nesting Cups",
};

describe("applyOverride", () => {
  it("applies DB price + compareAt and computes in-stock availability", () => {
    const r = applyOverride(base, { price: 800, compareAtPrice: 999, stockQty: 12, preorderShipDate: null, imageUrl: null }, now);
    expect(r.price).toBe(800);
    expect(r.compareAtPrice).toBe(999);
    expect(r.availability).toEqual({ state: "in_stock", stockQty: 12 });
    expect(r.titleBn).toBe("Stacking Nesting Cups"); // structure preserved
  });

  it("computes pre-order availability when stock 0 and a future ship date", () => {
    const r = applyOverride(base, { price: 720, compareAtPrice: null, stockQty: 0, preorderShipDate: "2026-09-01", imageUrl: null }, now);
    expect(r.availability).toEqual({ state: "preorder", shipDate: "2026-09-01" });
    expect(r.compareAtPrice).toBeUndefined();
  });

  it("keeps base price and treats as in-stock when no override exists", () => {
    const r = applyOverride(base, undefined, now);
    expect(r.price).toBe(720);
    expect(r.availability.state).toBe("in_stock");
  });

  it("sets product.imageUrl when the override carries one", () => {
    const r = applyOverride(
      base,
      { price: 720, compareAtPrice: null, stockQty: 12, preorderShipDate: null, imageUrl: "https://example.com/img.png" },
      now,
    );
    expect(r.imageUrl).toBe("https://example.com/img.png");
  });

  it("leaves product.imageUrl undefined when the override has none", () => {
    const r = applyOverride(
      base,
      { price: 720, compareAtPrice: null, stockQty: 12, preorderShipDate: null, imageUrl: null },
      now,
    );
    expect(r.imageUrl).toBeUndefined();
  });

  it("leaves product.imageUrl undefined when there is no override at all", () => {
    const r = applyOverride(base, undefined, now);
    expect(r.imageUrl).toBeUndefined();
  });
});
