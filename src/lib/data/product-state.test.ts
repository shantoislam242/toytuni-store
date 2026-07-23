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

describe("getProductState — store-wide pre-order policy (v2)", () => {
  const now = new Date("2026-07-16T00:00:00Z");
  const policy = {
    preorderEnabled: true,
    preorderThreshold: 3,
    preorderLeadDays: 7,
    preorderDefaultAdvancePct: 20,
  };

  it("LOW stock (at threshold) flips to pre-order with an auto now+leadDays date", () => {
    expect(getProductState({ stockQty: 3, preorderShipDate: null, price: 1000, now, ...policy }))
      .toEqual({
        state: "preorder",
        shipDate: "2026-07-23", // 2026-07-16 + 7 days
        deliveryDate: null,
        advancePct: 20,
        advanceAmount: 200,
      });
  });

  it("stock above the threshold stays in_stock", () => {
    expect(getProductState({ stockQty: 4, preorderShipDate: null, now, ...policy }))
      .toEqual({ state: "in_stock", stockQty: 4 });
  });

  it("zero stock also flips to pre-order under the policy", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: null, price: 500, now, ...policy }))
      .toMatchObject({ state: "preorder", shipDate: "2026-07-23", advancePct: 20, advanceAmount: 100 });
  });

  it("a future per-product ship date overrides the global lead time", () => {
    expect(getProductState({ stockQty: 2, preorderShipDate: "2026-12-01", now, ...policy }))
      .toMatchObject({ state: "preorder", shipDate: "2026-12-01" });
  });

  it("a per-product advance pct overrides the global default", () => {
    expect(getProductState({ stockQty: 1, preorderShipDate: null, preorderAdvancePct: 50, price: 1000, now, ...policy }))
      .toMatchObject({ advancePct: 50, advanceAmount: 500 });
  });

  it("pre-order DISABLED: low stock still sells (in_stock), zero stock is sold out", () => {
    const off = { ...policy, preorderEnabled: false };
    expect(getProductState({ stockQty: 2, preorderShipDate: null, now, ...off }))
      .toEqual({ state: "in_stock", stockQty: 2 });
    expect(getProductState({ stockQty: 0, preorderShipDate: null, now, ...off }))
      .toEqual({ state: "sold_out" });
  });

  it("no lead time + no per-product date → falls back (zero stock = sold out)", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: null, now, preorderThreshold: 3, preorderEnabled: true }))
      .toEqual({ state: "sold_out" });
  });

  it("an explicit future per-product date pre-orders even when the policy is disabled", () => {
    // The global switch governs the auto low-stock flip, not a deliberate
    // per-product pre-order setup.
    expect(getProductState({ stockQty: 0, preorderShipDate: "2026-12-01", now, preorderEnabled: false }))
      .toMatchObject({ state: "preorder", shipDate: "2026-12-01" });
  });
});
