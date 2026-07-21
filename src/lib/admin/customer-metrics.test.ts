import { describe, it, expect } from "vitest";
import { aggregateCustomers } from "./customer-metrics";

const customers = [
  { id: "c1", name: "Ayesha", phone: "0171", email: "a@x.com", created_at: "2026-01-01T00:00:00Z" },
  { id: "c2", name: "Bashir", phone: "0172", email: null, created_at: "2026-01-02T00:00:00Z" },
];
const orders = [
  { customer_id: "c1", total: 500, status: "delivered", created_at: "2026-02-01T00:00:00Z" },
  { customer_id: "c1", total: 300, status: "cancelled", created_at: "2026-03-01T00:00:00Z" },
  { customer_id: "c1", total: 200, status: "pending", created_at: "2026-02-15T00:00:00Z" },
];

describe("aggregateCustomers", () => {
  it("counts orders, sums non-cancelled totals, finds last order date", () => {
    const [ayesha, bashir] = aggregateCustomers(customers, orders);
    // sorted by lastOrderAt desc → Ayesha (has orders) first, Bashir (none) last
    expect(ayesha.id).toBe("c1");
    expect(ayesha.orderCount).toBe(3);
    expect(ayesha.totalSpent).toBe(700); // 500 + 200 (300 cancelled excluded)
    expect(ayesha.lastOrderAt).toBe("2026-03-01T00:00:00Z"); // latest of all, incl cancelled
    expect(bashir.orderCount).toBe(0);
    expect(bashir.totalSpent).toBe(0);
    expect(bashir.lastOrderAt).toBeNull();
  });

  it("sorts customers with no orders last", () => {
    const result = aggregateCustomers(customers, orders);
    expect(result.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});

const cust = (id: string, extra = {}) => ({ id, name: "N", phone: "p"+id, email: null, created_at: "2026-01-01", status: "active", tags: [], ...extra });
const ord = (cid: string, total: number, status: string, date: string) => ({ customer_id: cid, total, status, created_at: date });
describe("aggregateCustomers extensions", () => {
  it("aov = spent / non-cancelled count; cancelled excluded from spend but counted", () => {
    const [c] = aggregateCustomers([cust("a")], [
      ord("a", 1000, "delivered", "2026-02-01"),
      ord("a", 500, "delivered", "2026-03-01"),
      ord("a", 9999, "cancelled", "2026-04-01"),
    ]);
    expect(c.totalSpent).toBe(1500);
    expect(c.aov).toBe(750);           // 1500 / 2 non-cancelled
    expect(c.cancelledCount).toBe(1);
    expect(c.orderCount).toBe(3);
    expect(c.firstOrderAt).toBe("2026-02-01");
  });
  it("aov 0 and firstOrderAt null with no orders", () => {
    const [c] = aggregateCustomers([cust("b")], []);
    expect(c.aov).toBe(0); expect(c.firstOrderAt).toBeNull(); expect(c.cancelledCount).toBe(0);
  });
  it("aov 0 when only cancelled orders", () => {
    const [c] = aggregateCustomers([cust("c")], [ord("c", 500, "cancelled", "2026-02-01")]);
    expect(c.aov).toBe(0); expect(c.totalSpent).toBe(0); expect(c.cancelledCount).toBe(1);
  });
  it("passes status + tags through", () => {
    const [c] = aggregateCustomers([cust("d", { status: "blocked", tags: ["vip"] })], []);
    expect(c.status).toBe("blocked"); expect(c.tags).toEqual(["vip"]);
  });
});
