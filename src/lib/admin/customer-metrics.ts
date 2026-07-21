export type CustomerRow = { id: string; name: string; phone: string; email: string | null; created_at: string; status?: string; tags?: string[] | null };
export type OrderAggRow = { customer_id: string | null; total: number; status: string; created_at: string };
export type CustomerListItem = {
  id: string; name: string; phone: string; email: string | null; createdAt: string;
  orderCount: number; totalSpent: number; lastOrderAt: string | null;
  aov: number; firstOrderAt: string | null; cancelledCount: number; status: string; tags: string[];
};

/** Per-customer metrics from customers + their orders. `orderCount` = all orders;
 *  `totalSpent` = Σ total excluding cancelled (matches dashboard revenue);
 *  `aov` = totalSpent / non-cancelled order count, rounded (0 when none);
 *  `cancelledCount` = count of cancelled orders; `firstOrderAt`/`lastOrderAt` =
 *  earliest/latest order date across all orders (or null). `status`/`tags`
 *  pass through from the customer row (defaults: "active" / []). Sorted
 *  most-recently-active first, customers with no orders last. Pure. */
export function aggregateCustomers(customers: CustomerRow[], orders: OrderAggRow[]): CustomerListItem[] {
  const byCustomer = new Map<string, OrderAggRow[]>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const arr = byCustomer.get(o.customer_id);
    if (arr) arr.push(o);
    else byCustomer.set(o.customer_id, [o]);
  }

  const items: CustomerListItem[] = customers.map((c) => {
    const os = byCustomer.get(c.id) ?? [];
    const nonCancelled = os.filter((o) => o.status !== "cancelled");
    const totalSpent = nonCancelled.reduce((s, o) => s + o.total, 0);
    const aov = nonCancelled.length > 0 ? Math.round(totalSpent / nonCancelled.length) : 0;
    const cancelledCount = os.filter((o) => o.status === "cancelled").length;
    const lastOrderAt = os.reduce<string | null>(
      (max, o) => (max === null || o.created_at > max ? o.created_at : max), null,
    );
    const firstOrderAt = os.reduce<string | null>(
      (min, o) => (min === null || o.created_at < min ? o.created_at : min), null,
    );
    return {
      id: c.id, name: c.name, phone: c.phone, email: c.email, createdAt: c.created_at,
      orderCount: os.length, totalSpent, lastOrderAt,
      aov, firstOrderAt, cancelledCount, status: c.status ?? "active", tags: c.tags ?? [],
    };
  });

  return items.sort((a, b) => {
    if (a.lastOrderAt === b.lastOrderAt) return 0;
    if (a.lastOrderAt === null) return 1;
    if (b.lastOrderAt === null) return -1;
    return a.lastOrderAt > b.lastOrderAt ? -1 : 1; // desc
  });
}
