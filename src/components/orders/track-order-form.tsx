"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderTimelineStepper } from "@/components/orders/order-timeline-stepper";
import { trackOrder, type PublicOrderView } from "@/lib/orders/track-actions";
import { formatDate, formatTk } from "@/lib/format";

/**
 * Public order-tracking form: order# + phone → the masked timeline, tracking,
 * items/totals, and a verified invoice download. The order#+phone pair is the
 * credential — it's kept in state after a successful lookup so the invoice
 * download can re-send it (the invoice route re-verifies server-side). No login
 * involved; nothing sensitive is shown until the phone matches.
 */
export function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, start] = useTransition();
  const [order, setOrder] = useState<PublicOrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const on = orderNumber.trim();
    const ph = phone.trim();
    if (!on || !ph) {
      setError("Enter your order number and the phone used to order.");
      return;
    }
    start(async () => {
      const r = await trackOrder({ orderNumber: on, phone: ph });
      if (r.ok) {
        setOrder(r.order);
        setError(null);
      } else {
        setOrder(null);
        setError(r.error);
      }
    });
  };

  // The invoice route is POST (order#+phone in the body, re-verified there), so
  // the shared GET-only InvoiceDownloadButton doesn't fit — inline a small POST
  // blob-download instead, keeping the res.ok guard + object-URL revoke.
  const downloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const res = await fetch("/track-order/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
      });
      if (!res.ok) {
        toast.error("Couldn't download the invoice. Please try again.");
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't download the invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-8">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Order number
          </span>
          <Input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. TT-10234"
            autoComplete="off"
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Phone number
          </span>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
            className="mt-1"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy ? "Looking up…" : "Track order"}
          </Button>
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {order ? (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="font-mono text-2xl font-bold text-ink">{order.orderNumber}</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {order.customerName} · Placed {formatDate(order.createdAt.slice(0, 10))}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadInvoice}
              disabled={downloading}
            >
              <Download className="size-4" />
              {downloading ? "Preparing…" : "Download invoice"}
            </Button>
          </div>

          <section className="rounded-3xl border border-cream-200 bg-cream-50/40 px-6 py-8 shadow-sm sm:px-8">
            <OrderTimelineStepper steps={order.steps} />
          </section>

          {order.trackingNumber ? (
            <section className="flex items-center gap-2 rounded-2xl border border-cream-300 bg-card px-5 py-4 text-sm">
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

          <section className="rounded-2xl border border-cream-300 bg-card p-5">
            <h2 className="font-display text-lg font-bold text-ink">Items</h2>
            <ul className="mt-3 divide-y divide-cream-200 border-t border-cream-200">
              {order.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 break-words text-ink">
                    {item.title}
                    <span className="text-ink-soft"> × {item.qty}</span>
                  </span>
                  <span className="tabular-nums font-medium text-ink">
                    {formatTk(item.lineTotal)}
                  </span>
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
        </div>
      ) : null}
    </div>
  );
}
