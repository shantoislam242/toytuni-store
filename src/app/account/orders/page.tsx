import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getOrdersForEmail } from "@/lib/data/account";
import { formatDate, formatTk } from "@/lib/format";

export function generateMetadata(): Metadata {
  return {
    title: "My Orders",
    robots: { index: false, follow: false },
  };
}

/**
 * `/account/orders` — the signed-in customer's full order history (the
 * Overview shows only the most recent three). Gated by the account layout;
 * the service-role read is scoped to the session email. Each row links to the
 * existing order-detail page.
 */
export default async function Page() {
  const user = await getSessionUser();
  if (!user?.email) return null; // gated by the layout — defensive.

  const orders = await getOrdersForEmail(user.email);

  return (
    <div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Orders</p>
        <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">My orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <ShoppingBag className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">No orders yet</p>
          <p className="mt-1 text-sm text-ink-muted">When you place an order, it&apos;ll show up here.</p>
          <Link
            href="/collections/all"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-neem px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep"
          >
            Start shopping <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.orderNumber}>
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="block rounded-2xl border border-cream-300 bg-card p-5 transition-colors hover:border-neem/40 hover:bg-cream-50/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div>
                    <p className="font-mono text-sm font-semibold text-ink">{order.orderNumber}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-neem/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
                      {order.status}
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-ink">{formatTk(order.total)}</p>
                  </div>
                </div>

                <ul className="mt-3 divide-y divide-cream-200 border-t border-cream-200">
                  {order.items.map((item, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 break-words text-ink">
                        {item.title}
                        <span className="text-ink-soft"> × {item.qty}</span>
                      </span>
                      <span className="tabular-nums font-medium text-ink">{formatTk(item.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
