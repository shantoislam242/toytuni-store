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
      .toEqual({ state: "preorder", shipDate: "2026-09-01", deliveryDate: null, advancePct: null, advanceAmount: 0 });
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

describe("getProductState — preorder advance fields", () => {
  const now = new Date("2098-01-01T00:00:00Z");

  it("carries delivery date, advance pct and computed amount for a preorder", () => {
    expect(
      getProductState({
        stockQty: 0,
        preorderShipDate: "2099-01-05",
        preorderDeliveryDate: "2099-01-10",
        preorderAdvancePct: 20,
        price: 720,
        now,
      }),
    ).toEqual({
      state: "preorder",
      shipDate: "2099-01-05",
      deliveryDate: "2099-01-10",
      advancePct: 20,
      advanceAmount: 144,
    });
  });

  it("defaults advance/delivery to null/0 when omitted", () => {
    expect(
      getProductState({ stockQty: 0, preorderShipDate: "2099-01-05", now }),
    ).toEqual({
      state: "preorder",
      shipDate: "2099-01-05",
      deliveryDate: null,
      advancePct: null,
      advanceAmount: 0,
    });
  });

  it("still reports in_stock when stock remains", () => {
    expect(getProductState({ stockQty: 3, preorderShipDate: "2099-01-05", now }))
      .toEqual({ state: "in_stock", stockQty: 3 });
  });
});
