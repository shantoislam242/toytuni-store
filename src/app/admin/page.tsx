import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  Coins,
  Hourglass,
  PackageCheck,
  PackageX,
  Receipt,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTk } from "@/lib/format";
import { getRecentOrders } from "@/lib/admin/queries";
import { getOverviewStats, getRevenueTimeseries, getTopProducts } from "@/lib/admin/analytics";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueOrdersChart } from "@/components/admin/charts/revenue-orders-chart";
import { cn } from "@/lib/utils";

export function generateMetadata(): Metadata {
  return {
    title: "Dashboard",
    robots: { index: false, follow: false },
  };
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-mustard/15 text-mustard",
  confirmed: "bg-dusty-blue/15 text-dusty-blue",
  shipped: "bg-dusty-blue/15 text-dusty-blue",
  delivered: "bg-neem/15 text-neem-deep",
  cancelled: "bg-danger/15 text-danger",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

/**
 * Admin dashboard (Analytics AN-1, Task 5): KPI grid with month-over-month
 * trends, a 12-month revenue+orders chart, a 30-day top-products list, and
 * the 5 most recent orders. All reads (Task 4's `analytics.ts`/`queries.ts`)
 * are fail-soft, so the page renders zeros/empty states instead of 500ing
 * even before migration 0012 is applied.
 */
export default async function Page() {
  const now = new Date();
  const start12mo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const start30d = new Date(now.getTime() - 30 * 864e5);

  const [stats, series, topProducts, recentOrders] = await Promise.all([
    getOverviewStats(now),
    getRevenueTimeseries(start12mo, now, "month"),
    getTopProducts(start30d, now, 5),
    getRecentOrders(5),
  ]);

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
        Overview
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">
        Dashboard
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value={formatTk(stats.revenue.value)} trend={stats.revenue.trend} icon={Coins} />
        <KpiCard
          label="Orders"
          value={stats.orders.value.toLocaleString("en-US")}
          trend={stats.orders.trend}
          icon={ClipboardList}
        />
        <KpiCard
          label="New Customers"
          value={stats.newCustomers.value.toLocaleString("en-US")}
          trend={stats.newCustomers.trend}
          icon={UserPlus}
        />
        <KpiCard label="AOV" value={formatTk(stats.aov.value)} trend={stats.aov.trend} icon={Receipt} />

        <KpiCard label="Pending" value={stats.pending.toLocaleString("en-US")} icon={Hourglass} />
        <KpiCard label="Delivered" value={stats.delivered.toLocaleString("en-US")} icon={PackageCheck} />
        <KpiCard label="Cancelled" value={stats.cancelled.toLocaleString("en-US")} icon={XCircle} />
        <KpiCard label="Low Stock" value={stats.lowStock.toLocaleString("en-US")} icon={PackageX} />
      </div>

      <Card className="mt-6 border-cream-300">
        <CardHeader>
          <CardTitle>Revenue &amp; Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueOrdersChart data={series} />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No sales yet</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {topProducts.map((p) => (
                  <li key={p.productId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                      <p className="text-xs text-ink-muted">{p.qty.toLocaleString("en-US")} sold</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-ink">{formatTk(p.revenue)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No orders yet</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {recentOrders.map((order) => (
                  <li key={order.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="flex items-center justify-between gap-3 hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-ink">{order.orderNumber}</p>
                        <p className="truncate text-xs text-ink-muted">{order.customerName}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-sm font-medium text-ink">{formatTk(order.total)}</p>
                        <StatusBadge status={order.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
