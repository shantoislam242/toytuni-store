"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatTk } from "@/lib/format";
import type { AdminOrderListItem } from "@/lib/admin/queries";
import { ORDER_STATUSES } from "@/lib/orders/status-workflow";
import { cn } from "@/lib/utils";

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

const PAYMENT_STATUSES = ["pending", "paid", "refunded"] as const;

/** Paid=green / Pending=amber / Refunded=slate — mirrors
 *  `paymentBadgeClass` on the order-detail page so the two stay consistent. */
function paymentBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "border-transparent bg-emerald-100 text-emerald-800";
    case "pending":
      return "border-transparent bg-amber-100 text-amber-800";
    case "refunded":
      return "border-transparent bg-slate-200 text-slate-700";
    default:
      return "border-cream-300 text-ink-muted";
  }
}

function PaymentBadge({ status }: { status: string }) {
  return (
    <Badge className={paymentBadgeClass(status)}>
      {status ? status[0].toUpperCase() + status.slice(1) : status}
    </Badge>
  );
}

/**
 * Orders list (Task 6). Client component so the order-number/phone search
 * can filter instantly — the underlying data (`getAdminOrders()`, service-role)
 * is fetched once, server-side, by the parent page.
 */
export function OrdersTable({ orders }: { orders: AdminOrderListItem[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQuery =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || o.paymentStatus === paymentFilter;
      return matchesQuery && matchesStatus && matchesPayment;
    });
  }, [orders, query, statusFilter, paymentFilter]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order # or phone…"
            className="h-9 pl-8"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger size="sm" className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger size="sm" className="h-9 w-40">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Total</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Payment</th>
              <th className="px-4 py-2.5 font-medium">Tracking</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-muted">
                  No orders match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id} className="border-b border-cream-200 last:border-b-0 hover:bg-cream-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-ink">
                    <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(order.createdAt.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <div className="text-ink">{order.customerName}</div>
                    <div className="text-xs text-ink-soft">{order.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{formatTk(order.total)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    {order.trackingNumber ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                        <Truck className="size-3.5 shrink-0" />
                        {order.carrier}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs font-medium text-neem-deep hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
