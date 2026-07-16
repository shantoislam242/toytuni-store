# toytuni-store — Backend Phase 1: Data Layer (with Pre-order)

**Date:** 2026-07-16
**Status:** Design approved, pending spec review
**Scope:** Phase 1 of a 5-phase backend/admin effort. This spec covers the data
layer only.

## Background

toytuni-store is a Next.js 16 storefront that is currently 100% static: every
page renders from hardcoded TypeScript in `src/lib/mock/*.ts`. There is no
database, no auth, no API routes, and no server-side order capture (cart,
wishlist, and checkout are all client-only, backed by `localStorage`). Changing
a price or stock level today requires editing code and redeploying.

The goal is a Supabase-backed store, modeled loosely on the Storify-app admin
(`C:\Databrandix HQ\ecommerce-platform\Storify-app`, MongoDB, 103 admin pages —
reference only, different stack), scoped down to what this store actually needs.

### Phase breakdown (whole effort)

1. **Data layer** — Supabase schema, mock→DB migration, storefront reads, COD
   orders, pre-order support. **← this spec**
2. Auth — Supabase Auth, admin role, optional customer accounts
3. Admin UI — Dashboard, Products, Orders, Customers, Inventory, Blog, Settings
   (~10–15 pages)
4. Payments — SSLCommerz / aamarPay (bKash, Nagad, card)
5. AI layer — Vercel AI SDK, pgvector

Admin UI is Phase 3. Until then, the **Supabase Studio table editor** is the
interim admin: editing a price/stock row there triggers ISR revalidation and
shows on the live site. Phase 1 therefore delivers a code-free-to-operate store
on day one, even before a custom admin exists.

## Goals

- Storefront reads product/catalog/blog data from Supabase instead of mock files.
- Real COD orders persist to the database.
- Pre-order support: a product with no stock but a future ship date is orderable
  as a pre-order.
- Static + ISR rendering preserved (speed and resilience).
- Row Level Security enforced from day one.

## Non-goals (Phase 1)

- No admin UI (Phase 3).
- No auth beyond what order capture needs (Phase 2 owns Supabase Auth; guest
  checkout works without it).
- No online payment (Phase 4). COD only.
- Bespoke editorial pages (sustainability, safety-standards, about) and
  policy/FAQ content stay in code — their data is bound to custom React views
  with icon-union types; a block-editor CMS is deferred.

## Locked decisions

- **Approach A** — operational core + settings in DB. Blog → DB; other content
  stays in code.
- **Orders:** real, COD only. Payment collected on delivery (no deposit, even
  for pre-orders).
- **Customers:** guest checkout + optional accounts (accounts land with Phase 2
  auth; the schema allows a null `auth_user_id`).
- **Rendering:** static + ISR (`revalidateTag` on data change).
- **Images:** Supabase Storage. Migrate the existing 55 files under
  `public/images/products/<slug>/N.webp`.
- **Mixed cart:** in-stock and pre-order items may share one order; each line
  carries its own fulfillment type and ship date. No order splitting.

## Schema (10 tables)

### Catalog
- **products** — `slug` (unique), `sku`, `title`, `price`, `compare_at_price`,
  `rating`, `review_count`, `age_tier_slug`, `category_slug`, `badge`,
  `description`, image fields, `active` (controls storefront visibility),
  `preorder_ship_date` (date, nullable), `created_at`, `updated_at`.
- **product_variants** — `product_id`, `name`, `tone` (current `Variant`).
- **categories** — `slug` + display fields.
- **age_tiers** — `slug` + display fields.

### Stock + pre-order (the core logic)
- **inventory** — `product_id`, `stock_qty`, `low_stock_threshold`.
- Product state is **derived**, not a stored flag:

  | stock_qty | preorder_ship_date | state |
  |-----------|--------------------|-------|
  | > 0       | —                  | In stock |
  | ≤ 0       | future date        | Pre-order ("Ships from <date>") |
  | ≤ 0       | null               | Sold out |

  The owner puts a product on pre-order by setting stock to 0 and a future ship
  date — no separate flag to manage.

### Orders
- **orders** — `order_number`, customer snapshot (name, phone, email), address
  (division / district / area / line), `status` (`pending` initial),
  `payment_method` (`cod`), `subtotal`, `delivery_fee`, `total`, `notes`,
  `created_at`.
- **order_items** — `order_id`, `product_id`, **`title` + `unit_price`
  snapshot** (order keeps the price/name as sold even if the product later
  changes), `qty`, `line_total`, **`fulfillment_type` (`in_stock` |
  `preorder`)**, `preorder_ship_date` snapshot.

`fulfillment_type` is the key to pre-order tracking: a mixed cart is one order
whose lines record which ship now vs. on a date.

### Customer + content + settings
- **customers** — `phone` (unique), `name`, `email`, `auth_user_id` (nullable;
  null for guests).
- **blog_posts** — `slug`, `title`, `excerpt`, `body` (jsonb — current typed
  block array), `author`, `cover`, `featured`, `published`.
- **site_settings** — brand, shipping thresholds, COD fee, contact. Consolidates
  values currently spread across `config.ts` and `shipping.ts`.

## Data access layer

All database calls live in `src/lib/data/`; pages never touch Supabase directly.
This keeps the mock→DB swap contained and leaves room to swap in Medusa later.

- `products.ts` → `getProducts()`, `getProductBySlug()`, `getProductState()`
  (derives in_stock / preorder / sold_out from stock + ship date)
- `orders.ts` → `createOrder()` (server-only)
- `blog.ts`, `settings.ts`, `categories.ts`

Two clients: an **anon-key** client for reads (guarded by RLS) and a
**service-role** client for writes (used only inside server actions).

## Order creation flow (critical path)

Checkout calls a server action `createOrder()`:

1. Re-read every line's price from the DB **server-side** — never trust the
   price the browser sent (otherwise a client could alter prices).
2. Check each line's stock to set `fulfillment_type` (in_stock / preorder).
3. Snapshot price + preorder date into `orders` + `order_items`.
4. Set `status = pending`, `payment_method = cod`.

### Stock race condition

Two shoppers taking the last unit at once: Phase 1 keeps it simple with an
atomic Postgres decrement — `stock_qty = stock_qty - qty WHERE stock_qty >= qty`.
If it doesn't decrement, that line falls back to pre-order or sold-out in the
result. No heavyweight locking.

## Migration (mock → DB)

A one-time `scripts/seed.ts` imports the current `src/lib/mock/*.ts` and loads
Supabase. Product images: upload the 55 files from `public/images/products/` to
Supabase Storage and record the URLs.

**The mock files are not deleted** until the seed is done and verified — they
remain as a rollback safety net.

## Security (RLS, from day one)

- `products` / `variants` / `categories` / `blog_posts (published)` — anon
  **read**, restricted to `active` / `published` rows.
- `orders` / `order_items` / `customers` — anon can read **nothing**; inserts
  happen only through server actions.
- All writes use the service-role key, server-side.
- The anon key is public in the browser (by design); RLS is the real wall. RLS
  is not optional — without it, anyone opening the Supabase endpoint could read
  every order and customer phone number.

## Rendering / revalidation

`generateStaticParams` pulls slugs from the DB at build. On data change,
`revalidateTag('products')` (etc.) refreshes only the affected pages. Because
pages are pre-rendered, the store stays up even if Supabase is briefly down —
only checkout stops working.

## Testing

No test framework exists yet. This phase adds **Vitest**, testing only the risky
pure logic — where a bug means wrong money or wrong stock:

1. `getProductState()` — correct state from stock + ship date across the table
   above.
2. Order price snapshot + total computation.
3. Atomic stock decrement (in-stock vs. pre-order fallback).

No UI tests in Phase 1.

## Open questions for review

None blocking. Pre-order deposit and order-splitting were considered and
explicitly deferred (COD collects full payment on delivery; mixed carts stay as
one order).
