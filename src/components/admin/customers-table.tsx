"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDate, formatTk } from "@/lib/format";
import type { AdminCustomerListItem } from "@/lib/admin/queries";
import type { CustomerTier } from "@/lib/admin/customer-tier";
import { KpiCard } from "@/components/admin/kpi-card";
import { cn } from "@/lib/utils";

/** Customer lifecycle status badge — active=green / inactive=slate / blocked=red.
 *  Mirrors `CUSTOMER_STATUS_STYLES` in `src/app/admin/customers/[id]/page.tsx`. */
const CUSTOMER_STATUS_STYLES: Record<string, string> = {
  active: "bg-neem/10 text-neem-deep",
  inactive: "bg-cream-200 text-ink-muted",
  blocked: "bg-danger/10 text-danger",
};

/** Spend-tier badge — distinct cream/mustard/gold-ish styles. Mirrors
 *  `TIER_STYLES` in `src/app/admin/customers/[id]/page.tsx`. */
const TIER_STYLES: Record<CustomerTier, string> = {
  bronze: "bg-cream-200 text-ink-muted",
  silver: "bg-dusty-blue/15 text-dusty-blue",
  gold: "bg-mustard/20 text-mustard",
};

function badgeClass(...classes: string[]) {
  return cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide", ...classes);
}

const STATUS_OPTIONS = ["active", "inactive", "blocked"] as const;

export function CustomersTable({ items }: { items: AdminCustomerListItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | (typeof STATUS_OPTIONS)[number]>("all");
  const [tag, setTag] = useState("all");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of items) for (const t of c.tags) set.add(t);
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      const matchesQuery =
        !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || c.status === status;
      const matchesTag = tag === "all" || c.tags.includes(tag);
      return matchesQuery && matchesStatus && matchesTag;
    });
  }, [items, query, status, tag]);

  const kpis = useMemo(() => {
    const total = items.length;
    const active = items.filter((c) => c.status === "active").length;
    const blocked = items.filter((c) => c.status === "blocked").length;
    const totalSpend = items.reduce((s, c) => s + c.totalSpent, 0);
    return { total, active, blocked, totalSpend };
  }, [items]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total customers" value={kpis.total.toLocaleString("en-US")} />
        <KpiCard label="Active" value={kpis.active.toLocaleString("en-US")} />
        <KpiCard label="Blocked" value={kpis.blocked.toLocaleString("en-US")} />
        <KpiCard label="Total spend" value={formatTk(kpis.totalSpend)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm grow">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone or email…"
            aria-label="Search customers"
            className="h-9 w-full rounded-lg border border-cream-300 bg-cream-50/60 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-ink-soft" />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | (typeof STATUS_OPTIONS)[number])}
          aria-label="Filter by status"
          className="h-9 rounded-lg border border-cream-300 bg-cream-50/60 px-3 text-sm text-ink outline-none"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          aria-label="Filter by tag"
          className="h-9 rounded-lg border border-cream-300 bg-cream-50/60 px-3 text-sm text-ink outline-none"
        >
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Tier</th>
              <th className="px-4 py-2.5 text-right font-medium">Orders</th>
              <th className="px-4 py-2.5 text-right font-medium">Total spent</th>
              <th className="px-4 py-2.5 font-medium">Last order</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-cream-200 last:border-b-0 hover:bg-cream-50">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/customers/${c.id}`} className="font-medium text-ink hover:text-neem-deep">{c.name}</Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-ink-muted">{c.phone}</td>
                <td className="px-4 py-2.5 text-ink-muted">{c.email ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={badgeClass(CUSTOMER_STATUS_STYLES[c.status] ?? "bg-cream-200 text-ink-muted")}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={badgeClass(TIER_STYLES[c.tier])}>{c.tier}</span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{c.orderCount}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{formatTk(c.totalSpent)}</td>
                <td className="px-4 py-2.5 text-ink-muted">{c.lastOrderAt ? formatDate(c.lastOrderAt.slice(0, 10)) : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-muted">No customers match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
