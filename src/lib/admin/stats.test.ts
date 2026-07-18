import { describe, it, expect } from "vitest";
import { computeDashboardStats } from "@/lib/admin/stats";

describe("computeDashboardStats", () => {
  it("aggregates order counts/revenue and low-stock inventory", () => {
    const r = computeDashboardStats({
      orders: [
        { total: 1000, status: "pending" },
        { total: 2500, status: "confirmed" },
        { total: 500, status: "pending" },
        { total: 3200, status: "delivered" },
        { total: 9999, status: "cancelled" },
      ],
      inventory: [
        { stock_qty: 2, low_stock_threshold: 5 }, // below -> low
        { stock_qty: 5, low_stock_threshold: 5 }, // at threshold -> low
        { stock_qty: 20, low_stock_threshold: 5 }, // above -> not low
        { stock_qty: 0, low_stock_threshold: 3 }, // below -> low
      ],
    });
    expect(r.orderCount).toBe(5);
    expect(r.revenue).toBe(7200); // cancelled order's total excluded
    expect(r.pendingCount).toBe(2);
    expect(r.lowStockCount).toBe(3);
  });

  it("returns all zeros for empty input", () => {
    expect(computeDashboardStats({ orders: [], inventory: [] })).toEqual({
      orderCount: 0,
      revenue: 0,
      pendingCount: 0,
      lowStockCount: 0,
    });
  });
});
