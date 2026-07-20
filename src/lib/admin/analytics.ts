import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { computeTrend, fillBuckets, type SeriesPoint, type Trend } from "@/lib/analytics/transforms";

export type { Trend, SeriesPoint };

export type OverviewStats = {
  revenue: { value: number; trend: Trend };
  orders: { value: number; trend: Trend };
  newCustomers: { value: number; trend: Trend };
  aov: { value: number; trend: Trend };
  pending: number;
  delivered: number;
  cancelled: number;
  lowStock: number;
};

export type TopProduct = { productId: string; title: string; qty: number; revenue: number };
export type StatusSlice = { status: string; count: number };
export type PaymentSlice = { paymentStatus: string; count: number; amount: number };
export type CustomerStats = { newCustomers: number; aov: number; repeatCustomers: number };

const EMPTY_CUSTOMER_STATS: CustomerStats = { newCustomers: 0, aov: 0, repeatCustomers: 0 };
const EMPTY_OVERVIEW: OverviewStats = {
  revenue: { value: 0, trend: { pct: 0, direction: "neutral" } },
  orders: { value: 0, trend: { pct: 0, direction: "neutral" } },
  newCustomers: { value: 0, trend: { pct: 0, direction: "neutral" } },
  aov: { value: 0, trend: { pct: 0, direction: "neutral" } },
  pending: 0,
  delivered: 0,
  cancelled: 0,
  lowStock: 0,
};

/** Calls an analytics RPC (migration 0012) and returns its rows. Fail-soft:
 *  logs + returns `[]` on error instead of throwing, so callers render a
 *  safe empty state even before the migration is applied. New RPCs aren't in
 *  the generated `Database` types yet, hence the `as never` casts. */
async function rpcRows<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const db = createAdminSupabase();
  const { data, error } = await db.rpc(fn as never, args as never).overrideTypes<T[], { merge: false }>();
  if (error) {
    console.error(`analytics ${fn} failed:`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

/** Revenue/order counts bucketed by day or month over `[from, to)`, 0-filled
 *  for buckets with no orders. Fail-soft: RPC error → empty (still 0-filled)
 *  series via `fillBuckets([], ...)`. */
export async function getRevenueTimeseries(
  from: Date,
  to: Date,
  bucket: "month" | "day",
): Promise<SeriesPoint[]> {
  const rows = await rpcRows<{ bucket: string; orders: number | string; revenue: number | string }>(
    "order_timeseries",
    { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket },
  );
  return fillBuckets(
    rows.map((r) => ({ bucket: r.bucket, orders: Number(r.orders), revenue: Number(r.revenue) })),
    from,
    to,
    bucket,
  );
}

/** Best-selling products by revenue over `[from, to)`, cancelled orders excluded. */
export async function getTopProducts(from: Date, to: Date, limit: number): Promise<TopProduct[]> {
  const rows = await rpcRows<{ product_id: string; title: string; qty: number | string; revenue: number | string }>(
    "top_products",
    { p_from: from.toISOString(), p_to: to.toISOString(), p_limit: limit },
  );
  return rows.map((r) => ({
    productId: r.product_id,
    title: r.title,
    qty: Number(r.qty),
    revenue: Number(r.revenue),
  }));
}

/** Order counts grouped by status over `[from, to)`. */
export async function getStatusBreakdown(from: Date, to: Date): Promise<StatusSlice[]> {
  const rows = await rpcRows<{ status: string; count: number | string }>(
    "status_breakdown",
    { p_from: from.toISOString(), p_to: to.toISOString() },
  );
  return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
}

/** Order counts + total amount grouped by payment status over `[from, to)`. */
export async function getPaymentBreakdown(from: Date, to: Date): Promise<PaymentSlice[]> {
  const rows = await rpcRows<{ payment_status: string; count: number | string; amount: number | string }>(
    "payment_breakdown",
    { p_from: from.toISOString(), p_to: to.toISOString() },
  );
  return rows.map((r) => ({
    paymentStatus: r.payment_status,
    count: Number(r.count),
    amount: Number(r.amount),
  }));
}

/** New customers / average order value / repeat-customer count over `[from, to)`.
 *  Single-row RPC — empty result (error or no rows) → all-zero shape. */
export async function getCustomerStats(from: Date, to: Date): Promise<CustomerStats> {
  const rows = await rpcRows<{ new_customers: number | string; aov: number | string; repeat_customers: number | string }>(
    "customer_stats",
    { p_from: from.toISOString(), p_to: to.toISOString() },
  );
  const row = rows[0];
  if (!row) return EMPTY_CUSTOMER_STATS;
  return {
    newCustomers: Number(row.new_customers),
    aov: Number(row.aov),
    repeatCustomers: Number(row.repeat_customers),
  };
}

/** Dashboard overview KPIs: this-month vs last-month revenue/orders/new
 *  customers/AOV (with trend), current-month status counts, and low-stock
 *  count. Every underlying read is fail-soft, and any unexpected throw here
 *  is itself caught → an all-zero `OverviewStats` so the dashboard always
 *  renders, migration 0012 applied or not. */
export async function getOverviewStats(now: Date): Promise<OverviewStats> {
  try {
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const [thisMonthSeries, lastMonthSeries, thisMonthCustomers, lastMonthCustomers, statuses, inventory] =
      await Promise.all([
        getRevenueTimeseries(thisMonthStart, nextMonthStart, "month"),
        getRevenueTimeseries(prevMonthStart, thisMonthStart, "month"),
        getCustomerStats(thisMonthStart, nextMonthStart),
        getCustomerStats(prevMonthStart, thisMonthStart),
        getStatusBreakdown(thisMonthStart, nextMonthStart),
        getLowStockCount(),
      ]);

    const thisMonth = thisMonthSeries[0] ?? { orders: 0, revenue: 0 };
    const lastMonth = lastMonthSeries[0] ?? { orders: 0, revenue: 0 };

    const statusCount = (status: string) =>
      statuses.find((s) => s.status === status)?.count ?? 0;

    return {
      revenue: { value: thisMonth.revenue, trend: computeTrend(thisMonth.revenue, lastMonth.revenue) },
      orders: { value: thisMonth.orders, trend: computeTrend(thisMonth.orders, lastMonth.orders) },
      newCustomers: {
        value: thisMonthCustomers.newCustomers,
        trend: computeTrend(thisMonthCustomers.newCustomers, lastMonthCustomers.newCustomers),
      },
      aov: { value: thisMonthCustomers.aov, trend: computeTrend(thisMonthCustomers.aov, lastMonthCustomers.aov) },
      pending: statusCount("pending"),
      delivered: statusCount("delivered"),
      cancelled: statusCount("cancelled"),
      lowStock: inventory,
    };
  } catch (err) {
    console.error("analytics getOverviewStats failed:", err instanceof Error ? err.message : err);
    return EMPTY_OVERVIEW;
  }
}

/** Count of products at or below their low-stock threshold. Same read
 *  pattern as `getDashboardStats`'s inventory check. Fail-soft: `0` on error. */
async function getLowStockCount(): Promise<number> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("inventory")
    .select("stock_qty, low_stock_threshold")
    .overrideTypes<{ stock_qty: number; low_stock_threshold: number }[], { merge: false }>();
  if (error) {
    console.error("analytics getLowStockCount failed:", error.message);
    return 0;
  }
  return (data ?? []).filter((i) => i.stock_qty <= i.low_stock_threshold).length;
}
