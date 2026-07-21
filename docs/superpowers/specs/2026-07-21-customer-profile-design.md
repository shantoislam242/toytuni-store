# toytuni-store — Admin Customer Profile (CRM)

**Date:** 2026-07-21
**Status:** Design approved, pending spec review
**Scope:** Turn the thin admin customer detail into a fuller CRM profile — a **status** (active / inactive / blocked), **tags**, **internal notes**, an **auto tier** (derived from lifetime spend), and **richer metrics** (AOV, first order, days-since-last-order, cancelled count) — plus a read-only "last delivery address" derived from the customer's most recent order. Also enriches the customer **list** (status + tier badges, status/tag filters, a KPI strip). Adapts the reference (Storify) customer profile to toytuni's COD / single-vendor / BDT Supabase stack.

## Background

Today the admin customer detail (`src/app/admin/customers/[id]/page.tsx`) shows: a header (name + phone), an **Orders** card (order-history table + `orderCount` + `totalSpent`), and a **Contact** card that edits only **name + email** (`src/components/admin/customer-edit-form.tsx` → `updateCustomer(id, {name, email})`). The `customers` table (`0001_init.sql`) has only `id, phone (unique), name, email, auth_user_id, created_at` — no status, tags, notes, or profile fields. Metrics come from the pure `aggregateCustomers` (`src/lib/admin/customer-metrics.ts`): `orderCount` (all orders), `totalSpent` (non-cancelled), `lastOrderAt` — no AOV/first-order/cancelled. Customers are upserted by phone at order placement (`place_order`); a customer's orders link by `orders.customer_id`. The list (`customers-table.tsx`) is a client search by name/phone/email with no filters or KPIs. The reference's customer profile adds status/tags/notes/loyalty/address on an edit form; we take the e-commerce-generic pieces (status, tags, notes, richer metrics) + a simple derived tier, and **drop loyalty points and a saved-address book** (toytuni addresses live on each order).

## Goals

- **Schema (migration 0013):** `customers` gains `status text` (`active`|`inactive`|`blocked`, default `active`), `tags text[]`, `notes text`, `updated_at timestamptz` (+ the shared `set_updated_at` trigger from 0011).
- **Auto tier (pure, TDD):** `customerTier(totalSpent): 'bronze'|'silver'|'gold'` — Bronze `< 3000`, Silver `3000–9999`, Gold `≥ 10000` (lifetime BDT spend). A **badge only** — no points, no stored column.
- **Richer metrics (pure, TDD):** extend `aggregateCustomers` with `aov` (totalSpent ÷ non-cancelled order count, 0 when none), `firstOrderAt` (min created_at | null), `cancelledCount`. `daysSinceLastOrder` is derived in the UI from `lastOrderAt` (keeps the aggregator pure — no `now` inside).
- **Profile page:** a header with **status + tier badges + tags**, a **metrics strip** (Orders, Spent, AOV, Last order + "N days ago", Cancelled), the existing **orders history**, a read-only **"Last delivery address"** (from the newest order's `division/district/area/address_line/landmark` — no schema), and an edit card extended to **status (select)**, **tags (chip editor)**, and **internal notes (textarea)** alongside name/email.
- **Action:** extend `updateCustomer(id, patch)` to accept `status`, `tags`, `notes` (validated) in addition to `name`/`email`.
- **List page:** add **status + tier badges**, **status filter** + **tag filter** (client-side, alongside the existing search), and a **KPI strip** (Total customers, Active, Blocked, Total spend).
- **Block behavior:** `blocked` is an **admin-facing flag only** (badge + filter) — it does NOT block checkout (guest COD by phone; avoids false-blocking). Documented.

## Non-goals (this slice / later)

- No loyalty points/rewards system (tier is a derived badge only).
- No saved-address book on the customer (addresses stay per-order; the profile shows the last one read-only). No editable customer address.
- No checkout enforcement of `blocked` (flag only). No merge-duplicates, no delete-customer, no bulk actions, no customer-facing changes.
- No marketing-consent / birthday / segments-beyond-tags fields. No server-side list pagination (client filters over the existing full read — the customer set is small).
- No activity timeline (order history already lists their orders; `order_status_history` stays per-order).
- No editable phone (unique identity key, unchanged).

## Locked decisions

- **CRM fields:** status (active/inactive/blocked), freeform tags, internal notes — all on the `customers` row.
- **Tier = derived** from `totalSpent` (Bronze/Silver/Gold, thresholds 3000/10000), badge only.
- **Metrics:** add AOV, first order, cancelled count; days-since computed in UI.
- **Block = flag only** (no enforcement).
- **Last delivery address = derived** from the most recent order (read-only), not a stored customer field.
- **Both** the profile and the list get the treatment.

## Schema (migration 0013 — `0013_customer_profile.sql`)

```sql
alter table customers add column if not exists status text not null default 'active'
  check (status in ('active','inactive','blocked'));
alter table customers add column if not exists tags text[];
alter table customers add column if not exists notes text;
alter table customers add column if not exists updated_at timestamptz not null default now();

-- `set_updated_at()` already exists (migration 0011). Just attach the trigger.
drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at before update on customers
  for each row execute function set_updated_at();
```

Manual step: **apply `0013` in the Supabase SQL editor before merge** (release gate). Until applied, the customer reads on the new columns fail — so the reads default the new fields safely (see Architecture) so `tsc`/tests/build don't need it, and the pages fail-soft where practical.

## Architecture

- **Pure (TDD):**
  - `src/lib/admin/customer-tier.ts` — `type CustomerTier = 'bronze'|'silver'|'gold'`; `customerTier(totalSpent: number): CustomerTier` (≥10000 gold, ≥3000 silver, else bronze). Total, deterministic.
  - `src/lib/admin/customer-metrics.ts` (extend): `CustomerListItem` + the detail metrics gain `aov: number`, `firstOrderAt: string | null`, `cancelledCount: number`, `tier: CustomerTier` (via `customerTier(totalSpent)`); plus the existing `status`/`tags` threaded from the row (see queries). `aggregateCustomers` computes `aov`/`firstOrderAt`/`cancelledCount` from the orders; keep it pure (no `Date.now()`).
- **Queries** (`src/lib/admin/queries.ts`): `getAdminCustomers` + `getAdminCustomerById` add `status, tags, notes` (and `updated_at`) to the `.select` + row types, defaulting safely (`status ?? 'active'`, `tags ?? []`, `notes ?? null`) so an unapplied migration or null values never break. `AdminCustomerDetail` gains `status`, `tags`, `notes`, the new metrics + `tier`, and a derived `lastAddress` (from the newest order's address fields — pull `division, district, area, address_line, landmark` in the existing per-customer orders read and shape the first row). `CustomerListItem` gains `status`, `tags`, `tier`.
- **Action** (`src/lib/admin/actions.ts`): extend `updateCustomer(id, patch: { name?; email?; status?; tags?; notes? })` — admin-gated + service-role (unchanged). Validate: `status` ∈ the three values; `tags` sanitized (trim, drop empties, dedupe — a small local `cleanStrings` or reuse the existing tag-cleaning helper pattern); `notes` trimmed, length-bounded (≤ 2000). Only writes provided fields; `revalidatePath('/admin/customers')` + `/admin/customers/${id}` (unchanged). Keep name-required + email-format checks.
- **UI — profile** (`src/app/admin/customers/[id]/page.tsx`): header shows the name + a **status badge** (active=green / inactive=slate / blocked=red) + a **tier badge** (bronze/silver/gold) + the tags as chips; a **metrics strip** (reuse `KpiCard` from analytics, no trend: Orders, Spent `formatTk`, AOV `formatTk`, Last order = `formatDate(lastOrderAt)` + "(N days ago)" computed here, Cancelled); the existing orders table; a read-only **Last delivery address** card (when `lastAddress` present); and the extended edit card.
  - `src/components/admin/customer-edit-form.tsx` (extend): add a **status `<select>`** (active/inactive/blocked), a **tags** chip editor (reuse `StringListEditor` from the blog/product work), and a **notes** `<textarea>`; submit the full patch via `updateCustomer`. Keep phone read-only.
- **UI — list** (`src/components/admin/customers-table.tsx`): add **Status** + **Tier** badge columns; add a **status filter** (`all` + active/inactive/blocked) and a **tag filter** (union of all customers' tags) beside the search; extend `filtered` to AND them in. Add a **KPI strip** above the table: Total customers, Active, Blocked, Total spend (`formatTk` of Σ totalSpent) — computed client-side from the loaded rows (or a tiny server helper).

## Data flow — edit a customer

1. Admin opens `/admin/customers/[id]` → sees status/tier/tags, the metrics strip, order history, last delivery address, and the edit card pre-filled.
2. Admin sets **status = blocked**, adds a **tag** ("fraud-risk"), writes a **note** → Save → `updateCustomer(id, { status, tags, notes })` (validated, service-role) → `revalidatePath` → the badge + list filter reflect it.
3. Tier updates automatically as `totalSpent` crosses a threshold (derived on every read — nothing to persist).

## Security / correctness

- `updateCustomer` stays admin-gated (`getIsAdmin()` → throw) + service-role; the new fields are validated server-side (status enum, tags sanitized, notes bounded) even if the client is bypassed.
- New columns absent from generated types → `as never` on the write payload / `.overrideTypes` on reads (established). Reads default the new fields (`status ?? 'active'`, `tags ?? []`) so a pre-migration DB or null values render safely — no 500.
- `customerTier` + the extended `aggregateCustomers` are pure + total (AOV guards divide-by-zero; no `Date.now()` inside) → TDD-covered.
- `blocked` is a flag only — no checkout/order-path change, so a mis-set status can't lock a real customer out of ordering (documented trade-off).
- The last-delivery-address is read-only, derived from the order snapshot the customer already provided — no new PII surface.
- `updated_at` maintained by the shared DB trigger.

## Testing

- **Pure (TDD):** `customerTier` (each band + exact thresholds 3000/10000 boundaries); `aggregateCustomers` extensions — `aov` (spend ÷ non-cancelled count; 0 when no non-cancelled orders; cancelled excluded from spend but counted in `cancelledCount`), `firstOrderAt` (min; null when none), `cancelledCount`, and `tier` wired from `totalSpent`.
- **Integration (drive it, admin session, after migration 0013):** the profile shows status/tier/tags + the metrics strip + last delivery address; editing status→blocked / adding tags / writing a note persists + reflects on the list; the list's status + tag filters narrow correctly and the KPI strip totals match; a blocked customer can still (by design) place a COD order; with 0013 unapplied the pages still render (defaults). Verify a couple of metrics vs the DB.

## Open questions for review

- **Tier thresholds:** Bronze `<৳3,000` / Silver `৳3,000–9,999` / Gold `≥৳10,000` (lifetime, non-cancelled spend). Accept, or different bands?
- **Tier basis:** lifetime `totalSpent` (non-cancelled), consistent with the "Spent" metric. (Accept?)
- **Last delivery address:** show the **most recent** order's address (vs a "most frequent" address). Proposal: **most recent** (simplest, matches "current" address). (Accept?)
