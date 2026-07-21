import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/admin/kpi-card";
import { formatDate, formatTk } from "@/lib/format";
import { getAdminCustomerById } from "@/lib/admin/queries";
import type { CustomerTier } from "@/lib/admin/customer-tier";
import { CustomerEditForm } from "@/components/admin/customer-edit-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer", robots: { index: false, follow: false } };

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-mustard/15 text-mustard",
  confirmed: "bg-dusty-blue/15 text-dusty-blue",
  shipped: "bg-dusty-blue/15 text-dusty-blue",
  delivered: "bg-neem/15 text-neem-deep",
  cancelled: "bg-danger/15 text-danger",
};

/** Customer lifecycle status badge — active=green / inactive=slate / blocked=red. */
const CUSTOMER_STATUS_STYLES: Record<string, string> = {
  active: "bg-neem/10 text-neem-deep",
  inactive: "bg-cream-200 text-ink-muted",
  blocked: "bg-danger/10 text-danger",
};

/** Spend-tier badge — distinct cream/mustard/gold-ish styles. */
const TIER_STYLES: Record<CustomerTier, string> = {
  bronze: "bg-cream-200 text-ink-muted",
  silver: "bg-dusty-blue/15 text-dusty-blue",
  gold: "bg-mustard/20 text-mustard",
};

function badgeClass(...classes: string[]) {
  return cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", ...classes);
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getAdminCustomerById(id);
  if (!customer) notFound();

  const daysAgo = customer.lastOrderAt
    ? Math.max(0, Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / 86400000))
    : null;

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-ink">{customer.name}</h1>
        <span className={badgeClass(CUSTOMER_STATUS_STYLES[customer.status] ?? "bg-cream-200 text-ink-muted")}>
          {customer.status}
        </span>
        <span className={badgeClass(TIER_STYLES[customer.tier])}>{customer.tier}</span>
      </div>
      <p className="mt-0.5 font-mono text-sm text-ink-muted">{customer.phone}</p>
      {customer.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {customer.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Orders" value={customer.orderCount.toLocaleString("en-US")} />
        <KpiCard label="Spent" value={formatTk(customer.totalSpent)} />
        <KpiCard label="AOV" value={formatTk(customer.aov)} />
        <KpiCard
          label="Last order"
          value={customer.lastOrderAt ? formatDate(customer.lastOrderAt.slice(0, 10)) : "—"}
        />
        <KpiCard label="Cancelled" value={customer.cancelledCount.toLocaleString("en-US")} />
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        {daysAgo !== null ? `Last order ${daysAgo === 0 ? "today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}. ` : ""}
        {customer.firstOrderAt ? `First order ${formatDate(customer.firstOrderAt.slice(0, 10))}.` : ""}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-cream-300">
            <CardHeader><CardTitle>Orders ({customer.orderCount}) · {formatTk(customer.totalSpent)} spent</CardTitle></CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <p className="text-sm text-ink-muted">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-muted">
                        <th className="py-2 pr-3 font-medium">Order</th>
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 pr-3 text-right font-medium">Total</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.orders.map((o) => (
                        <tr key={o.id} className="border-b border-cream-200 last:border-b-0">
                          <td className="py-2.5 pr-3">
                            <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-medium text-ink hover:text-neem-deep">{o.orderNumber}</Link>
                          </td>
                          <td className="py-2.5 pr-3 text-ink-muted">{formatDate(o.createdAt.slice(0, 10))}</td>
                          <td className="py-2.5 pr-3 text-right tabular-nums text-ink">{formatTk(o.total)}</td>
                          <td className="py-2.5">
                            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", STATUS_STYLES[o.status] ?? "bg-muted text-muted-foreground")}>{o.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {customer.lastAddress ? (
            <Card className="border-cream-300">
              <CardHeader><CardTitle>Last delivery address</CardTitle></CardHeader>
              <CardContent className="text-sm text-ink">
                <p>{customer.lastAddress.addressLine}</p>
                {customer.lastAddress.landmark ? <p className="text-ink-muted">{customer.lastAddress.landmark}</p> : null}
                <p className="text-ink-muted">
                  {customer.lastAddress.area}, {customer.lastAddress.district}, {customer.lastAddress.division}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="border-cream-300 lg:col-span-1">
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent>
            <CustomerEditForm
              id={customer.id}
              name={customer.name}
              email={customer.email}
              phone={customer.phone}
              status={customer.status}
              tags={customer.tags}
              notes={customer.notes}
            />
            <p className="mt-3 text-xs text-ink-soft">Joined {formatDate(customer.createdAt.slice(0, 10))}.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
