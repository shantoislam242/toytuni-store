import { describe, it, expect } from "vitest";
import { computeOrderTotals } from "@/lib/data/order-totals";

describe("computeOrderTotals", () => {
  it("sums line totals and adds delivery", () => {
    const r = computeOrderTotals(
      [{ unitPrice: 720, qty: 5 }, { unitPrice: 1000, qty: 2 }], 60);
    expect(r.lineTotals).toEqual([3600, 2000]);
    expect(r.subtotal).toBe(5600);
    expect(r.total).toBe(5660);
  });
  it("handles an empty order", () => {
    expect(computeOrderTotals([], 0)).toEqual({ subtotal: 0, total: 0, lineTotals: [] });
  });
});
