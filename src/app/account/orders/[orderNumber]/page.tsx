import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getOrderForEmail } from "@/lib/data/account";
import { buildTrackingSteps } from "@/lib/orders/tracking-steps";
import { OrderTimelineStepper } from "@/components/orders/order-timeline-stepper";
import { InvoiceDownloadButton } from "@/components/orders/invoice-download-button";
import { formatDate, formatTk } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber}`,
    robots: { index: false, follow: false },
  };
}

/**
 * `/account/orders/[orderNumber]` — a signed-in customer's own order detail:
 * status timeline, tracking, items + totals, and an invoice download.
 * Ownership is enforced entirely by `getOrderForEmail` (session-verified
 * email + order number both have to match) — this page never trusts a
 * client-supplied email, and a signed-out visitor is redirected to sign in
 * before anything is fetched.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const user = await getSessionUser();
  if (!user?.email) redirect(`/signin?next=/account/orders/${orderNumber}`);

  const order = await getOrderForEmail(user.email, orderNumber);
  if (!order) notFound();

  const steps = buildTrackingSteps(order.status, order.historyStatuses);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:py-16">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to account
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
            Order
          </p>
          <h1 className="mt-1 font-mono text-2xl font-bold text-ink">{order.orderNumber}</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Placed {formatDate(order.createdAt.slice(0, 10))}
          </p>
        </div>
        <InvoiceDownloadButton
          href={`/account/orders/${order.orderNumber}/invoice`}
          fileName={`invoice-${order.orderNumber}.pdf`}
        />
      </div>

      <section className="mt-8 rounded-3xl border border-cream-200 bg-cream-50/40 px-6 py-8 shadow-sm sm:px-8">
        <OrderTimelineStepper steps={steps} />
      </section>

      {order.trackingNumber ? (
        <section className="mt-6 flex items-center gap-2 rounded-2xl border border-cream-300 bg-card px-5 py-4 text-sm">
          <Truck className="size-4 shrink-0 text-neem-deep" aria-hidden />
          {order.trackingUrl ? (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline decoration-cream-400 underline-offset-2 hover:text-neem-deep"
            >
              {order.carrier} · {order.trackingNumber}
            </a>
          ) : (
            <span className="text-ink">
              {order.carrier} · {order.trackingNumber}
            </span>
          )}
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-cream-300 bg-card p-5">
        <h2 className="font-display text-lg font-bold text-ink">Items</h2>
        <ul className="mt-3 divide-y divide-cream-200 border-t border-cream-200">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 break-words text-ink">
                <span>
                  {item.title}
                  <span className="text-ink-soft"> × {item.qty}</span>
                </span>
                {order.status === "delivered" && item.slug ? (
                  <Link
                    href={`/products/${item.slug}#reviews`}
                    className="block text-xs text-neem-deep underline-offset-2 hover:underline"
                  >
                    Write a review →
                  </Link>
                ) : null}
              </span>
              <span className="tabular-nums font-medium text-ink">{formatTk(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 ml-auto max-w-52 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Subtotal</span>
            <span>{formatTk(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Delivery</span>
            <span>{formatTk(order.deliveryFee)}</span>
          </div>
          {order.discountTotal > 0 ? (
            <div className="flex justify-between text-neem-deep">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>−{formatTk(order.discountTotal)}</span>
            </div>
          ) : null}
          {order.advanceTotal > 0 ? (
            <div className="flex justify-between text-ink-muted">
              <span>Advance (pre-order)</span>
              <span>{formatTk(order.advanceTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-cream-300 pt-1.5 font-semibold text-ink">
            <span>Total</span>
            <span>{formatTk(order.total)}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
