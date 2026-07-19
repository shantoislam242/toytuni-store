# toytuni-store — Phase 3 Slice: Admin Inventory

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** An `/admin/inventory` page — a focused, single-screen view of every product's stock, with **inline quick edits**: set an exact stock value, **±adjust** (restock / deduct), and edit the low-stock threshold, plus a search and low-stock / out-of-stock filters. Stock changes reflect on the storefront (availability) via `revalidateTag('catalog')`. Third of five admin sections (Settings ✓ → Categories ✓ → **Inventory** → Customers → Blog).

## Background

Phase 3 Slices 1/2/3a/3b + Settings + Categories are merged and live. The `inventory` table (`product_id uuid pk, stock_qty int, low_stock_threshold int default 5`) already backs storefront availability: `getProductState({ stockQty, preorderShipDate })` derives `in_stock` / `preorder` / `sold_out`. Stock is already editable per product in the product edit form, and the products list + dashboard show stock + a low-stock highlight/KPI (`stock_qty <= low_stock_threshold`). What's missing is a dedicated, low-friction inventory-management screen for scanning and quickly restocking across the whole catalog — this slice adds it (a management view, not new data).

## Goals

- **`getAdminInventory()`** — every sellable product with `{ slug, sku, title, imageUrl, stockQty, lowStockThreshold }`, ordered low-stock-first (out/low before healthy), service-role.
- **Inline edits** on `/admin/inventory`:
  - **Set stock** — type an exact new `stock_qty` (saved on blur/Enter).
  - **±Adjust stock** — −/+ buttons (and a delta) that add/subtract, clamped to ≥ 0.
  - **Edit low-stock threshold** — inline number (saved on blur/Enter).
- **Derived status** per row — Out (0) / Low (≤ threshold) / In stock — as a badge.
- **Filter + search** — text search (name/sku), a "Low stock only" toggle, an "Out of stock" toggle.
- **Storefront reflection** — every inventory write calls `revalidateTag('catalog')` so availability (sold-out ↔ in-stock ↔ pre-order) updates.
- Enable the **Inventory** sidebar item.

## Non-goals (this slice)

- No stock-history / audit log, no bulk CSV import, no per-warehouse stock. (Single stock number per product.)
- No new product creation/edit here (that's the product form) — inventory-only fields.
- No change to `getProductState` / storefront availability logic — only the stock VALUES change.
- No migration (inventory table exists); no `adjust_stock` DB function (adjust is a read-modify-write in the action — safe at single-admin scale, documented).

## Locked decisions

- **Set + Adjust** both, plus **threshold** editable inline.
- **Adjust clamps to ≥ 0** (can't go negative); read-modify-write in the action (no migration; documented single-admin race note).
- Status is **derived** (0 → Out; ≤ threshold → Low; else In stock).
- Inventory writes `revalidateTag('catalog')` (reuse the existing `revalidateStorefront(slug)` helper, which already tags catalog + taxonomy + paths).
- A dedicated `getAdminInventory()` read (ordered), not a reuse of `getAdminProducts`.

## Schema

No migration — `inventory` already has `stock_qty` + `low_stock_threshold`.

## Architecture

- **`src/lib/admin/inventory-status.ts`** (pure, TDD): `stockStatus(stockQty, threshold): "out" | "low" | "in_stock"` (0 → out; ≤ threshold → low; else in_stock) and `clampAdjust(current, delta): number` (`Math.max(0, current + delta)`). Reused by the row badge + the adjust action.
- **`src/lib/admin/queries.ts`** — `getAdminInventory(): Promise<AdminInventoryItem[]>` (service-role): read `products` (slug, sku, title, image_url) joined with `inventory(stock_qty, low_stock_threshold)` for all products, map to `AdminInventoryItem = { slug, sku, title, imageUrl, stockQty, lowStockThreshold }`, ordered out-of-stock/low first then by title (compute the order after mapping, or `.order` by stock and refine client-side). Reuse the existing `oneInventory` embed helper.
- **`src/lib/admin/actions.ts`** — two server actions, each `getIsAdmin()` re-check + service-role + `revalidateStorefront(slug)`:
  - `updateInventory(slug, patch: { stockQty?: number; lowStockThreshold?: number })` — validate each provided field is a non-negative integer (`isNonNegativeInt`); resolve `product_id` from slug; update `inventory`.
  - `adjustStock(slug, delta: number)` — validate `delta` is a non-zero integer; read the current `stock_qty` (via product_id), compute `clampAdjust(current, delta)`, write it; return the new value `{ ok: true; stock: number }` so the UI can reflect it.
- **Admin UI:**
  - `src/app/admin/inventory/page.tsx` (server) — `getAdminInventory()` → `<InventoryTable items={…} />`.
  - `src/components/admin/inventory-table.tsx` (client) — a toolbar (search input + "Low stock only" + "Out of stock" toggles) and a table: product (image thumb + name + sku), a **stock cell** (a controlled number `Input` that calls `updateInventory({stockQty})` on blur/Enter when changed, flanked by −/+ `Button`s calling `adjustStock(∓1)`), a **threshold cell** (number `Input` → `updateInventory({lowStockThreshold})` on blur/Enter), and a **status badge** (`stockStatus`). Filtering is client-side over the loaded list; each mutation is optimistic with `router.refresh()` on success / revert + toast on failure.
  - `src/components/admin/admin-sidebar.tsx` — remove `disabled` from the Inventory item.

## Data flow — restock a product

1. Admin `/admin/inventory` → filters "Low stock only" → clicks **+** on a row (or types a new stock and blurs) → `adjustStock(slug, +N)` / `updateInventory(slug, {stockQty})`.
2. Action re-checks admin, writes `inventory.stock_qty`, `revalidateStorefront(slug)` (→ `revalidateTag('catalog')`).
3. `getFullCatalog()` refreshes → `getProductState` recomputes → a previously sold-out product shows in-stock on the storefront; the row badge updates to In stock.

## Security / correctness

- Both actions re-check `getIsAdmin()` + service-role; stock/threshold/delta validated server-side (non-negative integer values; adjust clamps ≥ 0 so stock can never go negative).
- `adjustStock` is read-modify-write; at single-admin scale a lost update is not a concern (documented). The order-placement path keeps its own atomic guarded decrement (`place_order`), unaffected by this.
- Inventory writes `revalidateTag('catalog')` so storefront availability can't drift from the DB stock.
- `getAdminInventory` is service-role, server-only; no admin query reaches the client bundle.

## Testing

- **Pure (TDD):** `stockStatus` (0 → out; = threshold → low; threshold+1 → in_stock) and `clampAdjust` (positive add; negative below zero clamps to 0).
- **Integration (drive it, real admin session):** the inventory page lists products with correct status; set a stock value → persists + the storefront product's availability flips (sold-out → in-stock, or in-stock → sold-out/pre-order); +/− adjust changes stock and clamps at 0; edit a threshold → the Low badge threshold changes; "Low stock only" / "Out of stock" filters + search work; non-admin rejected. Verify against the live DB; restore any test values.

## Open questions for review

- Adjust delta granularity: only −1/+1 buttons vs. a small delta input (e.g. "+10"). Proposal: **−/+ (step 1) buttons for quick nudges, plus the "set exact value" input** covers a bulk restock (type the new total). No separate delta field this slice.
- Ordering: out-of-stock and low-stock first (most actionable) vs. alphabetical. Proposal: **low-stock-first**, then title.
