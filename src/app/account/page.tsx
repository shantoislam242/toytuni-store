import type { Metadata } from "next";
import Link from "next/link";
import { Package, Clock, Wallet, ArrowRight, ShoppingBag } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getCustomerDashboard } from "@/lib/data/account";
import { getSettings } from "@/lib/data/settings";
import { customerTier } from "@/lib/admin/customer-tier";
import { pointsFromSpend, TIER_META } from "@/lib/account/loyalty";
import { formatDate, formatTk } from "@/lib/format";
import { StatCard } from "@/components/account/stat-card";
import { WishlistStatCard } from "@/components/account/wishlist-stat-card";
import { cn } from "@/lib/utils";

export function generateMetadata(): Metadata {
  return {
    title: "My Account",
    description: "Your dashboard: orders, loyalty tier, and saved items.",
    robots: { index: false, follow: true },
  };
}

/**
 * `/account` Overview. The surrounding layout already gated the session and
 * rendered the sidebar; this page just needs the signed-in user's own stats.
 * The `getCustomerDashboard` read is deduped with the layout's via React
 * `cache()` on the underlying `getOrdersForEmail`.
 */
export default async function Page() {
  const user = await getSessionUser();
  if (!user?.email) return null; // gated by the layout — defensive.

  const [dashboard, settings] = await Promise.all([
    getCustomerDashboard(user.email),
    getSettings(),
  ]);
  const tier = customerTier(dashboard.rewardableSpent, settings.customerTiers);
  const points = pointsFromSpend(dashboard.rewardableSpent);
  const meta = TIER_META[tier];
  const firstName = (user.user_metadata?.full_name ?? user.email).split(/[\s@]/)[0];

  return (
    <div>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Overview</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">
            Welcome back, {firstName}
          </h1>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide", meta.badge)}>
          {meta.label} · {points.toLocaleString("en-US")} pts
        </span>
      </div>

      {/* stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Package} label="Total orders" value={dashboard.totalOrders} accent="neem" />
        <StatCard icon={Clock} label="Pending" value={dashboard.pendingOrders} hint="Awaiting fulfilment" accent="mustard" />
        <WishlistStatCard />
        <StatCard icon={Wallet} label="Total spent" value={formatTk(dashboard.totalSpent)} accent="blue" />
      </div>

      {/* recent orders */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">Recent orders</h2>
          {dashboard.totalOrders > 0 ? (
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1 text-sm font-semibold text-neem-deep hover:text-neem"
            >
              View all <ArrowRight className="size-4" />
            </Link>
          ) : null}
        </div>

        {dashboard.recentOrders.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
              <ShoppingBag className="size-6" />
            </span>
            <p className="mt-4 font-medium text-ink">You haven&apos;t placed any orders yet</p>
            <p className="mt-1 text-sm text-ink-muted">Your orders will appear here once you check out.</p>
            <Link
              href="/collections/all"
              className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-neem px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep"
            >
              Start shopping <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {dashboard.recentOrders.map((order) => (
              <li key={order.orderNumber}>
                <Link
                  href={`/account/orders/${order.orderNumber}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-cream-300 bg-card p-4 transition-colors hover:border-neem/40 hover:bg-cream-50/60"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-ink">{order.orderNumber}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-neem/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
                      {order.status}
                    </span>
                    <span className="font-display text-lg font-bold text-ink">{formatTk(order.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
