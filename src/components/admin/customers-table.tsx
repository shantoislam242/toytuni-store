"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDate, formatTk } from "@/lib/format";
import type { CustomerListItem } from "@/lib/admin/customer-metrics";

export function CustomersTable({ items }: { items: CustomerListItem[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone or email…"
          aria-label="Search customers"
          className="h-9 w-full rounded-lg border border-cream-300 bg-cream-50/60 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-ink-soft" />
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
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
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{c.orderCount}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink">{formatTk(c.totalSpent)}</td>
                <td className="px-4 py-2.5 text-ink-muted">{c.lastOrderAt ? formatDate(c.lastOrderAt.slice(0, 10)) : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-muted">No customers match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
