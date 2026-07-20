import type { Metadata } from "next";
import { Receipt, Repeat, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTk } from "@/lib/format";
import { resolvePeriod } from "@/lib/analytics/period";
import {
  getCustomerStats,
  getLowStockProducts,
  getPaymentBreakdown,
  getRevenueTimeseries,
  getStatusBreakdown,
  getTopProducts,
} from "@/lib/admin/analytics";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueOrdersChart } from "@/components/admin/charts/revenue-orders-chart";
import { StatusDonut } from "@/components/admin/charts/status-donut";
import { PaymentBreakdown } from "@/components/admin/charts/payment-breakdown";
import { PeriodSelector } from "@/components/admin/analytics/period-selector";

export function generateMetadata(): Metadata {
  return {
    title: "Analytics",
    robots: { index: false, follow: false },
  };
}

/**
 * Admin analytics page (Analytics AN-2, Task 5): the period-selector-driven
 * counterpart to the /admin dashboard overview. Composes every AN-1/AN-2
 * range reader (revenue timeseries, status/payment breakdowns, top products,
 * customer stats, low stock) over a single `resolvePeriod`-derived window.
 * Every underlying read is fail-soft, so the page renders zeros/empty states
 * instead of 500ing even before migration 0012 is applied.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const period = resolvePeriod(sp, new Date());

  const [series, statuses, payments, top, customers, lowStock] = await Promise.all([
    getRevenueTimeseries(period.from, period.to, period.bucket),
    getStatusBreakdown(period.from, period.to),
    getPaymentBreakdown(period.from, period.to),
    getTopProducts(period.from, period.to, 10),
    getCustomerStats(period.from, period.to),
    getLowStockProducts(10),
  ]);

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
        Reports
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">
        Analytics
      </h1>

      <div className="mt-4">
        <PeriodSelector active={period.key} from={sp.from} to={sp.to} />
      </div>

      <Card className="mt-6 border-cream-300">
        <CardHeader>
          <CardTitle>Revenue &amp; Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueOrdersChart data={series} />
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="New Customers"
          value={customers.newCustomers.toLocaleString("en-US")}
          icon={UserPlus}
        />
        <KpiCard label="AOV" value={formatTk(customers.aov)} icon={Receipt} />
        <KpiCard
          label="Repeat Customers"
          value={customers.repeatCustomers.toLocaleString("en-US")}
          icon={Repeat}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Order status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonut data={statuses} />
          </CardContent>
        </Card>

        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentBreakdown data={payments} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-cream-300">
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No sales yet</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {top.map((p) => (
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
            <CardTitle>Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">All stocked</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {lowStock.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                    <p className="shrink-0 text-sm font-medium text-ink">
                      {item.stock.toLocaleString("en-US")}/{item.threshold.toLocaleString("en-US")}
                    </p>
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
