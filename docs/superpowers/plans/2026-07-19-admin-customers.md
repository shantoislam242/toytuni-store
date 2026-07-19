# Admin Customers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An `/admin/customers` list (name/phone/email + order count / total spent / last order + search) and a `/admin/customers/[id]` detail (info + name/email edit + order history linking to order detail), read from `customers` + `orders`.

**Architecture:** A pure `aggregateCustomers` derives per-customer metrics from customers + orders reads; `getAdminCustomers`/`getAdminCustomerById` queries + an `updateCustomer` action back the list/detail/edit; two pages + small client components render them.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-admin-customers-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / `revalidatePath`. Middleware is `src/proxy.ts`.
- **No migration** — `customers (id, phone unique, name, email, created_at)` + `orders (customer_id, total, status, created_at)` exist. Reads use `.overrideTypes<Row[],{merge:false}>()` (the repo pattern).
- **Phone is immutable** (`updateCustomer` writes only name/email). `totalSpent` excludes `status === "cancelled"` (matches the dashboard revenue rule). Editing a customer does NOT rewrite past orders' denormalized snapshots.
- Admin writes re-check `getIsAdmin()` + service-role. `getAdminCustomerById` guards a non-UUID id → null (404, not 500), reusing the file's `UUID_RE`. Customer reads/writes are NOT storefront data → no `revalidateTag('catalog')`. `formatTk`/`formatDate`; toytuni theme. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## File structure

- Create `src/lib/admin/customer-metrics.ts` (+ `.test.ts`) — pure `aggregateCustomers`.
- Modify `src/lib/admin/queries.ts` — `getAdminCustomers` + `getAdminCustomerById`.
- Modify `src/lib/admin/actions.ts` — `updateCustomer`.
- Create `src/app/admin/customers/page.tsx`, `src/app/admin/customers/[id]/page.tsx`, `src/components/admin/customers-table.tsx`, `src/components/admin/customer-edit-form.tsx`; modify `src/components/admin/admin-sidebar.tsx`.

---

## Task 1: Pure `aggregateCustomers` (TDD)

**Files:** Create `src/lib/admin/customer-metrics.ts`, `src/lib/admin/customer-metrics.test.ts`.

**Interfaces:** Produces `CustomerRow`, `OrderAggRow`, `CustomerListItem` types + `aggregateCustomers(customers, orders): CustomerListItem[]`.

- [ ] **Step 1 — failing test** `src/lib/admin/customer-metrics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { aggregateCustomers } from "./customer-metrics";

const customers = [
  { id: "c1", name: "Ayesha", phone: "0171", email: "a@x.com", created_at: "2026-01-01T00:00:00Z" },
  { id: "c2", name: "Bashir", phone: "0172", email: null, created_at: "2026-01-02T00:00:00Z" },
];
const orders = [
  { customer_id: "c1", total: 500, status: "delivered", created_at: "2026-02-01T00:00:00Z" },
  { customer_id: "c1", total: 300, status: "cancelled", created_at: "2026-03-01T00:00:00Z" },
  { customer_id: "c1", total: 200, status: "pending", created_at: "2026-02-15T00:00:00Z" },
];

describe("aggregateCustomers", () => {
  it("counts orders, sums non-cancelled totals, finds last order date", () => {
    const [ayesha, bashir] = aggregateCustomers(customers, orders);
    // sorted by lastOrderAt desc → Ayesha (has orders) first, Bashir (none) last
    expect(ayesha.id).toBe("c1");
    expect(ayesha.orderCount).toBe(3);
    expect(ayesha.totalSpent).toBe(700); // 500 + 200 (300 cancelled excluded)
    expect(ayesha.lastOrderAt).toBe("2026-03-01T00:00:00Z"); // latest of all, incl cancelled
    expect(bashir.orderCount).toBe(0);
    expect(bashir.totalSpent).toBe(0);
    expect(bashir.lastOrderAt).toBeNull();
  });

  it("sorts customers with no orders last", () => {
    const result = aggregateCustomers(customers, orders);
    expect(result.map((c) => c.id)).toEqual(["c1", "c2"]);
  });
});
```

- [ ] **Step 2 — run → FAIL.** `npx vitest run src/lib/admin/customer-metrics.test.ts`

- [ ] **Step 3 — implement `src/lib/admin/customer-metrics.ts`:**

```ts
export type CustomerRow = { id: string; name: string; phone: string; email: string | null; created_at: string };
export type OrderAggRow = { customer_id: string | null; total: number; status: string; created_at: string };
export type CustomerListItem = {
  id: string; name: string; phone: string; email: string | null; createdAt: string;
  orderCount: number; totalSpent: number; lastOrderAt: string | null;
};

/** Per-customer metrics from customers + their orders. `orderCount` = all orders;
 *  `totalSpent` = Σ total excluding cancelled (matches dashboard revenue);
 *  `lastOrderAt` = latest order date (or null). Sorted most-recently-active
 *  first, customers with no orders last. Pure. */
export function aggregateCustomers(customers: CustomerRow[], orders: OrderAggRow[]): CustomerListItem[] {
  const byCustomer = new Map<string, OrderAggRow[]>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    const arr = byCustomer.get(o.customer_id);
    if (arr) arr.push(o);
    else byCustomer.set(o.customer_id, [o]);
  }

  const items: CustomerListItem[] = customers.map((c) => {
    const os = byCustomer.get(c.id) ?? [];
    const totalSpent = os.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
    const lastOrderAt = os.reduce<string | null>(
      (max, o) => (max === null || o.created_at > max ? o.created_at : max), null,
    );
    return {
      id: c.id, name: c.name, phone: c.phone, email: c.email, createdAt: c.created_at,
      orderCount: os.length, totalSpent, lastOrderAt,
    };
  });

  return items.sort((a, b) => {
    if (a.lastOrderAt === b.lastOrderAt) return 0;
    if (a.lastOrderAt === null) return 1;
    if (b.lastOrderAt === null) return -1;
    return a.lastOrderAt > b.lastOrderAt ? -1 : 1; // desc
  });
}
```

- [ ] **Step 4 — run → PASS**, then `npx tsc --noEmit`.
- [ ] **Step 5 — commit** `feat(customers): pure aggregateCustomers metrics (TDD)`.

---

## Task 2: `getAdminCustomers` + `getAdminCustomerById` + `updateCustomer`

**Files:** Modify `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`.

**Interfaces:**
- Consumes: `aggregateCustomers` + its types (Task 1).
- Produces: `getAdminCustomers()`; `getAdminCustomerById(id)` → `AdminCustomerDetail | null`; `updateCustomer(id, {name, email})`.

- [ ] **Step 1 — `queries.ts`.** Import `{ aggregateCustomers, type CustomerRow, type OrderAggRow, type CustomerListItem }` from `@/lib/admin/customer-metrics`. Add:

```ts
export type AdminCustomerOrder = {
  id: string; orderNumber: string; createdAt: string; total: number; status: string;
};
export type AdminCustomerDetail = {
  id: string; name: string; phone: string; email: string | null; createdAt: string;
  orderCount: number; totalSpent: number; lastOrderAt: string | null;
  orders: AdminCustomerOrder[];
};

/** All customers with per-customer order metrics. Service-role. */
export async function getAdminCustomers(): Promise<CustomerListItem[]> {
  const db = createAdminSupabase();
  const [custRes, ordRes] = await Promise.all([
    db.from("customers").select("id, name, phone, email, created_at").overrideTypes<CustomerRow[], { merge: false }>(),
    db.from("orders").select("customer_id, total, status, created_at").overrideTypes<OrderAggRow[], { merge: false }>(),
  ]);
  if (custRes.error) throw new Error(`getAdminCustomers: customers read failed: ${custRes.error.message}`);
  if (ordRes.error) throw new Error(`getAdminCustomers: orders read failed: ${ordRes.error.message}`);
  return aggregateCustomers(custRes.data ?? [], ordRes.data ?? []);
}

/** One customer + their order history (newest first). Non-UUID id → null (404). */
export async function getAdminCustomerById(id: string): Promise<AdminCustomerDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const db = createAdminSupabase();
  const { data: c, error } = await db
    .from("customers").select("id, name, phone, email, created_at").eq("id", id).maybeSingle()
    .overrideTypes<CustomerRow, { merge: false }>();
  if (error) throw new Error(`getAdminCustomerById failed: ${error.message}`);
  if (!c) return null;

  const { data: ords, error: oErr } = await db
    .from("orders").select("id, order_number, created_at, total, status").eq("customer_id", id)
    .order("created_at", { ascending: false })
    .overrideTypes<{ id: string; order_number: string; created_at: string; total: number; status: string }[], { merge: false }>();
  if (oErr) throw new Error(`getAdminCustomerById orders failed: ${oErr.message}`);
  const orders = ords ?? [];

  const totalSpent = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  return {
    id: c.id, name: c.name, phone: c.phone, email: c.email, createdAt: c.created_at,
    orderCount: orders.length, totalSpent, lastOrderAt: orders[0]?.created_at ?? null,
    orders: orders.map((o) => ({ id: o.id, orderNumber: o.order_number, createdAt: o.created_at, total: o.total, status: o.status })),
  };
}
```

(`UUID_RE` is the existing const in this file — reuse it.)

- [ ] **Step 2 — `actions.ts`: `updateCustomer`.** Add (reuse `getIsAdmin`, `createAdminSupabase`, `revalidatePath`, `ActionResult`):

```ts
/** Correct a customer's contact (name required; email optional + light-validated).
 *  Phone (the unique identity key) is never editable. Server Action — admin
 *  re-check + service-role. Does not rewrite past orders' name/email snapshots. */
export async function updateCustomer(id: string, patch: { name: string; email: string | null }): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const name = patch.name.trim();
  if (name === "") return { ok: false, error: "Name is required." };
  const email = (patch.email ?? "").trim();
  if (email !== "" && !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address or leave it blank." };
  }
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("customers").update({ name, email: email === "" ? null : email }).eq("id", id)
    .select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Customer not found." };
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true };
}
```

- [ ] **Step 3 — verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`. Commit `feat(admin): customer list/detail queries + updateCustomer action`.

---

## Task 3: Pages + components + sidebar

**Files:** Create `src/app/admin/customers/page.tsx`, `src/app/admin/customers/[id]/page.tsx`, `src/components/admin/customers-table.tsx`, `src/components/admin/customer-edit-form.tsx`. Modify `src/components/admin/admin-sidebar.tsx`.

**Interfaces:** Consumes `getAdminCustomers`/`getAdminCustomerById` + `updateCustomer` (Task 2).

- [ ] **Step 1 — sidebar.** In `src/components/admin/admin-sidebar.tsx`, remove `disabled: true` from the **Customers** item (leave Blog disabled).

- [ ] **Step 2 — list page** `src/app/admin/customers/page.tsx` (server):

```tsx
import type { Metadata } from "next";
import { getAdminCustomers } from "@/lib/admin/queries";
import { CustomersTable } from "@/components/admin/customers-table";

export const metadata: Metadata = { title: "Customers", robots: { index: false, follow: false } };

export default async function Page() {
  const customers = await getAdminCustomers();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Customers</h1>
      <p className="mt-1 text-sm text-ink-muted">Buyers, their orders, and spend. Most recently active first.</p>
      <div className="mt-6"><CustomersTable items={customers} /></div>
    </div>
  );
}
```

- [ ] **Step 3 — `customers-table.tsx`** (`"use client"`) — searchable table linking each row to the detail:

```tsx
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
```

- [ ] **Step 4 — detail page** `src/app/admin/customers/[id]/page.tsx` (server):

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTk } from "@/lib/format";
import { getAdminCustomerById } from "@/lib/admin/queries";
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

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getAdminCustomerById(id);
  if (!customer) notFound();

  return (
    <div>
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to customers
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">{customer.name}</h1>
      <p className="mt-0.5 font-mono text-sm text-ink-muted">{customer.phone}</p>

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
        </div>

        <Card className="border-cream-300 lg:col-span-1">
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent>
            <CustomerEditForm id={customer.id} name={customer.name} email={customer.email} phone={customer.phone} />
            <p className="mt-3 text-xs text-ink-soft">Joined {formatDate(customer.createdAt.slice(0, 10))}.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

(The small `STATUS_STYLES` badge mirrors `orders-table.tsx`'s — a tiny, intentional duplication to avoid refactoring the orders table this slice.)

- [ ] **Step 5 — `customer-edit-form.tsx`** (`"use client"`):

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateCustomer } from "@/lib/admin/actions";

export function CustomerEditForm({ id, name, email, phone }: { id: string; name: string; email: string | null; phone: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [nameV, setNameV] = useState(name);
  const [emailV, setEmailV] = useState(email ?? "");

  const save = () => {
    if (nameV.trim() === "") return toast.error("Name is required.");
    start(async () => {
      const r = await updateCustomer(id, { name: nameV, email: emailV.trim() === "" ? null : emailV });
      if (r.ok) { toast.success("Customer saved."); router.refresh(); } else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Name</span>
        <Input value={nameV} onChange={(e) => setNameV(e.target.value)} className="mt-1" />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Email</span>
        <Input value={emailV} onChange={(e) => setEmailV(e.target.value)} placeholder="—" className="mt-1" />
      </label>
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Phone</span>
        <p className="mt-1 font-mono text-sm text-ink">{phone}</p>
        <span className="text-xs text-ink-soft">Phone can’t be changed.</span>
      </div>
      <Button onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
    </div>
  );
}
```

- [ ] **Step 6 — verify.** `npx tsc --noEmit && npx vitest run && npm run build` (`/admin/customers` + `/admin/customers/[id]` render). Live (controller, real admin session): the list shows customers with correct metrics + search; a detail shows order history (links resolve to `/admin/orders/[id]`); edit name/email persists; phone read-only; a malformed id 404s; non-admin rejected. Restore any test edits.

- [ ] **Step 7 — commit** `feat(admin): customers list + detail (order history + name/email edit) + sidebar`.

---

## Final verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean; storefront unaffected.
- [ ] End-to-end (real admin session): list metrics correct + search; detail order history + links; name/email edit persists (past order snapshots unchanged); phone immutable; malformed id 404; non-admin rejected.
- [ ] PR to `master`; set the 5 per-branch Supabase preview env vars for this branch if the preview build reports `supabaseUrl is required`, then redeploy (as prior slices).

## Self-Review (done during authoring)

- **Spec coverage:** pure metrics → T1; list/detail queries + updateCustomer → T2; pages/components/sidebar → T3. Phone immutable; totalSpent excludes cancelled; no migration; UUID guard reused.
- **Placeholder scan:** none — real code/commands. The one intentional duplication (STATUS_STYLES badge) is called out.
- **Type consistency:** `aggregateCustomers(customers,orders)→CustomerListItem[]`, `CustomerRow`/`OrderAggRow`/`CustomerListItem`, `getAdminCustomers()`, `getAdminCustomerById(id)→AdminCustomerDetail|null`, `updateCustomer(id,{name,email})` — consistent across tasks.
- **Admin-gating + phone-immutability** are the load-bearing invariants; both in Global Constraints and exercised in T2.
