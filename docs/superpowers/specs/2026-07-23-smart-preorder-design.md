# toytuni-store — Smart Pre-order (stock-driven, global defaults)

**Date:** 2026-07-23
**Status:** Design approved (user), pending implementation
**Scope:** Make pre-order the automatic selling mode when stock is **low or zero**, driven by **store-wide defaults** (no per-product date entry needed), so pre-order applies to the maximum number of products with the least admin effort. Fix the product-card button so a pre-order product shows a **"Pre-order"** button (not "Add to Cart").

## Background

Today availability is derived by one pure function, `getProductState` ([src/lib/data/product-state.ts](../../../src/lib/data/product-state.ts)), which is the single source of truth for BOTH display (card badge, PDP button) AND order fulfillment ([src/lib/data/orders.ts](../../../src/lib/data/orders.ts) line 75). Current rule:

- `stockQty > 0` → **in_stock** ("Add to Cart")
- `stockQty === 0` **AND** a future per-product `preorder_ship_date` → **preorder**
- else → **sold_out**

`place_order` ([supabase/migrations/0002_place_order.sql](../../../supabase/migrations/0002_place_order.sql)) already **skips the stock guard for pre-order lines** (only `in_stock` lines decrement/guard), so ordering beyond stock already works for pre-order lines — the app decides the per-line `fulfillment_type` via `getProductState`.

**Friction being fixed:**
1. Pre-order needs stock 0 **and** a hand-entered future date per product → doesn't scale to "max products".
2. `low_stock_threshold` never affects the storefront button — low stock still shows "Add to Cart".
3. On product **cards**, a pre-order product shows only a corner badge; its **button still says "Add to Cart"** ([product-card.tsx](../../../src/components/product/product-card.tsx) line 233 passes only `soldOut`).

## Locked decisions (from user)

- **Trigger:** stock-driven — normally "Add to Cart"; when stock **≤ a threshold** (low **or** zero) it auto-flips to **Pre-order**.
- **Easy:** a **global default** — settings hold "ships in X days" + default advance %; no per-product date needed. Per-product date/advance remain optional overrides.
- Defaults to seed: **threshold 3**, **lead 7 days**, **advance 20%** (all editable in Settings).

## Goals

### 1. `getProductState` v2 (pure, backward-compatible)

New **optional** inputs (all default to today's behavior when omitted, so existing tests pass unchanged):

```ts
preorderEnabled?: boolean;                 // default true
preorderThreshold?: number;                // stock <= this → pre-order. default 0
preorderLeadDays?: number | null;          // auto ship date = now + leadDays when no explicit date. default null
preorderDefaultAdvancePct?: number | null; // fallback advance % when the per-product pct is null. default null
```

New rule (in order):

1. `stockQty > threshold` → `in_stock` (normal).
2. Else (stock at/below threshold — **low or zero**), if `preorderEnabled`:
   - Resolve a ship date: a **future** per-product `preorderShipDate` wins; else, if `leadDays != null`, `shipDate = now + leadDays` (UTC `YYYY-MM-DD`, via a small pure helper).
   - If a ship date resolved → `preorder` with `advancePct = perProductPct ?? defaultPct ?? null`, `advanceAmount = computeAdvance(price, pct)`, `deliveryDate = perProductDelivery ?? null`.
3. Fallback (pre-order disabled, or no ship date could be resolved): `stockQty > 0 ? in_stock : sold_out` — preserves current behavior when no global lead time is configured.

The `ProductAvailability` type is unchanged (the `preorder` variant already carries `shipDate`/`deliveryDate`/`advancePct`/`advanceAmount`). "Low stock but pre-order **disabled**" correctly stays **in_stock** (still sellable). "Sold out" only appears when pre-order is off (or unresolvable) and stock is 0.

### 2. Global settings (`Settings` + normalizer)

Add to `Settings` ([settings-shape.ts](../../../src/lib/data/settings-shape.ts)):

```ts
preorder: { enabled: boolean; thresholdQty: number; leadDays: number; advancePct: number };
```

`DEFAULT_SETTINGS.preorder = { enabled: true, thresholdQty: 3, leadDays: 7, advancePct: 20 }`. `rowToSettings` normalizes: `enabled` → boolean; `thresholdQty`/`leadDays` → non-negative int (fallback default); `advancePct` → int clamped 0–100. Stored in the single `site_settings.general` jsonb row — **no migration**.

### 3. Thread globals into the two live call sites

- **`full-catalog.ts` `readFullCatalog`:** `const settings = await getSettings();` (cookieless, prerender-safe — same client family), pass `preorderEnabled/Threshold/LeadDays/DefaultAdvancePct` into `getProductState`. Because `readFullCatalog` is wrapped in `unstable_cache` (tag `"catalog"`), `updateSettings` must **also `revalidateTag("catalog")`** so a policy change refreshes availability. The `now + leadDays` date is frozen per cache window (≤ 1 h) — acceptable at day granularity.
- **`orders.ts` `createOrder`:** already imports `getSettings`. Pass the same globals + `now` into `getProductState`, and snapshot the **resolved** `shipDate`/`advancePct` from the returned `preorder` state (not the raw per-product columns), so an auto-dated low-stock line records a correct `preorder_ship_date` and bypasses the stock guard consistently with what the shopper saw.

*(The mock `product-overlay.ts` path is not in the live catalog flow and keeps the old call — still valid via defaults.)*

### 4. Card button shows "Pre-order"

`AddToCartButton` ([add-to-cart-button.tsx](../../../src/components/cart/add-to-cart-button.tsx)) gains a `preorder?: boolean` prop. When `preorder` (and not sold out / already in cart): label **"Pre-order"**, matching icon; click still adds to cart (same flow). `product-card.tsx` passes `preorder={availability?.state === "preorder"}` alongside the existing badge. PDP already shows "Pre-order now" + the ship/delivery/advance box — with auto dates it now triggers for low-stock items too, no change needed.

### 5. Settings UI + action

- `settings-form.tsx`: new **"Pre-order"** card — Enabled toggle, Threshold qty, Lead days, Advance %. Wire into `next.preorder` + client validation.
- `updateSettings` ([actions.ts](../../../src/lib/admin/actions.ts)): validate the four fields, include `preorder` in the persisted `value`, and add `revalidateTag("catalog")`. **Also include `customerTiers` in the persisted `value`** (currently omitted — a latent data-loss bug that a Save would trigger; fix while adjacent).

## Non-goals

- No payment collection for advance — stays **informational** (COD store); the global % just feeds the existing advance display + `advance_total` snapshot.
- No per-product "always pre-order (made-to-order)" toggle (user chose stock-driven; can add later).
- No new DB columns/migration. No change to `place_order`. No change to the cart/checkout advance display logic beyond it now triggering more often.

## Testing

- **Pure (TDD), `product-state.test.ts`:** existing cases still green (defaults); new — low stock (stock 3, threshold 3, lead 7) → preorder w/ `now+7` date; stock 4/threshold 3 → in_stock; disabled + stock 0 → sold_out; disabled + low stock (2) → in_stock; advance fallback (per-product null, default 20, price 1000 → pct 20, amount 200); explicit future per-product date overrides lead time.
- **Pure, `settings-shape.test.ts`:** `preorder` defaults fill in; invalid/missing normalize; advancePct clamps to 0–100.
- **Integration (real admin session):** set Settings (e.g. threshold 3, lead 5, advance 25) → save persists + customerTiers survive; a product with stock ≤ 3 flips to Pre-order on card (button + badge) and PDP (with computed ship date + advance split); a stock-4 product stays Add to Cart; place a pre-order for more than stock → succeeds (no `insufficient_stock`), order records the resolved ship date/advance; turn pre-order **off** → low-stock product returns to Add to Cart and a 0-stock one reads Sold out.

## Architecture summary

One pure brain (`getProductState`) already fans out to display + fulfillment; we widen its inputs with a global policy, feed that policy from `Settings` at the two live call sites, surface the state on the card button, and bust the catalog cache when the policy changes. Minimal surface, no migration, fully backward-compatible.
