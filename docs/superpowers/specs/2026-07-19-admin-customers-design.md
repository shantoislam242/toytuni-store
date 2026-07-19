# toytuni-store — Phase 3 Slice: Admin Customers

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** An `/admin/customers` list (name / phone / email + per-customer metrics: order count, total spent, last order) with search, and a `/admin/customers/[id]` detail showing the customer's info, their order history, and an inline **name / email edit**. Read from the existing `customers` + `orders` tables; phone (the unique key) is immutable. Fourth of five admin sections (Settings ✓ → Categories ✓ → Inventory ✓ → **Customers** → Blog).

## Background

Phase 3 Slices 1/2/3a/3b + Settings + Categories + Inventory are merged and live. The `customers` table (`id, phone unique, name, email, auth_user_id, created_at`) is upserted by `place_order` (keyed by phone), so it already dedupes buyers. `orders` link to it via `customer_id` (plus denormalized `customer_name`/`phone`/`email` snapshots) and carry `total` + `status`. The admin has Orders (list + detail + status) but no Customers view — this slice adds one (a read/metrics view + light contact edit; no new data).

## Goals

- **`aggregateCustomers(customers, orders)`** (pure) — join each customer with their orders to derive `orderCount`, `totalSpent` (sum of **non-cancelled** order totals, matching the dashboard revenue rule), and `lastOrderAt`.
- **`getAdminCustomers()`** — the customer list with those metrics (service-role), searchable client-side by name / phone / email.
- **`getAdminCustomerById(id)`** — one customer + their order history (order_number, date, total, status, order id for a link to `/admin/orders/[id]`).
- **`updateCustomer(id, { name, email })`** — admin-gated edit of the customer's contact (name required; email optional + light-validated). **Phone is immutable** (the unique key). Editing the master record does NOT rewrite past orders' denormalized snapshots (documented).
- **Pages:** `/admin/customers` (list) + `/admin/customers/[id]` (detail with the edit form + order history); enable the **Customers** sidebar item.

## Non-goals (this slice)

- No customer creation/delete (customers are created by checkout via `place_order`; deleting one would orphan orders — out of scope).
- No phone editing (unique identity key).
- No per-customer notes/tags (no column; would need a migration) — possible later.
- No auth-account linking UI (`auth_user_id` exists but isn't managed here).
- No storefront changes.

## Locked decisions

- **View + name/email edit**; phone immutable.
- **Metrics included:** order count, total spent (non-cancelled), last order.
- Metrics **aggregated in JS** from customers + orders reads (small scale; documented — not a SQL group-by/RPC).
- Edit lives on the **detail page**.

## Schema

No migration — `customers` + `orders` already hold everything.

## Architecture

- **`src/lib/admin/customer-metrics.ts`** (pure, TDD): `aggregateCustomers(customers: CustomerRow[], orders: OrderAggRow[]): CustomerListItem[]` — group orders by `customer_id`; per customer compute `orderCount = orders.length`, `totalSpent = Σ total where status !== "cancelled"`, `lastOrderAt = max(created_at) | null`; return the customer fields + metrics, sorted by `lastOrderAt` desc (most recent first), null last.
- **`src/lib/admin/queries.ts`:**
  - `getAdminCustomers(): Promise<CustomerListItem[]>` — read `customers` (id, name, phone, email, created_at) + `orders` (customer_id, total, status, created_at) via service-role; `aggregateCustomers(...)`.
  - `getAdminCustomerById(id): Promise<AdminCustomerDetail | null>` — validate UUID (return null on malformed, like `getAdminOrderById`); read the customer + their orders (id, order_number, created_at, total, status), newest first; `AdminCustomerDetail = { id, name, phone, email, createdAt, orderCount, totalSpent, lastOrderAt, orders: {...}[] }`.
- **`src/lib/admin/actions.ts`:** `updateCustomer(id, { name, email })` — `getIsAdmin()` re-check + service-role; `name` trimmed non-empty; `email` blank → null, else light-validate (`/^\S+@\S+\.\S+$/`); update `customers`; `revalidatePath('/admin/customers')` + `/admin/customers/${id}`. (No storefront tag — customers aren't storefront data.)
- **Pages / UI:**
  - `src/app/admin/customers/page.tsx` (server) — `getAdminCustomers()` → `<CustomersTable items={…} />` (client): searchable table — name, phone, email, orders, total spent (`formatTk`), last order (`formatDate`); each row links to the detail.
  - `src/app/admin/customers/[id]/page.tsx` (server) — `getAdminCustomerById(id)` (`notFound()` if null) → customer summary + `<CustomerEditForm>` (name + email, calls `updateCustomer`) + an order-history table (each row → `/admin/orders/[id]`, reusing the order status/label styling).
  - `src/components/admin/admin-sidebar.tsx` — remove `disabled` from the **Customers** item (leave Blog disabled).

## Data flow — view + correct a customer

1. Admin `/admin/customers` → searches by phone → clicks a row → `/admin/customers/[id]`.
2. Detail shows metrics + order history (each order links to its admin detail).
3. Admin fixes a typo in the name/email → `updateCustomer` writes `customers` → `revalidatePath` → the corrected contact shows (past orders keep their original snapshots).

## Security / correctness

- `updateCustomer` re-checks `getIsAdmin()` + service-role; name/email validated server-side; phone never written.
- `getAdminCustomers`/`getAdminCustomerById` are service-role, server-only; no admin query reaches the client bundle. `getAdminCustomerById` guards a non-UUID id (returns null → 404, not a 500).
- `totalSpent` excludes cancelled orders (consistent with the dashboard's revenue).
- JS aggregation reads all orders once; fine at this scale (documented; a SQL aggregate is the scale-up path).

## Testing

- **Pure (TDD):** `aggregateCustomers` — order count; total excludes cancelled; last-order = latest date; a customer with zero orders → count 0 / total 0 / lastOrderAt null; sort by recency (null last).
- **Integration (drive it, real admin session):** the list shows customers with correct metrics + search works; a customer detail shows their orders (links resolve to the order detail); editing name/email persists and re-renders; phone is not editable; a malformed id 404s; non-admin rejected on the page + the action.

## Open questions for review

- List sort: by last-order recency vs. total spent. Proposal: **recency** (most recently active first); columns are sortable-by-eye, no in-table sort control this slice.
- Order-history rendering on the detail: a compact table reusing the Orders list row style. Proposal: **compact table** (order #, date, total, status badge, link).
