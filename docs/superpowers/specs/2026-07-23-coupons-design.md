# toytuni-store — Coupon / discount codes

**Date:** 2026-07-23
**Status:** Design approved (user), pending implementation
**Scope:** Admin creates/edits **percentage** discount coupons from the dashboard; a customer enters a code at checkout and the discount is subtracted from the subtotal. Optional per-coupon constraints (expiry, minimum order, usage limit) are all nullable so a bare `code + %` coupon works too.

## Locked decisions (from user)

- **Percentage only** (no fixed-৳ coupons in v1).
- Optional constraints available per coupon: **expiry date**, **minimum subtotal**, **total usage limit** — all optional (empty = no constraint). Plus an **active** on/off toggle.
- Discount applies to **subtotal** (before delivery + COD). **One coupon per order.**

## Non-goals (v1)

Fixed-৳ coupons; stacking multiple coupons; per-customer usage limits; restoring a coupon's `used_count` when an order is cancelled; online payment (discount applies to the COD total). No change to how delivery/COD are priced.

## Data model (migration 0017 — `0017_coupons.sql`)

```sql
create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,                 -- stored UPPERCASE (normalized)
  discount_pct int not null check (discount_pct between 1 and 100),
  active boolean not null default true,
  min_subtotal int not null default 0 check (min_subtotal >= 0),   -- 0 = no minimum
  expires_at timestamptz,                     -- null = never expires
  usage_limit int check (usage_limit is null or usage_limit > 0),  -- null = unlimited
  used_count int not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table coupons enable row level security;  -- zero policies: service-role only

alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists discount_total int not null default 0;
```

`place_order` is re-created as a **superset of the 0006 version** — it additionally inserts `coupon_code` + `discount_total` into `orders`, and when a `coupon_code` is present it does a **guarded increment** in the same transaction (atomic, race-safe, mirroring the stock guard):

```sql
if p_order->>'coupon_code' is not null and p_order->>'coupon_code' <> '' then
  update coupons
    set used_count = used_count + 1, updated_at = now()
    where upper(code) = upper(p_order->>'coupon_code')
      and active
      and (expires_at is null or expires_at > now())
      and (usage_limit is null or used_count < usage_limit);
  if not found then
    raise exception 'coupon_unavailable:%', p_order->>'coupon_code';
  end if;
end if;
```

Everything else in `place_order` (customer upsert, order + advance insert, per-line stock guard + order_items insert) is preserved verbatim. **Manual step: apply 0017 before merge (release gate).** Pre-migration the coupon reads fail soft → checkout simply shows "Invalid coupon" and orders place without a discount.

## Pure helpers (TDD) — `src/lib/coupons/`

- **`normalize.ts`** — `normalizeCode(raw: string): string` → `raw.trim().toUpperCase()`.
- **`discount.ts`** — `computeCouponDiscount(subtotal: number, pct: number): number` → `Math.min(subtotal, Math.round(subtotal * pct / 100))` (never exceeds subtotal; whole Taka).
- **`validate.ts`** — a plain `CouponRow` shape + `validateCoupon(coupon: CouponRow | null, subtotal: number, now: Date): { ok: true; discountPct: number } | { ok: false; reason: CouponReason }`. Reasons (each maps to a friendly message): `not_found`, `inactive`, `expired`, `below_min`, `usage_exhausted`. Order of checks: exists → active → not expired → min met → usage left.

## Server actions — `src/lib/coupons/actions.ts` (`"use server"`, async-only)

- **`applyCoupon(code, subtotal)`** (public, used by checkout): service-role read by normalized code → `validateCoupon`. Returns `{ ok: true; code; discountPct; discountAmount } | { ok: false; error }`. Never trusts a client discount.
- **`createCoupon` / `updateCoupon` / `deleteCoupon`** (admin-gated via `getIsAdmin()` + service-role): validate code (non-empty, normalized, unique → 23505 friendly), `discount_pct` 1–100, `min_subtotal` ≥ 0, `usage_limit` null-or-positive, `expires_at` a valid date or null. `revalidatePath("/admin/coupons")`.
- **`getAdminCoupons()`** in `src/lib/admin/queries.ts` — list all coupons for the admin table (newest first).

## Admin UI

- **`/admin/coupons/page.tsx`** (admin-gated by the admin layout) + **`src/components/admin/coupons-manager.tsx`**: an "Add coupon" card (code, %, and optional expiry / min / usage) and a members-style table (code · % · Active badge · used/limit · expiry · Edit / Delete), following the `taxonomy-manager` / `team-manager` idioms (`useTransition`, `toast`, `router.refresh()`).
- **Sidebar** (`admin-sidebar.tsx`): add `{ label: "Coupons", href: "/admin/coupons", icon: Ticket }` (a normal admin item, not super-only).

## Checkout integration

- **`checkout-view.tsx`**: replace `const discount = 0` with applied-coupon state `{ code, discountAmount } | null`. Add a **coupon input + "Apply"** (in the summary, above the CTA) → calls `applyCoupon(code, subtotal)` → on success stores the result and shows the existing `OrderSummary` "Discount −৳X" line; on failure toasts the reason. A "Remove" clears it. If the cart subtotal changes after applying, clear the applied coupon (require re-apply) so the shown discount can't go stale. `total = subtotal + delivery + codLine − discountAmount`.
- **`createOrder`** (`orders.ts`): `CreateOrderInput` gains `couponCode?: string`. After computing the server-side `subtotal`, re-read + re-validate the coupon; if a code was supplied but is invalid → return a clear error (don't silently overcharge). Compute `discount = computeCouponDiscount(subtotal, pct)`, set `total = subtotal + deliveryFee + codFee − discount` (≥ 0), and pass `coupon_code` + `discount_total` into `p_order`. Map the RPC's `coupon_unavailable` to "This coupon is no longer available." The confirmation email / invoice `total` already reflects the discount; add a `discountTotal` figure to the invoice/email data so the breakdown reconciles.

## Testing

- **Pure (TDD):** `normalizeCode` (trim/upper); `computeCouponDiscount` (rounding e.g. 1000×15%=150, 999×10%=100→wait 99.9→100? round → 100; cap at subtotal); `validateCoupon` across every reason + the happy path + boundaries (expiry exactly now, subtotal exactly min, used_count == limit).
- **Integration (after 0017, real admin session):** create a coupon (e.g. `SAVE15`, 15%, min ৳1000, limit 2, expiry future); at checkout apply it under ৳1000 → below-min error; over ৳1000 → 15% off, total drops; place the order → `discount_total` + `coupon_code` recorded, `used_count` increments; apply after the limit is hit → rejected; inactive/expired coupons rejected; a non-admin can't reach the coupon actions.

## Architecture summary

A tiny pure core (normalize / compute / validate) is the single source of truth, reused by the checkout `applyCoupon`, by `createOrder`'s authoritative re-check, and (the guard) by `place_order`. Admin CRUD mirrors existing managers; the checkout discount slot already exists. One migration; percentage-only; one coupon per order.
