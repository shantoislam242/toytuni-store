# toytuni-store — Analytics Slice AN-1: Data foundation + rich overview

**Date:** 2026-07-20
**Status:** Design approved, pending spec review
**Scope:** The order/sales analytics **data foundation** (Postgres aggregation functions + a service-role data layer + TDD pure transforms + recharts) and a **richer admin overview** (`/admin`) — KPI cards with month-over-month trends, a revenue+orders time-series chart, a top-products list, and recent orders. First of two Analytics slices (AN-1 foundation + overview → AN-2 the dedicated `/admin/analytics` page with a period picker + breakdown charts). Last sub-project of the Storify-style admin build.

## Background

The admin overview (`src/app/admin/page.tsx`) is currently **four static KPI cards** (Total Orders, Revenue, Pending, Low Stock) from the pure `computeDashboardStats` (`src/lib/admin/stats.ts`) via `getDashboardStats` (`src/lib/admin/queries.ts`) — no trends, no charts, no charting library. All the raw data exists in Postgres: `orders` (status, `payment_status`, `total`, `created_at`, `customer_id`), `order_items` (`product_id`, `title`, `qty`, `line_total`), `customers` (`created_at`), `inventory` (`stock_qty`, `low_stock_threshold`). toytuni is **online-only (no in-store/POS split), COD, BDT (৳), single-vendor**, and has **no traffic/Plausible** — so this is order/sales analytics only (traffic is a deferred, separate concern). The admin sidebar (`src/components/admin/admin-sidebar.tsx`) lists the sections; `/admin/*` is already admin-gated (layout + proxy). This slice adds the aggregation layer once (reused by AN-2) and upgrades the overview.

## Goals

- **Migration 0012 — analytics SQL functions** (plpgsql, `stable`, execute revoked from anon/authenticated; read via service-role): `order_timeseries`, `status_breakdown`, `payment_breakdown`, `top_products`, `customer_stats`. Built here in full (AN-2 reuses the breakdown/customer ones); efficient `date_trunc`/`group by` aggregation instead of pulling rows into JS.
- **recharts** dependency for all charts (matches the reference; only charting lib added).
- **Pure transforms (TDD):** `computeTrend(current, previous)` → `{ pct: number | null; direction: 'up'|'down'|'neutral' }`; `fillBuckets(rows, from, to, bucket)` → 0-filled contiguous series ready for recharts (no gaps for empty months/days).
- **Data layer** `src/lib/admin/analytics.ts` (service-role, `server-only`): `getOverviewStats()` (8 KPI cards with this-period-vs-previous trends), `getRevenueTimeseries(from, to, bucket)`, `getTopProducts(from, to, limit)` — plus the AN-2 readers (`getStatusBreakdown`, `getPaymentBreakdown`, `getCustomerStats`) defined here so the layer is complete.
- **Richer overview** (`/admin`): a KPI grid (Revenue, Orders, New Customers, AOV — each with a month-over-month trend badge — plus Pending, Delivered, Cancelled, Low Stock), a **Revenue + Orders** time-series chart (last 12 months, monthly), a **Top Products** list (last 30 days), and a **Recent Orders** list (latest 5). Server components fetch; recharts renders in a client child.

## Non-goals (this slice / later)

- No `/admin/analytics` page, no period/date-range picker, no status/payment breakdown charts, no customer/AOV detail, no low-stock table — all **AN-2** (they reuse this slice's data layer + transforms).
- No traffic/visitor analytics (no Plausible/GA) — deferred, separate.
- No in-store/online split (toytuni is online-only), no multi-currency (BDT only), no CSV/export, no scheduled reports.
- No realtime — analytics reflect the `unstable_cache`/request cycle (admin pages render dynamically; a short cache is acceptable).
- No new order/customer columns — everything derives from existing data.

## Locked decisions

- **Aggregation in Postgres** (migration 0012 functions), not JS-side row pulls — scales, and keeps the data layer thin.
- **recharts** for charts.
- **Trends = month-over-month** on the overview (this calendar month vs the previous), computed by the pure `computeTrend`.
- **Revenue excludes cancelled orders** (consistent with the existing `computeDashboardStats`); order **counts include all** orders.
- Overview shows **8 KPIs + 1 chart + top products + recent orders**; the deep breakdowns live on the AN-2 page.

## Schema (migration 0012 — `0012_analytics_functions.sql`)

All functions are `language sql stable`, take `timestamptz` bounds (half-open `[from, to)`), and have `execute` revoked from `anon, authenticated` (called only via the service-role client). No tables/columns added.

```sql
-- Revenue (non-cancelled) + order count per time bucket.
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

-- Count of orders per status in range.
create or replace function status_breakdown(p_from timestamptz, p_to timestamptz)
returns table(status text, count bigint)
language sql stable as $$
  select status, count(*)::bigint from orders
  where created_at >= p_from and created_at < p_to
  group by status order by 2 desc;
$$;
revoke execute on function status_breakdown(timestamptz, timestamptz) from anon, authenticated;

-- Count + amount per payment_status in range.
create or replace function payment_breakdown(p_from timestamptz, p_to timestamptz)
returns table(payment_status text, count bigint, amount bigint)
language sql stable as $$
  select payment_status, count(*)::bigint,
         coalesce(sum(total), 0)::bigint from orders
  where created_at >= p_from and created_at < p_to
  group by payment_status order by 2 desc;
$$;
revoke execute on function payment_breakdown(timestamptz, timestamptz) from anon, authenticated;

-- Best sellers by revenue (from non-cancelled orders) in range.
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

-- New customers (by customers.created_at), AOV + repeat buyers (by orders) in range.
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

Manual step: **apply `0012` in the Supabase SQL editor before merge** (release gate). Until applied, the analytics reads fail-soft (see below) — no dev-DB dependency for `tsc`/tests/build.

## Architecture

- **Pure transforms** `src/lib/analytics/transforms.ts` (TDD): `computeTrend(current, previous): Trend` (pct = `(cur-prev)/prev*100` rounded; `prev===0 && cur>0` → `null` pct + `up`; equal → `neutral`); `fillBuckets(rows: {bucket: string; orders: number; revenue: number}[], from: Date, to: Date, bucket: 'month'|'day'): {label: string; orders: number; revenue: number}[]` (contiguous, 0-filled, chronological, `label` a short display string). No I/O, no `Date.now()` — bounds passed in.
- **Data layer** `src/lib/admin/analytics.ts` (`server-only`, `createAdminSupabase`, `.rpc(...)` with args + `.overrideTypes` on the returned rows; every reader fail-soft — a Supabase/`function does not exist` error logs + returns a safe empty/zero shape, never throws, so the pages render):
  - `getOverviewStats(now: Date): Promise<OverviewStats>` — computes `[thisMonthStart, nextMonthStart)` and `[prevMonthStart, thisMonthStart)`, calls `order_timeseries`(month) + `customer_stats` for both windows (or targeted queries), and small count reads for pending/delivered/cancelled (current) + low-stock (`inventory`), returning each KPI as `{ value, trend }` where applicable via `computeTrend`.
  - `getRevenueTimeseries(from: Date, to: Date, bucket: 'month'|'day'): Promise<SeriesPoint[]>` — `order_timeseries` → `fillBuckets`.
  - `getTopProducts(from, to, limit): Promise<TopProduct[]>`; `getStatusBreakdown(from,to)`, `getPaymentBreakdown(from,to)`, `getCustomerStats(from,to)` (used by AN-2, defined now).
  - Types: `Trend`, `OverviewStats`, `SeriesPoint`, `TopProduct`, `StatusSlice`, `PaymentSlice`, `CustomerStats`.
- **Overview page** `src/app/admin/page.tsx` (server) — fetch `getOverviewStats(new Date())`, `getRevenueTimeseries(last12mo, now, 'month')`, `getTopProducts(last30d, now, 5)`, and the 5 recent orders (reuse `getAdminOrders()` sliced, or a small `getRecentOrders(5)`); render the KPI grid + `<RevenueOrdersChart data={...} />` (client) + top-products list + recent-orders list.
- **Chart components** (client, recharts): `src/components/admin/charts/revenue-orders-chart.tsx` — a `ComposedChart`/`BarChart` with an orders bar + revenue line (dual axis), `৳`/`Tk` and integer formatting, cream/ink theme, responsive (`ResponsiveContainer`). A tiny `src/components/admin/kpi-card.tsx` (label, value, optional trend badge with up/down colour + arrow). Keep chart wrappers small and client-only so recharts stays out of server bundles.
- **Sidebar:** the "Analytics" nav link is added in **AN-2** (when `/admin/analytics` exists) to avoid a dead link; AN-1 only enriches the existing Dashboard page.

## Data flow — overview render

1. `/admin` (server) calls the data layer for stats + 12-month series + top-5 products + recent-5 orders (all service-role, fail-soft).
2. KPI cards show current values + a month-over-month trend badge (`computeTrend`). The chart client component renders the 0-filled 12-month revenue+orders series. Top products + recent orders render as lists.
3. If migration 0012 isn't applied yet, each reader logs + returns zeros/empties → the page still renders (no 500).

## Security / correctness

- All aggregation functions are `stable`, read-only, and **execute-revoked from anon/authenticated** — reachable only via the service-role client in `server-only` code behind the admin gate (`/admin/*` layout + `proxy`). No new public surface.
- The data layer is **fail-soft**: an unapplied migration or a transient error logs and yields zero/empty shapes — the admin dashboard never 500s.
- Pure transforms are total + deterministic (bounds/`now` passed in, no `Date.now()` inside) → fully TDD-covered; division-by-zero in `computeTrend` handled (prev 0 → null pct).
- Revenue consistently excludes cancelled orders (matches existing behaviour); money stays integer BDT, formatted with `formatTk`.
- recharts is imported only by client components (`"use client"`), keeping it out of server bundles.
- Function args are `as never` where the generated types lack the new RPCs (established convention); returned rows via `.overrideTypes`.

## Testing

- **Pure (TDD):** `computeTrend` (up/down/neutral, prev 0 → null pct + up, equal → neutral, negative direction); `fillBuckets` (0-fills missing months/days, preserves order, correct labels, empty input → full 0-filled range, month vs day bucketing).
- **Integration (drive it, real admin session, after migration 0012):** the overview shows non-zero KPIs with correct month-over-month trend badges; the revenue+orders chart renders a 12-month 0-filled series; top products + recent orders populate; with 0012 NOT applied, the page still renders (zeros, no crash); non-admin can't reach `/admin` (existing gate). Verify a couple of KPI numbers against the DB.

## Open questions for review

- **Trend basis:** month-over-month (this calendar month vs last) for the overview KPIs. Alternative: trailing-30-days vs prior-30. Proposal: **calendar month-over-month** (matches the reference's monthly framing; the AN-2 page gets the flexible period picker). (Accept?)
- **Recent orders source:** reuse `getAdminOrders()` and slice 5, or add a dedicated `getRecentOrders(5)` (lighter query). Proposal: **a small `getRecentOrders(5)`** (avoids loading the whole list for the dashboard). (Accept?)
- **Chart type:** orders as bars + revenue as a line on a dual axis (one combined chart), vs two separate charts. Proposal: **one combined dual-axis chart** (compact, matches the reference's single Orders/Sales chart). (Accept?)
