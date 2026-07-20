# toytuni-store — Analytics Slice AN-2: The /admin/analytics page

**Date:** 2026-07-20
**Status:** Design approved (part of the analytics sub-project design), pending spec review
**Scope:** The dedicated **`/admin/analytics`** page — a period selector (7d / 30d / 90d / 12mo / custom) driving a revenue+orders time series, an order-status breakdown, a payment breakdown, a top-products table, customer stats (new / AOV / repeat), and a low-stock list — all reusing the AN-1 data layer + transforms. Plus the "Analytics" sidebar link. Second and final Analytics slice (AN-1 foundation + overview ✓ → AN-2 page). Completes the Storify-style admin build.

## Background

AN-1 (merged, PR #17) shipped the data foundation: migration 0012's five aggregation functions, the pure transforms (`computeTrend`, `fillBuckets`), the fail-soft service-role data layer `src/lib/admin/analytics.ts` (`getRevenueTimeseries`, `getTopProducts`, `getStatusBreakdown`, `getPaymentBreakdown`, `getCustomerStats`, `getOverviewStats`) with the AN-2 readers already present, recharts + `KpiCard` + `RevenueOrdersChart`, and a richer `/admin` overview. What's missing is the **deep-dive page**: AN-1 fixed the overview to a 12-month view; AN-2 adds a **flexible period** and the breakdown/customer/low-stock views that don't belong on the overview. The admin sidebar (`src/components/admin/admin-sidebar.tsx` `NAV_ITEMS`) has no Analytics entry yet (deliberately deferred to this slice so there's no dead link).

## Goals

- **`/admin/analytics` page** (server component, admin-gated by the existing `/admin/*` layout) with a **period selector**: `7d`, `30d`, `90d`, `12mo`, and `custom` (two dates). The selected period is the URL's `searchParams` (`?period=30d` or `?from=YYYY-MM-DD&to=YYYY-MM-DD`), so the page is shareable/bookmarkable and the server reads the range directly.
- **A pure `resolvePeriod(params, now)`** (TDD): maps the search params → `{ from: Date; to: Date; bucket: 'day'|'month' }` (bucket = `day` for ranges ≤ 90 days, else `month`), with safe defaults (`30d`) and validation (bad/absent → default; `from>to` → swap/normalize).
- **Views** (all reading the AN-1 data layer over the resolved range, all fail-soft):
  - **Revenue + Orders** time series (`RevenueOrdersChart`, reused) with day/month bucketing per the period.
  - **Order-status breakdown** — a donut (recharts `PieChart`) of `getStatusBreakdown` (pending/confirmed/shipped/delivered/cancelled) + a small legend/table.
  - **Payment breakdown** — a donut or bar of `getPaymentBreakdown` (pending/paid/refunded) with counts + amounts (`Tk`).
  - **Top products** — a table from `getTopProducts(range, 10)` (title · qty · revenue), each linking to the product where possible.
  - **Customer stats** — `KpiCard`-style cards from `getCustomerStats`: New Customers, AOV (`Tk`), Repeat Customers (no trend — the period IS the control).
  - **Low stock** — a small list/table of products at/below threshold (reuse the inventory read; this is a live snapshot, period-independent).
- **Sidebar:** add `{ label: "Analytics", href: "/admin/analytics", icon: BarChart3 }` to `NAV_ITEMS` (after Dashboard).

## Non-goals (this slice / later)

- No traffic/visitor analytics (no Plausible/GA) — order/sales only, as in AN-1.
- No CSV/PDF export, no scheduled/emailed reports, no saved custom ranges, no comparison-to-previous-period overlay (the period selector is the control; AN-1's overview carries the month-over-month trend).
- No new SQL — reuses migration 0012's functions. No new order/customer columns.
- No realtime; the page renders per request (admin pages are dynamic).
- No drill-down navigation from a chart slice (e.g. click "pending" → filtered orders) — a nice future add, not this slice.

## Locked decisions

- **Period = URL searchParams** (`period` preset or `from`/`to` custom); a pure `resolvePeriod` is the single source of range→bucket truth (TDD).
- **Bucket rule:** ≤ 90 days → daily; otherwise monthly.
- **Reuse AN-1 wholesale** — the data layer readers, `fillBuckets`, `RevenueOrdersChart`, `KpiCard`; AN-2 adds only the page, the period picker, the two breakdown charts, the top-products table, and the customer/low-stock views.
- **Low stock is period-independent** (a live snapshot), unlike the range-driven views.
- **Donuts via recharts `PieChart`** (client), consistent with AN-1's client-only charting boundary.

## Architecture

- **Pure `src/lib/analytics/period.ts`** (TDD): `type Period = { key: '7d'|'30d'|'90d'|'12mo'|'custom'; from: Date; to: Date; bucket: 'day'|'month' }`; `resolvePeriod(params: { period?: string; from?: string; to?: string }, now: Date): Period`. Presets compute `to = now`, `from = now - N`; `12mo = start of the month 11 months back`; `custom` parses `from`/`to` (invalid → fall back to `30d`); bucket by span. No `Date.now()` inside (takes `now`).
- **Page** `src/app/admin/analytics/page.tsx` (server): `searchParams` is a Promise (Next 16) → `await` it → `resolvePeriod(...)` with `new Date()`; then `Promise.all` the AN-1 readers over `[from, to]` (+ `getTopProducts(from, to, 10)`, `getCustomerStats`, `getStatusBreakdown`, `getPaymentBreakdown`, `getRevenueTimeseries(from, to, bucket)`) + the low-stock read. Render the period selector + all views. All reads are already fail-soft (zeros/empties if 0012 unapplied → the page still renders). `generateMetadata` noindex.
- **Client components:**
  - `src/components/admin/analytics/period-selector.tsx` (`"use client"`) — preset buttons (7d/30d/90d/12mo) + a custom two-date control; on change, `router.push('/admin/analytics?...')` (uses `useRouter`/`useSearchParams`), so the server re-renders for the new range.
  - `src/components/admin/charts/status-donut.tsx` + `payment-donut.tsx` (`"use client"`, recharts `PieChart`/`Pie`/`Cell` + `Tooltip`/`Legend`) — a status/payment colour map, `Tk` on payment amounts, empty → "No data yet".
  - Presentational (server-safe): a `TopProductsTable`, `CustomerStatCards` (reuse `KpiCard` with no trend), and a `LowStockList` — or render these inline in the page.
- **Low-stock reader:** add `getLowStockProducts(limit)` to `src/lib/admin/analytics.ts` (service-role, fail-soft) — `inventory` joined to `products` for the title, where `stock_qty <= low_stock_threshold`, ordered by `stock_qty` asc. (AN-1 only had a low-stock *count*; AN-2 needs the list.)
- **Sidebar:** one line added to `NAV_ITEMS`.

## Data flow — change the period

1. Admin opens `/admin/analytics` (no params) → `resolvePeriod` defaults to `30d` (daily bucket) → the page reads the AN-1 layer over the last 30 days and renders the series + breakdowns + top products + customer stats + low stock.
2. Admin clicks **12mo** → `PeriodSelector` pushes `?period=12mo` → server re-renders → `resolvePeriod` returns a 12-month monthly range → all range-driven views update; low stock stays the same (snapshot).
3. Admin picks a **custom** from/to → `?from=…&to=…` → `resolvePeriod` parses + picks the bucket by span.

## Security / correctness

- The page is admin-gated by the existing `/admin/*` layout + `proxy`; it adds no new data-access path — it only calls the already-audited, execute-revoked-from-public AN-1 functions via the service-role client in server code.
- Every read is **fail-soft** (AN-1 guarantee) — an unapplied 0012 or a transient error renders zeros/empties, never a 500.
- `resolvePeriod` is pure + total: bad/malicious `searchParams` (garbage `period`, unparseable/reversed dates, absurd ranges) resolve to a safe default or a normalized range — no crash, no unbounded query (a custom range is clamped to a sane max, e.g. ≤ 2 years, to bound the bucket count).
- recharts stays in `"use client"` chart components (donuts + the reused chart) — out of the server bundle.
- Money stays integer BDT via `formatTk`.

## Testing

- **Pure (TDD):** `resolvePeriod` — each preset's from/to/bucket; `12mo` month-aligned; `custom` valid parse; invalid/absent → `30d` default; `from>to` normalized; over-long custom range clamped; bucket boundary at 90 days.
- **Integration (drive it, admin session, after migration 0012):** the page defaults to 30 days; switching presets updates every range-driven view + the URL; a custom range works; the status + payment donuts match the data; top products + customer stats + low stock populate; with 0012 unapplied the page renders zeros/empties (no crash); non-admin can't reach `/admin/analytics`. Spot-check a couple of numbers vs the DB.

## Open questions for review

- **Period presets:** `7d / 30d / 90d / 12mo / custom`. Enough, or also `today` / `all-time`? Proposal: **the five listed** (covers daily-ops → yearly); `all-time` can come later. (Accept?)
- **Payment breakdown viz:** donut (like status) vs a small bar with amounts. Proposal: **donut for status, a compact bar/table for payment** (payment has amounts, which read better as a bar/table than a donut). (Accept — or donut for both?)
- **Custom-range clamp:** cap a custom range at ~2 years to bound daily-bucket size. Proposal: **clamp to 2 years, force monthly bucket beyond 90 days** (already the rule). (Accept?)
