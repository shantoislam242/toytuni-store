export type CustomerRow = { id: string; name: string; phone: string; email: string | null; created_at: string };
export type OrderAggRow = { customer_id: string | null; total: number; status: string; created_at: string };
export type CustomerListItem = {
  id: string; name: string; phone: string; email: string | null; createdAt: string;
  orderCount: number; totalSpent: number; lastOrderAt: string | null;
};

/** Per-customer metrics from customers + their orders. `orderCount` = all orders;
 *  `totalSpent` = Σ total excluding cancelled (matches dashboard revenue);
 *  `lastOrderAt` = latest order date (or null). Sorted most-recently-active
 *  first, customers with no orders last. Pure. */
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
    const totalSpent = os.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    const lastOrderAt = os.reduce<string | null>(
      (max, o) => (max === null || o.created_at > max ? o.created_at : max), null,
    );
    return {
      id: c.id, name: c.name, phone: c.phone, email: c.email, createdAt: c.created_at,
      orderCount: os.length, totalSpent, lastOrderAt,
    };
  });

  return items.sort((a, b) => {
    if (a.lastOrderAt === b.lastOrderAt) return 0;
    if (a.lastOrderAt === null) return 1;
    if (b.lastOrderAt === null) return -1;
    return a.lastOrderAt > b.lastOrderAt ? -1 : 1; // desc
  });
}
