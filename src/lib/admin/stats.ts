// Pure aggregation for the admin dashboard. No I/O — callers (queries.ts)
// fetch the rows and pass them in. Kept separate so it's trivially unit
// testable without a database.
export type DashboardStats = {
  orderCount: number;
  revenue: number;
  pendingCount: number;
  lowStockCount: number;
};

export function computeDashboardStats(input: {
  orders: { total: number; status: string }[];
  inventory: { stock_qty: number; low_stock_threshold: number }[];
}): DashboardStats {
  const { orders, inventory } = input;
  return {
    orderCount: orders.length,
    revenue: orders.reduce((sum, o) => sum + o.total, 0),
    pendingCount: orders.filter((o) => o.status === "pending").length,
    lowStockCount: inventory.filter((i) => i.stock_qty <= i.low_stock_threshold).length,
  };
}
