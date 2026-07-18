# toytuni-store — Phase 3 Slice 3a: Pre-order + Advance Payment (display-only)

**Date:** 2026-07-18
**Status:** Design approved, pending spec review
**Scope:** Enrich the existing pre-order state with two dates (shipping-start, expected-delivery) and a per-product **advance-payment percentage**. Show the advance breakdown on the PDP, at checkout, and on the order. **Display-only** — no money is collected up front yet; real collection waits for the payment gateway (Phase 4). Full PDP content editing (features/benefits/tabs/specs/video/gallery) is a **separate later slice (3b)**, out of scope here.

## Background

Pre-order today is a derived state (`src/lib/data/product-state.ts` `getProductState`): `stock>0` = `in_stock`; `stock≤0` + future `preorder_ship_date` = `preorder`; else `sold_out`. The PDP shows a "Pre-order now" button + "Ships from <date>". `createOrder` (`src/lib/data/orders.ts`) re-reads price/stock server-side, tags each line `fulfillment_type` (`in_stock`/`preorder`) and stores `preorder_ship_date`; `place_order` (migration `0002`) inserts. `orders.payment_method` is constrained to `'cod'` only; there is no gateway.

The user wants a richer pre-order card: **📦 Shipping starts from**, **🚚 Expected delivery**, and **💳 Payment: Advance Payment** with a per-product percentage (presets 10/20/30/50 or a custom value), plus the "advance now / balance on delivery" split — visible on the PDP, at checkout, and on the order record.

## Goals

- **Two dates:** `preorder_ship_date` (already exists) = "Shipping starts from"; add `preorder_delivery_date` = "Expected delivery".
- **Advance %:** per-product `preorder_advance_pct` (0–100; `null`/`0` = no advance). Admin sets it via a preset menu (10/20/30/50) or a custom value.
- **Derived breakdown:** for a product in `preorder` state, compute `advanceAmount = round(price × pct / 100)` and `balance = price − advanceAmount` (per unit) / line-level at checkout.
- **PDP display:** in the pre-order block show the two dates and, when a pct is set, "Advance {pct}% · ৳{advance} now / ৳{balance} on delivery".
- **Checkout display + order persistence:** show the advance breakdown for pre-order lines and an order-level "Advance due now / Pay on delivery" summary; persist `order_items.preorder_advance_pct` (snapshot) and `orders.advance_total` (sum of pre-order line advances) so the order record is complete for Phase 4.
- **Admin form:** relabel the ship-date field, add the delivery-date field and the advance-% control, to both the edit and the create forms; validate.

## Non-goals (this slice)

- **No real payment collection.** `payment_method` stays `'cod'`; the order `total` remains the full COD amount. `advance_total` is informational (what a gateway *would* collect up front). Online advance collection is Phase 4.
- **No full PDP content editing** (features, benefits, whyPlay/howPlay tabs, specs, returnPolicy, deliveryEstimate, videoUrl, multi-image gallery, reviews). That is Slice 3b. Reviews stay customer-content (managed separately). Global/site strips (trust certifications, "300k+ babies", share count, certified logo) stay hardcoded/site-wide.

## Locked decisions

- Advance is **display-only** this slice (record, don't collect).
- Breakdown shows in **all three places**: PDP + checkout + order detail.
- Advance % is **per-product**, presets **10 / 20 / 30 / 50** plus a **Custom** integer (0–100); `None` = no advance.
- Rounding: `advanceAmount = Math.round(amount × pct / 100)` (integer BDT); `balance = amount − advanceAmount`.
- Advance applies only to lines whose server-computed `fulfillment_type = 'preorder'` at order time (an item back in stock pays no advance).

## Schema (migration 0006)

- `products`: `add column if not exists preorder_delivery_date date;` `add column if not exists preorder_advance_pct int check (preorder_advance_pct is null or (preorder_advance_pct between 0 and 100));`
- `orders`: `add column if not exists advance_total int not null default 0;`
- `order_items`: `add column if not exists preorder_advance_pct int;` (null for in-stock lines)
- Replace the `place_order` function (from `0002`) so it also reads `advance_total` off `p_order` and `preorder_advance_pct` off each `p_item`, inserting them. All other behavior (stock decrement, insufficient_stock guard) unchanged.

## Architecture

- **Pure helper** `computeAdvance(amount: number, pct: number | null): number` — `pct` null/0 → 0; else `Math.round(amount * pct / 100)`. Lives with `product-state` (or a small `src/lib/data/advance.ts`). Fully unit-tested.
- **`getProductState`** — extend its input to accept `preorderDeliveryDate` and `preorderAdvancePct` (and the unit `price`), and, on the `preorder` branch, return `deliveryDate`, `advancePct`, `advanceAmount` alongside the existing `shipDate`. `ProductAvailability` type gains these optional fields.
- **`Product` type + `full-catalog`** — add `preorderDeliveryDate: string | null` and `preorderAdvancePct: number | null`; include the two columns in the `getFullCatalog` select and `rowToFullProduct` mapper; the storefront catalog carries them into `getProductState`.
- **PDP** (`src/components/product/product-details-view.tsx`) — in the existing `availability?.state === "preorder"` block, render the two dated lines (📦 Shipping starts from, 🚚 Expected delivery) and, when `advancePct` is set, the 💳 Advance line ("Advance {pct}% · ৳{advance} now / ৳{balance} on delivery"). Icons from lucide (Truck, Package/CalendarDays, CreditCard). Missing delivery date or pct → that line is simply omitted.
- **Checkout** (checkout summary component) — for pre-order lines show a small "Advance {pct}% (৳{advance})" note; below the totals, an informational row "Advance due now: ৳{sum} · Pay on delivery: ৳{balance}" with a caption that online advance goes live with card/mobile payment (Phase 4). Computed client-side from the catalog for display.
- **`createOrder`** (`src/lib/data/orders.ts`) — also select `preorder_delivery_date, preorder_advance_pct`; for each `preorder` line snapshot `preorder_advance_pct` and compute its advance via `computeAdvance(line_total, pct)`; sum into `advance_total`; pass both into `place_order`. In-stock lines: `preorder_advance_pct = null`, contribute 0.
- **Admin form** (`src/components/admin/product-edit-form.tsx` + `product-create-form.tsx`) — relabel "Pre-order ship date" → "Shipping starts from"; add "Expected delivery date" (`type=date`); add "Advance payment %" = a `Select` (`None / 10 / 20 / 30 / 50 / Custom`) that reveals a number input (0–100) when `Custom`. `ProductPatch` + `createProduct` input gain `preorder_delivery_date` and `preorder_advance_pct`; `updateProduct`/`createProduct` validate (date parses; pct integer 0–100 or null) and persist to `products`. Existing `revalidateStorefront()` busts the catalog cache.
- **Admin order detail** (`src/app/admin/orders/[id]/page.tsx` + query) — select `advance_total` + `order_items.preorder_advance_pct`; show per-line advance and an "Advance total" row.

## Data flow — placing a pre-order

1. Admin sets stock 0 + shipping-start + expected-delivery + advance % (one save) → `products` updated, `revalidateTag("catalog")`.
2. PDP shows the pre-order card with both dates + the advance split.
3. Customer clicks "Pre-order now" → checkout shows the advance breakdown; places the order (still COD).
4. `createOrder` re-reads the product, computes each pre-order line's advance, persists `order_items.preorder_advance_pct` + `orders.advance_total`; `total` is the full COD amount.
5. Admin order detail shows the advance total (what a future gateway would collect up front); the balance is paid on delivery.

## Security / correctness

- Advance %, dates re-read server-side in `createOrder`; the client breakdown is display-only and can't change what's stored (server recomputes from the DB row + `computeAdvance`).
- `advance_total ≤ total` always (advance is a percentage of pre-order line totals ≤ order total). Validate pct ∈ [0,100].
- Admin writes keep the existing `getIsAdmin()` re-check + service-role.
- `payment_method` stays `'cod'` — no schema/label implies money is collected now.

## Testing

- **Pure (TDD):** `computeAdvance` (0/null pct → 0; rounding, e.g. 720×20% = 144; 850×30% = 255); `getProductState` preorder branch carries `deliveryDate`/`advancePct`/`advanceAmount` and omits them for in_stock/sold_out.
- **Integration (drive it):** admin sets stock 0 + both dates + advance % (one save) → PDP shows the pre-order card with dates + advance split; a pre-order checkout shows the breakdown and persists `order_items.preorder_advance_pct` + `orders.advance_total`; a mixed cart (in-stock + preorder) only charges advance on the pre-order line; admin order detail shows the advance total. Verified with a real admin session + a placed order.

## Follow-ups (later slices)

- **Slice 3b — full PDP content editing:** make `ProductDetail` (description, features, benefits, whyPlay, howPlay, returnPolicy, specs, deliveryEstimate, videoUrl, gallery images) DB-sourced and admin-editable. Reviews managed separately; global strips move to Settings.
- **Phase 4 — payments:** actually collect the advance online (SSLCommerz/aamarPay/bKash); flip `payment_method` to include an advance/online method; reconcile `advance_total` as collected.
