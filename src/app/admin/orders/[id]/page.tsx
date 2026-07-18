import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTk } from "@/lib/format";
import { getAdminOrderById } from "@/lib/admin/queries";
import { OrderStatusSelect } from "@/components/admin/order-status-select";

export function generateMetadata(): Metadata {
  return {
    title: "Order",
    robots: { index: false, follow: false },
  };
}

function fulfillmentLabel(type: string): string {
  return type === "preorder" ? "Pre-order" : "In stock";
}

/** Order detail (Task 6). `getAdminOrderById()` is service-role — server-only. */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) notFound();

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to orders
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
            Order
          </p>
          <h1 className="mt-1 font-mono text-2xl font-bold text-ink">
            {order.orderNumber}
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Placed {formatDate(order.createdAt.slice(0, 10))} · {order.paymentMethod.toUpperCase()}
          </p>
        </div>
        <OrderStatusSelect orderId={order.id} current={order.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-cream-300">
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-muted">
                      <th className="py-2 pr-3 font-medium">Item</th>
                      <th className="py-2 pr-3 font-medium">Fulfillment</th>
                      <th className="py-2 pr-3 text-right font-medium">Qty</th>
                      <th className="py-2 pr-3 text-right font-medium">Unit</th>
                      <th className="py-2 text-right font-medium">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b border-cream-200 last:border-b-0">
                        <td className="py-2.5 pr-3 text-ink">{item.title}</td>
                        <td className="py-2.5 pr-3 text-ink-muted">
                          {fulfillmentLabel(item.fulfillmentType)}
                          {item.preorderShipDate ? (
                            <span className="block text-xs text-ink-soft">
                              Ships {formatDate(item.preorderShipDate)}
                            </span>
                          ) : null}
                          {item.preorderAdvancePct != null ? (
                            <span className="block text-xs text-ink-soft">
                              Advance {item.preorderAdvancePct}%
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-ink">{item.qty}</td>
                        <td className="py-2.5 pr-3 text-right text-ink">{formatTk(item.unitPrice)}</td>
                        <td className="py-2.5 text-right font-medium text-ink">{formatTk(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
            </CardContent>
          </Card>

          <Card className="border-cream-300">
            <CardHeader>
              <CardTitle>Delivery address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-ink">
              <p>{order.addressLine}</p>
              {order.landmark ? <p className="text-ink-muted">{order.landmark}</p> : null}
              <p className="text-ink-muted">
                {order.area}, {order.district}, {order.division}
              </p>
            </CardContent>
          </Card>

          {order.notes ? (
            <Card className="border-cream-300">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-ink">{order.notes}</CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="border-cream-300 lg:col-span-1">
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium text-ink">{order.customerName}</p>
            <p className="text-ink-muted">{order.customerPhone}</p>
            {order.customerEmail ? <p className="text-ink-muted">{order.customerEmail}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
