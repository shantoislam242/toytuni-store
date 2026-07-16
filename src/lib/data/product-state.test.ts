import { describe, it, expect } from "vitest";
import { getProductState } from "@/lib/data/product-state";

const now = new Date("2026-07-16T00:00:00Z");

describe("getProductState", () => {
  it("in stock when qty > 0", () => {
    expect(getProductState({ stockQty: 3, preorderShipDate: null, now }))
      .toEqual({ state: "in_stock", stockQty: 3 });
  });
  it("pre-order when qty <= 0 and ship date is in the future", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: "2026-09-01", now }))
      .toEqual({ state: "preorder", shipDate: "2026-09-01" });
  });
  it("sold out when qty <= 0 and no ship date", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: null, now }))
      .toEqual({ state: "sold_out" });
  });
  it("sold out when the ship date has passed", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: "2026-01-01", now }))
      .toEqual({ state: "sold_out" });
  });
  it("sold out when the ship date equals now (boundary, strictly-future required)", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: "2026-07-16", now }))
      .toEqual({ state: "sold_out" });
  });
});
