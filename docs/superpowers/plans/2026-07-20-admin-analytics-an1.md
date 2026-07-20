# Admin Analytics AN-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the order/sales analytics data foundation (Postgres aggregation functions + TDD pure transforms + a fail-soft service-role data layer + recharts) and turn the admin overview into a KPI-trend + chart + top-products + recent-orders dashboard.

**Architecture:** Migration 0012 adds read-only `stable` SQL aggregation functions (revoked from anon/auth). Pure transforms (`computeTrend`, `fillBuckets`) are TDD-covered. `src/lib/admin/analytics.ts` (service-role, fail-soft) calls the functions and shapes results. The overview page (`/admin`) fetches server-side and renders recharts in client children.

**Tech Stack:** Next.js 16.2.9 (App Router, `src/proxy.ts`), Supabase (service-role RPC), recharts, vitest (TDD), Tailwind (cream/ink), lucide-react.

## Global Constraints

- Next.js is **non-standard (v16)** — read `node_modules/next/dist/docs/` before route/runtime work. `/admin/*` is already admin-gated (layout + proxy).
- New RPC functions are absent from generated `database.types.ts` → `.rpc("name", args as never)`; shape returned rows with `.overrideTypes<Row[], { merge:false }>()`. Service-role client = `createAdminSupabase()` (`server-only`).
- The data layer is **fail-soft**: any Supabase/`function does not exist` error logs + returns a safe zero/empty shape — the admin page must NEVER 500 (migration 0012 is applied as a release gate; tsc/tests/build don't need it).
- Money is integer BDT; format with `formatTk` (`@/lib/format`, renders `Tk 1,234`). Revenue **excludes cancelled orders**; order counts include all.
- Pure transforms take bounds/`now` as params — **no `Date.now()`/`new Date()` inside** transforms (TDD determinism). Runtime app code (pages/data layer) may use `new Date()`.
- recharts is imported ONLY by `"use client"` components (keep it out of server bundles).
- Run `npx tsc --noEmit && npx vitest run && npm run build` before each commit; clean/green/ok. Do NOT `git add` `.env.local` or `.superpowers/`.

---

### Task 1: Migration 0012 — analytics SQL functions

**Files:**
- Create: `supabase/migrations/0012_analytics_functions.sql`

**Interfaces:**
- Produces RPCs: `order_timeseries(p_from timestamptz, p_to timestamptz, p_bucket text) → (bucket timestamptz, orders bigint, revenue bigint)`; `status_breakdown(p_from, p_to) → (status text, count bigint)`; `payment_breakdown(p_from, p_to) → (payment_status text, count bigint, amount bigint)`; `top_products(p_from, p_to, p_limit int) → (product_id uuid, title text, qty bigint, revenue bigint)`; `customer_stats(p_from, p_to) → (new_customers bigint, aov numeric, repeat_customers bigint)`.

- [ ] **Step 1: Write the migration** (SQL only; the user applies it in the Supabase SQL editor before merge).

```sql
-- 0012_analytics_functions.sql — read-only order/sales aggregation for the admin
-- dashboard + analytics page. All stable, execute revoked from anon/authenticated
-- (called only via the service-role client behind the admin gate).
-- Apply in the Supabase SQL editor after 0011_order_fulfillment.sql.

create or replace function order_timeseries(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table(bucket timestamptz, orders bigint, revenue bigint)
language sql stable as $$
  select date_trunc(p_bucket, created_at) as bucket,
         count(*)::bigint as orders,
         coalesce(sum(total) filter (where status <> 'cancelled'), 0)::bigint as revenue
  from orders
  where created_at >= p_from and created_at < p_to
  group by 1 order by 1;
$$;
revoke execute on function order_timeseries(timestamptz, timestamptz, text) from anon, authenticated;

create or replace function status_breakdown(p_from timestamptz, p_to timestamptz)
returns table(status text, count bigint)
language sql stable as $$
  select status, count(*)::bigint from orders
  where created_at >= p_from and created_at < p_to
  group by status order by 2 desc;
$$;
revoke execute on function status_breakdown(timestamptz, timestamptz) from anon, authenticated;

create or replace function payment_breakdown(p_from timestamptz, p_to timestamptz)
returns table(payment_status text, count bigint, amount bigint)
language sql stable as $$
  select payment_status, count(*)::bigint,
         coalesce(sum(total), 0)::bigint from orders
  where created_at >= p_from and created_at < p_to
  group by payment_status order by 2 desc;
$$;
revoke execute on function payment_breakdown(timestamptz, timestamptz) from anon, authenticated;

create or replace function top_products(p_from timestamptz, p_to timestamptz, p_limit int)
returns table(product_id uuid, title text, qty bigint, revenue bigint)
language sql stable as $$
  select oi.product_id, min(oi.title) as title,
         sum(oi.qty)::bigint as qty, sum(oi.line_total)::bigint as revenue
  from order_items oi join orders o on o.id = oi.order_id
  where o.created_at >= p_from and o.created_at < p_to and o.status <> 'cancelled'
  group by oi.product_id
  order by revenue desc limit p_limit;
$$;
revoke execute on function top_products(timestamptz, timestamptz, int) from anon, authenticated;

create or replace function customer_stats(p_from timestamptz, p_to timestamptz)
returns table(new_customers bigint, aov numeric, repeat_customers bigint)
language sql stable as $$
  select
    (select count(*)::bigint from customers c where c.created_at >= p_from and c.created_at < p_to),
    (select coalesce(avg(total), 0) from orders where created_at >= p_from and created_at < p_to and status <> 'cancelled'),
    (select count(*)::bigint from (
       select customer_id from orders
       where created_at >= p_from and created_at < p_to and customer_id is not null
       group by customer_id having count(*) > 1
     ) r);
$$;
revoke execute on function customer_stats(timestamptz, timestamptz) from anon, authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0012_analytics_functions.sql
git commit -m "feat(analytics): migration 0012 — order/sales aggregation functions"
```

---

### Task 2: Pure transforms — computeTrend + fillBuckets (TDD)

**Files:**
- Create: `src/lib/analytics/transforms.ts` (+ `.test.ts`)

**Interfaces:**
- Produces: `type Trend = { pct: number | null; direction: 'up'|'down'|'neutral' }`; `type SeriesPoint = { label: string; orders: number; revenue: number }`; `computeTrend(current: number, previous: number): Trend`; `fillBuckets(rows: { bucket: string; orders: number; revenue: number }[], from: Date, to: Date, bucket: 'month'|'day'): SeriesPoint[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/analytics/transforms.test.ts
import { describe, it, expect } from "vitest";
import { computeTrend, fillBuckets } from "./transforms";

describe("computeTrend", () => {
  it("up when current exceeds previous", () => {
    expect(computeTrend(150, 100)).toEqual({ pct: 50, direction: "up" });
  });
  it("down when current is below previous", () => {
    expect(computeTrend(80, 100)).toEqual({ pct: -20, direction: "down" });
  });
  it("neutral when equal", () => {
    expect(computeTrend(100, 100)).toEqual({ pct: 0, direction: "neutral" });
  });
  it("null pct + up when previous is zero and current positive", () => {
    expect(computeTrend(50, 0)).toEqual({ pct: null, direction: "up" });
  });
  it("neutral when both zero", () => {
    expect(computeTrend(0, 0)).toEqual({ pct: 0, direction: "neutral" });
  });
  it("rounds to a whole percent", () => {
    expect(computeTrend(133, 100).pct).toBe(33);
  });
});

describe("fillBuckets", () => {
  it("0-fills missing months across the range, chronological", () => {
    const rows = [{ bucket: "2026-03-01T00:00:00.000Z", orders: 2, revenue: 500 }];
    const out = fillBuckets(rows, new Date("2026-01-01T00:00:00Z"), new Date("2026-04-01T00:00:00Z"), "month");
    expect(out).toHaveLength(3); // Jan, Feb, Mar
    expect(out.map((p) => p.orders)).toEqual([0, 0, 2]);
    expect(out[2].revenue).toBe(500);
  });
  it("empty input → full 0-filled range", () => {
    const out = fillBuckets([], new Date("2026-01-01T00:00:00Z"), new Date("2026-03-01T00:00:00Z"), "month");
    expect(out).toHaveLength(2);
    expect(out.every((p) => p.orders === 0 && p.revenue === 0)).toBe(true);
  });
  it("day bucketing", () => {
    const out = fillBuckets([], new Date("2026-01-01T00:00:00Z"), new Date("2026-01-04T00:00:00Z"), "day");
    expect(out).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run → fail** (`npx vitest run src/lib/analytics/transforms.test.ts`).

- [ ] **Step 3: Implement**

```ts
// src/lib/analytics/transforms.ts
export type Trend = { pct: number | null; direction: "up" | "down" | "neutral" };
export type SeriesPoint = { label: string; orders: number; revenue: number };

export function computeTrend(current: number, previous: number): Trend {
  if (previous === 0) {
    return current > 0 ? { pct: null, direction: "up" } : { pct: 0, direction: "neutral" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const direction = current > previous ? "up" : current < previous ? "down" : "neutral";
  return { pct, direction };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Contiguous, 0-filled, chronological series over [from, to) by month or day.
 *  `rows` are keyed by their bucket start (ISO); missing buckets become zeros. */
export function fillBuckets(
  rows: { bucket: string; orders: number; revenue: number }[],
  from: Date, to: Date, bucket: "month" | "day",
): SeriesPoint[] {
  // Index the rows by a UTC period key.
  const key = (d: Date) =>
    bucket === "month"
      ? `${d.getUTCFullYear()}-${d.getUTCMonth()}`
      : `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const byKey = new Map<string, { orders: number; revenue: number }>();
  for (const r of rows) {
    const d = new Date(r.bucket);
    byKey.set(key(d), { orders: r.orders, revenue: r.revenue });
  }
  const out: SeriesPoint[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), bucket === "month" ? 1 : from.getUTCDate()));
  while (cur < to) {
    const hit = byKey.get(key(cur)) ?? { orders: 0, revenue: 0 };
    const label = bucket === "month"
      ? MONTHS[cur.getUTCMonth()]
      : `${cur.getUTCDate()} ${MONTHS[cur.getUTCMonth()]}`;
    out.push({ label, orders: hit.orders, revenue: hit.revenue });
    if (bucket === "month") cur.setUTCMonth(cur.getUTCMonth() + 1);
    else cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
```

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/transforms.ts src/lib/analytics/transforms.test.ts
git commit -m "feat(analytics): pure computeTrend + fillBuckets transforms (TDD)"
```

---

### Task 3: recharts dependency + chart & KPI components

**Files:**
- Modify: `package.json` (add `recharts`)
- Create: `src/components/admin/kpi-card.tsx`, `src/components/admin/charts/revenue-orders-chart.tsx`

**Interfaces:**
- Consumes: `SeriesPoint`, `Trend` (Task 2), `formatTk`.
- Produces: `KpiCard({ label, value, trend?, icon? })`; `RevenueOrdersChart({ data: SeriesPoint[] })`.

- [ ] **Step 1: Add the dependency** — `npm install recharts`. Commit the lockfile with this task.

- [ ] **Step 2: Build `kpi-card.tsx`** (server-safe; presentational). Props `{ label: string; value: string; trend?: Trend; icon?: LucideIcon }`. Render the existing dashboard Card style (mirror `src/app/admin/page.tsx`'s current card) + a small trend badge when `trend` present: `direction === 'up'` green ▲, `'down'` red ▼, `'neutral'` muted; text = `trend.pct === null ? 'New' : \`${trend.pct > 0 ? '+' : ''}${trend.pct}%\``. Keep it dependency-light (no recharts here).

- [ ] **Step 3: Build `revenue-orders-chart.tsx`** (`"use client"`). Props `{ data: SeriesPoint[] }`. A recharts `ComposedChart` in a `ResponsiveContainer` (height ~280): an orders **Bar** (left Y axis) + a revenue **Line** (right Y axis), `XAxis dataKey="label"`, tooltips formatting revenue with `formatTk` and orders as integers, cream/ink palette (bars `var(--primary)`/neem, line a contrasting ink tone). Legend labels "Orders" / "Revenue". Guard empty data (render a muted "No data yet" box when `data.length === 0`).

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add package.json package-lock.json src/components/admin/kpi-card.tsx src/components/admin/charts/revenue-orders-chart.tsx
git commit -m "feat(analytics): recharts dep + KpiCard + RevenueOrdersChart"
```

---

### Task 4: Analytics data layer (fail-soft, service-role)

**Files:**
- Create: `src/lib/admin/analytics.ts`
- Modify: `src/lib/admin/queries.ts` (add `getRecentOrders(limit)`)

**Interfaces:**
- Consumes: `computeTrend`, `fillBuckets`, `SeriesPoint`, `Trend` (Task 2); `createAdminSupabase`; the Task 1 RPCs.
- Produces: `type OverviewStats = { revenue: { value: number; trend: Trend }; orders: { value: number; trend: Trend }; newCustomers: { value: number; trend: Trend }; aov: { value: number; trend: Trend }; pending: number; delivered: number; cancelled: number; lowStock: number }`; `type TopProduct = { productId: string; title: string; qty: number; revenue: number }`; `type StatusSlice = { status: string; count: number }`; `type PaymentSlice = { paymentStatus: string; count: number; amount: number }`; `type CustomerStats = { newCustomers: number; aov: number; repeatCustomers: number }`; `getOverviewStats(now: Date): Promise<OverviewStats>`; `getRevenueTimeseries(from: Date, to: Date, bucket: 'month'|'day'): Promise<SeriesPoint[]>`; `getTopProducts(from: Date, to: Date, limit: number): Promise<TopProduct[]>`; `getStatusBreakdown(from: Date, to: Date): Promise<StatusSlice[]>`; `getPaymentBreakdown(from: Date, to: Date): Promise<PaymentSlice[]>`; `getCustomerStats(from: Date, to: Date): Promise<CustomerStats>`; and in queries.ts `getRecentOrders(limit: number): Promise<AdminOrderListItem[]>`.

- [ ] **Step 1: Build `analytics.ts`.** `import "server-only"`. Each reader wraps its RPC call in a try/catch that logs + returns a safe empty/zero shape (fail-soft). Example patterns:

```ts
import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { computeTrend, fillBuckets, type SeriesPoint, type Trend } from "@/lib/analytics/transforms";

async function rpcRows<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const db = createAdminSupabase();
  const { data, error } = await db.rpc(fn as never, args as never).overrideTypes<T[], { merge: false }>();
  if (error) { console.error(`analytics ${fn} failed:`, error.message); return []; }
  return (data ?? []) as T[];
}

export async function getRevenueTimeseries(from: Date, to: Date, bucket: "month" | "day"): Promise<SeriesPoint[]> {
  const rows = await rpcRows<{ bucket: string; orders: number; revenue: number }>(
    "order_timeseries", { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket },
  );
  return fillBuckets(rows.map((r) => ({ bucket: r.bucket, orders: Number(r.orders), revenue: Number(r.revenue) })), from, to, bucket);
}
// getTopProducts → top_products; getStatusBreakdown → status_breakdown; getPaymentBreakdown → payment_breakdown;
// getCustomerStats → customer_stats (single row; empty → {newCustomers:0,aov:0,repeatCustomers:0}).
// Note: RPC bigint columns arrive as number|string — coerce with Number(...).
```
`getOverviewStats(now)`: compute `thisMonthStart`, `nextMonthStart`, `prevMonthStart` (UTC). Get revenue/orders for this month + last month (two `order_timeseries` month-bucket calls or a single call over [prevMonthStart, nextMonthStart) then split), and `customer_stats` for both windows → `newCustomers`/`aov` values + `computeTrend`. Get `pending`/`delivered`/`cancelled` counts (current, e.g. `order_timeseries` isn't right for status counts — use `status_breakdown(thisMonthStart, nextMonthStart)` or count queries) and `lowStock` from `inventory` (`select stock_qty, low_stock_threshold` → count where `stock_qty <= low_stock_threshold`, or reuse the existing `getDashboardStats` inventory read). All fail-soft (zeros on error).

- [ ] **Step 2: Add `getRecentOrders(limit)`** in `queries.ts` — a small service-role read: `orders` newest-first, `limit`, mapped to `AdminOrderListItem` (reuse the existing list row shape/mapping). Fail-soft is not required here (it throws like the other queries), but keep it minimal.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run`
```bash
git add src/lib/admin/analytics.ts src/lib/admin/queries.ts
git commit -m "feat(analytics): fail-soft service-role analytics data layer + recent orders"
```

---

### Task 5: Rich overview page

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `getOverviewStats`, `getRevenueTimeseries`, `getTopProducts` (Task 4), `getRecentOrders` (Task 4), `KpiCard`, `RevenueOrdersChart` (Task 3), `formatTk`/`formatDate`.

- [ ] **Step 1: Rebuild the overview.** Keep the header ("Overview" / "Dashboard"). Fetch server-side (all fail-soft): `const now = new Date(); const stats = await getOverviewStats(now);` a 12-month window `[start12mo, now]` for `getRevenueTimeseries(..., 'month')`, a 30-day window for `getTopProducts(..., 5)`, and `getRecentOrders(5)`. Render:
  - **KPI grid** (`KpiCard`): Revenue (`formatTk(stats.revenue.value)`, `stats.revenue.trend`), Orders, New Customers, AOV (`formatTk`), then Pending, Delivered, Cancelled, Low Stock (no trend). Icons from lucide (Coins, ClipboardList, UserPlus, Receipt, Hourglass, PackageCheck, XCircle, PackageX).
  - **Revenue + Orders chart** in a Card: `<RevenueOrdersChart data={series} />`.
  - **Top Products** list (title · qty · `formatTk(revenue)`).
  - **Recent Orders** list (order#, customer, `formatTk(total)`, status badge) linking to `/admin/orders/[id]`.
  - Lay out responsively (KPI grid `sm:grid-cols-2 lg:grid-cols-4`; chart full-width; top-products + recent-orders side by side on `lg`).

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean/green/ok (build-time analytics fail-soft warnings tolerated until 0012 is applied).
```bash
git add src/app/admin/page.tsx
git commit -m "feat(analytics): rich admin overview — KPI trends, chart, top products, recent orders"
```

---

## Final Verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean.
- [ ] **Apply `supabase/migrations/0012_analytics_functions.sql`** in the Supabase SQL editor (release gate).
- [ ] End-to-end (0012 applied, admin session): overview shows real KPIs + month-over-month trend badges; the revenue+orders 12-month chart renders (0-filled); top products + recent orders populate; with 0012 NOT applied the page still renders zeros (no 500); spot-check a KPI vs the DB. Non-admin can't reach `/admin`.
- [ ] Opus whole-branch review, then finish branch (PR to `master`; set the 5 per-branch Supabase preview env vars if the preview reports missing vars; redeploy).

## Self-Review

- **Spec coverage:** migration functions → T1; computeTrend/fillBuckets → T2; recharts + KpiCard + chart → T3; fail-soft data layer (overview + AN-2 readers) + recent orders → T4; rich overview → T5. AN-2 (page + picker + breakdown charts) uses T1/T2/T4 but is out of this slice. Non-goals (traffic, in-store split, export) excluded. ✓
- **Placeholder scan:** T1/T2 carry full SQL/code + tests; T4 gives the fail-soft rpc helper + one worked reader and the window math for `getOverviewStats` (the rest mirror it); T3/T5 name exact props + composition. No TBD.
- **Type consistency:** `Trend`/`SeriesPoint` (T2) consumed by T3 (`KpiCard`/chart) + T4 (data layer); `OverviewStats`/`TopProduct`/`StatusSlice`/`PaymentSlice`/`CustomerStats` defined in T4 and consumed by T5 (and AN-2 later); RPC names + arg keys (`p_from`/`p_to`/`p_bucket`/`p_limit`) match T1's signatures.
- **Load-bearing safety:** functions execute-revoked from anon/auth (admin-gated service-role only); data layer fail-soft so an unapplied migration never 500s the dashboard; revenue excludes cancelled consistently; transforms pure/deterministic (no `Date.now()` inside).
