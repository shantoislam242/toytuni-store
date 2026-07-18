# Pre-order + Advance Payment (display-only) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the existing pre-order state with an expected-delivery date and a per-product advance-payment %, and show the "advance now / balance on delivery" split on the PDP, at checkout, and on the admin order — display-only (no money collected up front yet).

**Architecture:** A pure `computeAdvance` helper + an extended `getProductState` carry the new fields through the DB catalog (`getFullCatalog`) to the PDP. Admin gains delivery-date + advance-% controls; `createOrder`/`place_order` snapshot the advance onto the order. `payment_method` stays `'cod'`; `advance_total` is informational until Phase 4.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase (`@supabase/ssr`), shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-preorder-advance-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before touching server actions / `revalidateTag` / caching. Middleware is `src/proxy.ts` (not `middleware.ts`).
- **Display-only.** No real collection. `orders.payment_method` stays `'cod'`; `orders.total` remains the full COD amount. `advance_total` is informational.
- **Stale generated types.** The checked-in `src/lib/supabase/database.types.ts` predates the new columns (`products.preorder_delivery_date`, `products.preorder_advance_pct`, `orders.advance_total`, `order_items.preorder_advance_pct`). Do NOT regenerate it. Use the existing narrow-cast pattern (`as unknown as Database["public"]["Tables"][...]["Update"]`, or a local `& { … }` extension type) exactly as `image_url` is handled in `src/lib/admin/actions.ts:281-284`.
- **Rounding:** advance = `Math.round(amount * pct / 100)`; a `null`/`0`/negative pct yields `0`. Whole BDT everywhere (`formatTk`); dates via `formatDate`.
- **Advance applies only to `fulfillment_type === "preorder"` lines** (server-decided in `createOrder`).
- Admin writes keep the `getIsAdmin()` re-check + service-role client. `.env.local`/`.superpowers/` are gitignored — stage explicit paths only.
- Toytuni theme (neem/cream/ink, `font-display`). Match surrounding component idiom.

## Manual step (user)

Apply `supabase/migrations/0006_preorder_advance.sql` in the Supabase SQL editor **before** the Task 6–9 live verification. Tasks 2–7's unit tests + build do not require it; the DB round-trip (Task 6, 8, 9 verification) does.

## File structure

- Create `src/lib/data/advance.ts` (+ `.test.ts`) — pure `computeAdvance`.
- Create `supabase/migrations/0006_preorder_advance.sql` — schema + `place_order` update.
- Modify `src/lib/data/product-state.ts` (+ `.test.ts`) — carry delivery/advance on the preorder state.
- Modify `src/lib/types.ts` — `Product` gains two fields.
- Modify `src/lib/data/full-catalog.ts` (+ `.test.ts`) — select/map/`getProductState` wiring.
- Modify `src/components/product/product-details-view.tsx` — PDP pre-order card.
- Modify `src/lib/admin/actions.ts` — `ProductPatch`/`CreateProductInput` + validation + writes.
- Modify `src/lib/admin/queries.ts` — `AdminProductDetail` + `AdminOrderDetail` + selects.
- Modify `src/components/admin/product-edit-form.tsx` + `product-create-form.tsx` — new controls.
- Modify `src/components/checkout/order-summary.tsx` + `checkout-view.tsx` — advance rows.
- Modify `src/lib/data/orders.ts` — persist advance.
- Modify `src/app/admin/orders/[id]/page.tsx` — advance display.

---

## Task 1: Migration 0006 (schema + place_order)

**Files:**
- Create: `supabase/migrations/0006_preorder_advance.sql`

**Interfaces:**
- Produces: DB columns `products.preorder_delivery_date date`, `products.preorder_advance_pct int (0–100)`, `orders.advance_total int not null default 0`, `order_items.preorder_advance_pct int`; a `place_order(jsonb, jsonb)` that persists `p_order.advance_total` and each `p_item.preorder_advance_pct`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0006_preorder_advance.sql` (the `place_order` body is copied verbatim from `0002_place_order.sql` with only the two new inserted columns added — do NOT drop the existing behavior):

```sql
-- toytuni-store — Phase 3 Slice 3a: pre-order + advance payment (display-only).
-- Adds an expected-delivery date + per-product advance % to products, an
-- order-level advance_total and a per-line advance % snapshot, and updates
-- place_order to persist them. No money is collected up front yet
-- (payment_method stays 'cod'); advance_total is informational until Phase 4.
-- Run this whole file in the Supabase SQL editor after 0005_catalog_fields.sql.

alter table products add column if not exists preorder_delivery_date date;
alter table products add column if not exists preorder_advance_pct int
  check (preorder_advance_pct is null or (preorder_advance_pct between 0 and 100));
alter table orders add column if not exists advance_total int not null default 0;
alter table order_items add column if not exists preorder_advance_pct int;

create or replace function place_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
begin
  insert into customers (phone, name, email)
    values (p_order->>'customer_phone', p_order->>'customer_name', p_order->>'customer_email')
    on conflict (phone) do update set name = excluded.name, email = excluded.email
    returning id into v_customer_id;

  insert into orders (
    order_number, customer_id, customer_name, customer_phone, customer_email,
    division, district, area, address_line, landmark,
    subtotal, delivery_fee, total, advance_total, notes
  ) values (
    p_order->>'order_number', v_customer_id,
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'customer_email',
    p_order->>'division', p_order->>'district', p_order->>'area',
    p_order->>'address_line', nullif(p_order->>'landmark', ''),
    (p_order->>'subtotal')::int, (p_order->>'delivery_fee')::int,
    (p_order->>'total')::int, coalesce((p_order->>'advance_total')::int, 0),
    nullif(p_order->>'notes', '')
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if v_item->>'fulfillment_type' = 'in_stock' then
      update inventory
        set stock_qty = stock_qty - (v_item->>'qty')::int
        where product_id = (v_item->>'product_id')::uuid
          and stock_qty >= (v_item->>'qty')::int;
      if not found then
        raise exception 'insufficient_stock:%', v_item->>'product_id';
      end if;
    end if;

    insert into order_items (
      order_id, product_id, title, unit_price, qty, line_total,
      fulfillment_type, preorder_ship_date, preorder_advance_pct
    ) values (
      v_order_id, (v_item->>'product_id')::uuid, v_item->>'title',
      (v_item->>'unit_price')::int, (v_item->>'qty')::int, (v_item->>'line_total')::int,
      v_item->>'fulfillment_type', nullif(v_item->>'preorder_ship_date', '')::date,
      nullif(v_item->>'preorder_advance_pct', '')::int
    );
  end loop;

  return p_order->>'order_number';
end
$$;

revoke execute on function place_order(jsonb, jsonb) from anon, authenticated;
```

- [ ] **Step 2: Commit** (the user applies it in the Supabase SQL editor separately)

```bash
git add supabase/migrations/0006_preorder_advance.sql
git commit -m "feat(preorder): migration 0006 — delivery date, advance %, place_order wiring"
```

---

## Task 2: `computeAdvance` helper (TDD)

**Files:**
- Create: `src/lib/data/advance.ts`
- Test: `src/lib/data/advance.test.ts`

**Interfaces:**
- Produces: `computeAdvance(amount: number, pct: number | null): number`.

- [ ] **Step 1: Write the failing test**

`src/lib/data/advance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeAdvance } from "./advance";

describe("computeAdvance", () => {
  it("returns 0 when no pct is set", () => {
    expect(computeAdvance(720, null)).toBe(0);
    expect(computeAdvance(720, 0)).toBe(0);
    expect(computeAdvance(720, -5)).toBe(0);
  });

  it("computes a rounded percentage of the amount", () => {
    expect(computeAdvance(720, 20)).toBe(144);
    expect(computeAdvance(850, 30)).toBe(255);
    expect(computeAdvance(999, 33)).toBe(330); // 329.67 → 330
    expect(computeAdvance(1000, 50)).toBe(500);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`computeAdvance` not defined)

Run: `npx vitest run src/lib/data/advance.test.ts`
Expected: FAIL — cannot find module `./advance`.

- [ ] **Step 3: Implement**

`src/lib/data/advance.ts`:

```ts
/**
 * Advance amount (whole BDT) for a pre-order line/unit: `pct`% of `amount`,
 * rounded to the nearest Taka. A null / zero / negative pct (no advance
 * configured) yields 0. Pure — the single source of truth for the "advance now"
 * figure across the PDP, checkout, and `createOrder`.
 */
export function computeAdvance(amount: number, pct: number | null): number {
  if (pct === null || pct <= 0) return 0;
  return Math.round((amount * pct) / 100);
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npx vitest run src/lib/data/advance.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/advance.ts src/lib/data/advance.test.ts
git commit -m "feat(preorder): computeAdvance helper (TDD)"
```

---

## Task 3: Extend `getProductState` (TDD)

**Files:**
- Modify: `src/lib/data/product-state.ts`
- Test: `src/lib/data/product-state.test.ts` (create if absent; else append)

**Interfaces:**
- Consumes: `computeAdvance` (Task 2).
- Produces: `ProductAvailability` preorder variant is now `{ state: "preorder"; shipDate: string; deliveryDate: string | null; advancePct: number | null; advanceAmount: number }`. `getProductState` input gains optional `preorderDeliveryDate?: string | null`, `preorderAdvancePct?: number | null`, `price?: number`.

- [ ] **Step 1: Write the failing test**

`src/lib/data/product-state.test.ts` (add these; keep any existing cases):

```ts
import { describe, it, expect } from "vitest";
import { getProductState } from "./product-state";

describe("getProductState — preorder advance fields", () => {
  const now = new Date("2098-01-01T00:00:00Z");

  it("carries delivery date, advance pct and computed amount for a preorder", () => {
    expect(
      getProductState({
        stockQty: 0,
        preorderShipDate: "2099-01-05",
        preorderDeliveryDate: "2099-01-10",
        preorderAdvancePct: 20,
        price: 720,
        now,
      }),
    ).toEqual({
      state: "preorder",
      shipDate: "2099-01-05",
      deliveryDate: "2099-01-10",
      advancePct: 20,
      advanceAmount: 144,
    });
  });

  it("defaults advance/delivery to null/0 when omitted", () => {
    expect(
      getProductState({ stockQty: 0, preorderShipDate: "2099-01-05", now }),
    ).toEqual({
      state: "preorder",
      shipDate: "2099-01-05",
      deliveryDate: null,
      advancePct: null,
      advanceAmount: 0,
    });
  });

  it("still reports in_stock when stock remains", () => {
    expect(getProductState({ stockQty: 3, preorderShipDate: "2099-01-05", now }))
      .toEqual({ state: "in_stock", stockQty: 3 });
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (extra keys missing on the preorder object)

Run: `npx vitest run src/lib/data/product-state.test.ts`
Expected: FAIL — `deliveryDate`/`advancePct`/`advanceAmount` undefined.

- [ ] **Step 3: Implement** — replace the whole file body:

```ts
import { computeAdvance } from "./advance";

export type ProductAvailability =
  | { state: "in_stock"; stockQty: number }
  | {
      state: "preorder";
      shipDate: string;
      deliveryDate: string | null;
      advancePct: number | null;
      advanceAmount: number;
    }
  | { state: "sold_out" };

/** Derive availability from stock + an optional future ship date. For a
 *  pre-order, also surface the expected-delivery date and the advance-payment
 *  split (pct + computed amount from the unit price). */
export function getProductState(input: {
  stockQty: number;
  preorderShipDate: string | null;
  preorderDeliveryDate?: string | null;
  preorderAdvancePct?: number | null;
  price?: number;
  now?: Date;
}): ProductAvailability {
  const {
    stockQty,
    preorderShipDate,
    preorderDeliveryDate = null,
    preorderAdvancePct = null,
    price = 0,
    now = new Date(),
  } = input;
  if (stockQty > 0) return { state: "in_stock", stockQty };
  if (preorderShipDate) {
    const ship = new Date(`${preorderShipDate}T00:00:00Z`);
    if (ship.getTime() > now.getTime())
      return {
        state: "preorder",
        shipDate: preorderShipDate,
        deliveryDate: preorderDeliveryDate,
        advancePct: preorderAdvancePct,
        advanceAmount: computeAdvance(price, preorderAdvancePct),
      };
  }
  return { state: "sold_out" };
}
```

- [ ] **Step 4: Run it — expect PASS**

Run: `npx vitest run src/lib/data/product-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/product-state.ts src/lib/data/product-state.test.ts
git commit -m "feat(preorder): getProductState carries delivery date + advance split (TDD)"
```

---

## Task 4: `Product` type + `full-catalog` wiring (TDD)

**Files:**
- Modify: `src/lib/types.ts:41-68` (`Product`)
- Modify: `src/lib/data/full-catalog.ts`
- Test: `src/lib/data/full-catalog.test.ts` (append to existing `rowToFullProduct` test)

**Interfaces:**
- Consumes: extended `getProductState` (Task 3).
- Produces: `Product` gains `preorderDeliveryDate?: string | null` and `preorderAdvancePct?: number | null`; `FullProductRow` gains `preorder_delivery_date` + `preorder_advance_pct`; the catalog select + `getProductState` call include them.

- [ ] **Step 1: Add the fields to `Product`** — in `src/lib/types.ts`, inside the `Product` type (after `imageUrl?`):

```ts
  /** Pre-order: expected-delivery date (DB `products.preorder_delivery_date`),
   *  shown as "Expected delivery". Null/absent when not set. */
  preorderDeliveryDate?: string | null;
  /** Pre-order: advance-payment percentage 0–100 (DB `products.preorder_advance_pct`).
   *  Drives the "advance now / balance on delivery" split. Null/absent = no advance. */
  preorderAdvancePct?: number | null;
```

- [ ] **Step 2: Write the failing test** — in `src/lib/data/full-catalog.test.ts`, extend the fixture row used by the `rowToFullProduct` test with the two columns and assert they map. Add this case (adjust the fixture spread to match the existing test's row variable name if different):

```ts
it("maps pre-order delivery date and advance pct", () => {
  const row = {
    slug: "p", sku: "S-1", title: "T", price: 720, compare_at_price: null,
    rating: 5, review_count: 0, age_tier_slug: null, category_slug: null,
    badge: null, description: null, image_label: "T", image_tones: ["cream", "cream"],
    image_url: null, kit_contents: null, preorder_ship_date: "2099-01-05",
    preorder_delivery_date: "2099-01-10", preorder_advance_pct: 20,
    inventory: { stock_qty: 0 }, product_variants: [],
  };
  const p = rowToFullProduct(row);
  expect(p.preorderDeliveryDate).toBe("2099-01-10");
  expect(p.preorderAdvancePct).toBe(20);
});
```

- [ ] **Step 3: Run it — expect FAIL** (mapper drops the fields; `FullProductRow` lacks them)

Run: `npx vitest run src/lib/data/full-catalog.test.ts`
Expected: FAIL — `p.preorderDeliveryDate` is `undefined` / type error on the fixture.

- [ ] **Step 4: Implement** — three edits in `src/lib/data/full-catalog.ts`:

(a) Add to `FullProductRow` (after `preorder_ship_date: string | null;`):

```ts
  preorder_delivery_date: string | null;
  preorder_advance_pct: number | null;
```

(b) Add to the `rowToFullProduct` return object (after `imageUrl: row.image_url ?? undefined,`):

```ts
    preorderDeliveryDate: row.preorder_delivery_date,
    preorderAdvancePct: row.preorder_advance_pct,
```

(c) In `readFullCatalog`, add the two columns to the `.select(...)` string (append `, preorder_delivery_date, preorder_advance_pct` right after `preorder_ship_date`), and pass them into `getProductState`:

```ts
      availability: getProductState({
        stockQty: readStock(row.inventory),
        preorderShipDate: row.preorder_ship_date,
        preorderDeliveryDate: row.preorder_delivery_date,
        preorderAdvancePct: row.preorder_advance_pct,
        price: row.price,
      }),
```

- [ ] **Step 5: Run it — expect PASS**

Run: `npx vitest run src/lib/data/full-catalog.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/data/full-catalog.ts src/lib/data/full-catalog.test.ts
git commit -m "feat(preorder): thread delivery date + advance pct through the DB catalog (TDD)"
```

---

## Task 5: PDP pre-order card

**Files:**
- Modify: `src/components/product/product-details-view.tsx:6-18` (icon imports), `:375-379` (the "Ships from" block)

**Interfaces:**
- Consumes: `product.availability` preorder fields (Task 3/4); `product.price`.

- [ ] **Step 1: Add lucide icons** — extend the existing `lucide-react` import (the block at `:6-18`) with `Package`, `Truck`, `CreditCard` (keep the others):

```ts
import {
  Baby, BadgeCheck, Check, CreditCard, FlaskConical, Leaf, Mail, Minus, Package,
  Plus, Recycle, ShieldCheck, Star, Truck,
} from "lucide-react";
```

- [ ] **Step 2: Replace the "Ships from" block** — swap the current `:375-379` block:

```tsx
            {availability?.state === "preorder" ? (
              <p className="text-sm text-ink-muted">
                Ships from {formatDate(availability.shipDate)}
              </p>
            ) : null}
```

with the pre-order card:

```tsx
            {availability?.state === "preorder" ? (
              <div className="mt-1 space-y-1.5 rounded-lg border border-cream-200 bg-cream-50/60 p-3 text-sm">
                <p className="flex items-center gap-2 text-ink-muted">
                  <Package className="size-4 flex-none text-neem" aria-hidden />
                  Shipping starts from{" "}
                  <span className="font-medium text-ink">{formatDate(availability.shipDate)}</span>
                </p>
                {availability.deliveryDate ? (
                  <p className="flex items-center gap-2 text-ink-muted">
                    <Truck className="size-4 flex-none text-neem" aria-hidden />
                    Expected delivery{" "}
                    <span className="font-medium text-ink">{formatDate(availability.deliveryDate)}</span>
                  </p>
                ) : null}
                {availability.advancePct && availability.advancePct > 0 ? (
                  <p className="flex items-center gap-2 text-ink-muted">
                    <CreditCard className="size-4 flex-none text-neem" aria-hidden />
                    Advance {availability.advancePct}% ·{" "}
                    <span className="font-medium text-ink">{formatTk(availability.advanceAmount)}</span>{" "}
                    now /{" "}
                    <span className="font-medium text-ink">
                      {formatTk(product.price - availability.advanceAmount)}
                    </span>{" "}
                    on delivery
                  </p>
                ) : null}
              </div>
            ) : null}
```

- [ ] **Step 3: Verify build + typecheck**

Run: `npx tsc --noEmit && npx next build` (or `npm run build`)
Expected: clean. (`availability.deliveryDate`/`advancePct`/`advanceAmount` are known on the narrowed preorder variant.)

- [ ] **Step 4: Commit**

```bash
git add src/components/product/product-details-view.tsx
git commit -m "feat(preorder): PDP pre-order card — shipping/delivery dates + advance split"
```

---

## Task 6: Admin — actions, queries, and forms

**Files:**
- Modify: `src/lib/admin/actions.ts` (`ProductPatch`, `updateProduct`, `CreateProductInput`, `createProduct`)
- Modify: `src/lib/admin/queries.ts` (`AdminProductDetail` + its row type + `getAdminProductBySlug` select/map)
- Modify: `src/components/admin/product-edit-form.tsx`, `src/components/admin/product-create-form.tsx`

**Interfaces:**
- Consumes: nothing new at runtime.
- Produces: `ProductPatch` + `CreateProductInput` accept `preorder_delivery_date`/`preorder_advance_pct` (patch) and `preorderShipDate?`/`preorderDeliveryDate?`/`preorderAdvancePct?` (create); `AdminProductDetail` gains `preorderDeliveryDate: string | null` + `preorderAdvancePct: number | null`.

- [ ] **Step 1: `actions.ts` — extend `ProductPatch`** (after `preorder_ship_date?`):

```ts
  preorder_delivery_date?: string | null;
  preorder_advance_pct?: number | null;
```

- [ ] **Step 2: `actions.ts` — a local extension type for untyped columns.** Just above `updateProduct`, add:

```ts
/** The generated `products` Update type predates the pre-order/image columns
 *  (see database.types note). Extend it locally rather than regenerate. */
type ProductsUpdateExt = Database["public"]["Tables"]["products"]["Update"] & {
  preorder_delivery_date?: string | null;
  preorder_advance_pct?: number | null;
};
```

Change `updateProduct`'s declaration `const productUpdate: Database["public"]["Tables"]["products"]["Update"] = {};` to:

```ts
  const productUpdate: ProductsUpdateExt = {};
```

- [ ] **Step 3: `actions.ts` — validate + assign in `updateProduct`** (immediately after the `preorder_ship_date` block, ~`:149`):

```ts
  if (patch.preorder_delivery_date !== undefined) {
    if (patch.preorder_delivery_date !== null && !isValidDateStr(patch.preorder_delivery_date)) {
      return { ok: false, error: "Expected delivery date must be a valid YYYY-MM-DD date or empty." };
    }
    productUpdate.preorder_delivery_date = patch.preorder_delivery_date;
  }
  if (patch.preorder_advance_pct !== undefined) {
    if (
      patch.preorder_advance_pct !== null &&
      !(Number.isInteger(patch.preorder_advance_pct) &&
        patch.preorder_advance_pct >= 0 &&
        patch.preorder_advance_pct <= 100)
    ) {
      return { ok: false, error: "Advance percentage must be a whole number from 0 to 100, or empty." };
    }
    productUpdate.preorder_advance_pct = patch.preorder_advance_pct;
  }
```

- [ ] **Step 4: `actions.ts` — extend `CreateProductInput`** (after `description?`):

```ts
  preorderShipDate?: string | null;
  preorderDeliveryDate?: string | null;
  preorderAdvancePct?: number | null;
```

- [ ] **Step 5: `actions.ts` — validate + insert in `createProduct`.** After the badge validation (`~:368`) add:

```ts
  if (input.preorderShipDate != null && !isValidDateStr(input.preorderShipDate)) {
    return { ok: false, error: "Pre-order ship date must be a valid YYYY-MM-DD date or empty." };
  }
  if (input.preorderDeliveryDate != null && !isValidDateStr(input.preorderDeliveryDate)) {
    return { ok: false, error: "Expected delivery date must be a valid YYYY-MM-DD date or empty." };
  }
  if (
    input.preorderAdvancePct != null &&
    !(Number.isInteger(input.preorderAdvancePct) &&
      input.preorderAdvancePct >= 0 &&
      input.preorderAdvancePct <= 100)
  ) {
    return { ok: false, error: "Advance percentage must be a whole number from 0 to 100, or empty." };
  }
```

Change the `insertRow` type to a local extension and add the three fields. Above `createProduct` (or beside `ProductsUpdateExt`) add:

```ts
type ProductsInsertExt = Database["public"]["Tables"]["products"]["Insert"] & {
  preorder_ship_date?: string | null;
  preorder_delivery_date?: string | null;
  preorder_advance_pct?: number | null;
};
```

Change `const insertRow: Database["public"]["Tables"]["products"]["Insert"] = {` to `const insertRow: ProductsInsertExt = {`, and add inside it (after `description:` line):

```ts
    preorder_ship_date: input.preorderShipDate ?? null,
    preorder_delivery_date: input.preorderDeliveryDate ?? null,
    preorder_advance_pct: input.preorderAdvancePct ?? null,
```

- [ ] **Step 6: `queries.ts` — extend `AdminProductDetail`** (after `preorderShipDate: string | null;` at `:130`):

```ts
  preorderDeliveryDate: string | null;
  preorderAdvancePct: number | null;
```

Find the `AdminProductDetailRow` type (the `.overrideTypes<AdminProductDetailRow, …>` row shape near `getAdminProductBySlug`) and add `preorder_delivery_date: string | null;` + `preorder_advance_pct: number | null;` to it.

In `getAdminProductBySlug`, add `, preorder_delivery_date, preorder_advance_pct` to the `.select(...)` string (right after `preorder_ship_date`), and add to the returned object (after `preorderShipDate: data.preorder_ship_date,`):

```ts
    preorderDeliveryDate: data.preorder_delivery_date,
    preorderAdvancePct: data.preorder_advance_pct,
```

- [ ] **Step 7: `product-edit-form.tsx` — new state + controls.** Add state near the other `useState`s (`~:84`):

```tsx
  const [deliveryDate, setDeliveryDate] = useState(product.preorderDeliveryDate ?? "");
  const ADVANCE_PRESETS = ["10", "20", "30", "50"];
  const [advanceMode, setAdvanceMode] = useState<string>(() => {
    const v = product.preorderAdvancePct;
    if (v == null) return "none";
    return ADVANCE_PRESETS.includes(String(v)) ? String(v) : "custom";
  });
  const [advanceCustom, setAdvanceCustom] = useState<string>(() => {
    const v = product.preorderAdvancePct;
    return v != null && !ADVANCE_PRESETS.includes(String(v)) ? String(v) : "";
  });
```

Relabel the existing pre-order date field: change its `<span>` text `Pre-order ship date` → `Shipping starts from`.

Add, right after that date field's `</label>`, an Expected-delivery field and the Advance-% control:

```tsx
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Expected delivery date
              </span>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="mt-1"
              />
            </label>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Advance payment %
              </span>
              <Select value={advanceMode} onValueChange={setAdvanceMode}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ADVANCE_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>{p}%</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {advanceMode === "custom" ? (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={advanceCustom}
                  onChange={(e) => setAdvanceCustom(e.target.value)}
                  placeholder="0–100"
                  className="mt-2"
                />
              ) : null}
            </div>
```

In `handleSave`, after the existing `patch.preorder_ship_date = …` line, add:

```tsx
    patch.preorder_delivery_date = deliveryDate.trim() === "" ? null : deliveryDate;
    let advancePctVal: number | null = null;
    if (advanceMode === "custom") {
      if (advanceCustom.trim() !== "") {
        const n = Number(advanceCustom);
        if (!Number.isInteger(n) || n < 0 || n > 100) {
          return toast.error("Advance % must be a whole number from 0 to 100.");
        }
        advancePctVal = n;
      }
    } else if (advanceMode !== "none") {
      advancePctVal = Number(advanceMode);
    }
    patch.preorder_advance_pct = advancePctVal;
```

- [ ] **Step 8: `product-create-form.tsx` — mirror the controls.** Add the same `deliveryDate`/`advanceMode`/`advanceCustom` state (initialised to `""`/`"none"`/`""`), a "Shipping starts from" date field (if the create form has no pre-order date yet, add one bound to a `preorderShip` state), an "Expected delivery date" field, and the Advance-% Select+custom (same JSX as Step 7). On submit, pass into the `createProduct` call:

```tsx
      preorderShipDate: preorderShip.trim() === "" ? null : preorderShip,
      preorderDeliveryDate: deliveryDate.trim() === "" ? null : deliveryDate,
      preorderAdvancePct: advancePctVal, // computed exactly as in Step 7
```

(Compute `advancePctVal` with the same block as Step 7 before calling `createProduct`; toast + return on an invalid custom value.)

- [ ] **Step 9: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 10: Live-verify (real admin session), after the user has applied 0006**

Open `/admin/products/animal-puzzle`: the pre-order date field reads "Shipping starts from"; set Expected delivery + Advance 20%; Save once. Confirm via REST that `preorder_delivery_date` + `preorder_advance_pct` persisted:

```bash
URL="https://qbvymmzraatzcewiztve.supabase.co"; SECRET=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2)
curl -s -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" \
  "$URL/rest/v1/products?select=slug,preorder_ship_date,preorder_delivery_date,preorder_advance_pct&slug=eq.animal-puzzle"
```
Expected: the row shows the delivery date + `20`.

- [ ] **Step 11: Commit**

```bash
git add src/lib/admin/actions.ts src/lib/admin/queries.ts src/components/admin/product-edit-form.tsx src/components/admin/product-create-form.tsx
git commit -m "feat(admin): edit/create pre-order delivery date + advance %"
```

---

## Task 7: Checkout advance display

**Files:**
- Modify: `src/components/checkout/order-summary.tsx`
- Modify: `src/components/checkout/checkout-view.tsx`

**Interfaces:**
- Consumes: `useCatalog().bySlug(slug)` (`availability` + `preorderAdvancePct`), `computeAdvance` (Task 2).
- Produces: `OrderSummary` gains an optional `advanceDueNow?: number` prop.

- [ ] **Step 1: `order-summary.tsx` — add the prop.** Add `advanceDueNow?: number;` to the props type and destructure it. After the Total block (`~:94`, the closing `</div>` of the Total row), insert:

```tsx
      {advanceDueNow && advanceDueNow > 0 ? (
        <div className="mt-4 rounded-lg border border-cream-200 bg-cream-50/60 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Advance due now (pre-order)</span>
            <span className="font-semibold text-ink">{formatTk(advanceDueNow)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-ink-muted">Pay on delivery</span>
            <span className="font-medium text-ink">{formatTk(total - advanceDueNow)}</span>
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Online advance payment goes live soon — for now the full amount is Cash on Delivery.
          </p>
        </div>
      ) : null}
```

- [ ] **Step 2: `checkout-view.tsx` — compute + pass it.** Add imports:

```tsx
import { useCatalog } from "@/lib/catalog/catalog-context";
import { computeAdvance } from "@/lib/data/advance";
```

Near the other derived values (after `const total = subtotal + delivery;`), add:

```tsx
  const { bySlug } = useCatalog();
  const advanceDueNow = items.reduce((sum, it) => {
    const cat = bySlug(it.product.slug);
    if (cat?.availability?.state !== "preorder") return sum;
    return sum + computeAdvance(it.lineTotal, cat.preorderAdvancePct ?? null);
  }, 0);
```

Pass it to the summary — change the `<OrderSummary … />` usage (`~:229`) to include:

```tsx
                advanceDueNow={advanceDueNow}
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/checkout/order-summary.tsx src/components/checkout/checkout-view.tsx
git commit -m "feat(checkout): show pre-order advance-due-now / pay-on-delivery split"
```

---

## Task 8: Persist advance in `createOrder`

**Files:**
- Modify: `src/lib/data/orders.ts`

**Interfaces:**
- Consumes: `computeAdvance` (Task 2); `place_order` accepting `advance_total` + per-item `preorder_advance_pct` (Task 1).

- [ ] **Step 1: Import + select the advance pct.** Add `import { computeAdvance } from "@/lib/data/advance";`. In the products `.select(...)` (`:30`), append `, preorder_advance_pct` after `preorder_ship_date`.

- [ ] **Step 2: Snapshot the pct per line.** Extend the `items` element type (`:36-40`) with `preorder_advance_pct: number | null;`. Inside the loop, after `state` is computed, read the pct (narrow-cast — the column is absent from generated types):

```ts
    const advancePct =
      fulfillment === "preorder"
        ? ((p as unknown as { preorder_advance_pct: number | null }).preorder_advance_pct ?? null)
        : null;
```

and add `preorder_advance_pct: advancePct,` to the `items.push({ … })` object.

- [ ] **Step 3: Sum `advance_total` + pass both through.** After the `computeOrderTotals` call (`:66-67`), add:

```ts
  const advanceTotal = items.reduce(
    (sum, i) =>
      sum + (i.fulfillment_type === "preorder" ? computeAdvance(i.line_total, i.preorder_advance_pct) : 0),
    0,
  );
```

Add `advance_total: advanceTotal,` to the `p_order` object (`:70-79`). Add `preorder_advance_pct: i.preorder_advance_pct,` to the `p_items` map (`:80-84`).

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 5: Live-verify (after 0006 applied).** Place a real pre-order (the product set to stock 0 + advance % in Task 6) through checkout, then confirm the order persisted the advance:

```bash
URL="https://qbvymmzraatzcewiztve.supabase.co"; SECRET=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2)
curl -s -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" \
  "$URL/rest/v1/orders?select=order_number,total,advance_total,order_items(title,fulfillment_type,preorder_advance_pct)&order=created_at.desc&limit=1"
```
Expected: newest order shows `advance_total > 0` and the pre-order line carries `preorder_advance_pct`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/data/orders.ts
git commit -m "feat(orders): persist advance_total + per-line advance pct on pre-orders"
```

---

## Task 9: Admin order-detail advance display

**Files:**
- Modify: `src/lib/admin/queries.ts` (`AdminOrderDetail` + row type + `getAdminOrderById`)
- Modify: `src/app/admin/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `orders.advance_total` + `order_items.preorder_advance_pct` (Task 1).
- Produces: `AdminOrderDetail` gains `advanceTotal: number`; each item gains `preorderAdvancePct: number | null`.

- [ ] **Step 1: Extend `AdminOrderDetail`.** After `total: number;` (`:166`) add `advanceTotal: number;`. In the `items` array element type (`:168-177`), after `preorderShipDate: string | null;` add `preorderAdvancePct: number | null;`.

- [ ] **Step 2: Extend the `AdminOrderDetailRow` type** (the `.overrideTypes<AdminOrderDetailRow, …>` shape): add `advance_total: number;` to the order row and `preorder_advance_pct: number | null;` to the `order_items` element.

- [ ] **Step 3: Select + map.** In `getAdminOrderById`'s `.select(...)` (`:303`): add `advance_total` to the order columns (e.g. after `total`), and `preorder_advance_pct` to the `order_items(...)` list. In the returned object add `advanceTotal: data.advance_total,` (after `total:`), and in the items map add `preorderAdvancePct: i.preorder_advance_pct,` (after `preorderShipDate:`).

- [ ] **Step 4: Render on the page.** In `src/app/admin/orders/[id]/page.tsx`:

(a) In the item's Fulfillment cell (after the `preorderShipDate` block, `~:84`), show the advance pct:

```tsx
                          {item.preorderAdvancePct != null ? (
                            <span className="block text-xs text-ink-soft">
                              Advance {item.preorderAdvancePct}%
                            </span>
                          ) : null}
```

(b) In the money summary (the `max-w-52` block, between the Delivery row and the Total row, `~:103`), show the advance total when present:

```tsx
                {order.advanceTotal > 0 ? (
                  <div className="flex justify-between text-ink-muted">
                    <span>Advance (pre-order)</span>
                    <span>{formatTk(order.advanceTotal)}</span>
                  </div>
                ) : null}
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean.

- [ ] **Step 6: Live-verify.** Open `/admin/orders/<the pre-order from Task 8>` — the pre-order line shows "Advance N%" and the summary shows an "Advance (pre-order)" row.

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin/queries.ts src/app/admin/orders/[id]/page.tsx
git commit -m "feat(admin): show advance total + per-line advance % on order detail"
```

---

## Final verification

- [ ] `npx vitest run` — all tests pass (advance, product-state, full-catalog + existing suite).
- [ ] `npx tsc --noEmit && npm run build` — clean; storefront routes still static/ISR (no new dynamic pull-in).
- [ ] End-to-end (0006 applied, real admin session): admin sets a product to stock 0 + shipping-start + expected-delivery + advance % (one Save) → PDP shows the pre-order card (both dates + advance split) → checkout shows "Advance due now / Pay on delivery" → placed order persists `advance_total` + line `preorder_advance_pct` → admin order detail shows them. Mixed cart (one in-stock + one pre-order) charges advance only on the pre-order line. Clean up any test order/product state.
- [ ] Open a PR to `master`; ensure the Vercel preview build is green (per-branch Supabase env already set from prior slices — add if the preview build reports missing env).

## Self-Review (done during authoring)

- **Spec coverage:** two dates → Task 1/3/4/5/6; advance % per-product + presets/custom → Task 6; PDP display → Task 5; checkout display + order persistence → Task 7/8; admin order display → Task 9; display-only (payment_method stays cod, advance_total informational) → Task 1/8 (never touch payment_method/total). Non-goals (content editing, real collection) untouched.
- **Placeholder scan:** none — every step carries real code/commands.
- **Type consistency:** `computeAdvance(amount, pct|null)`, `ProductAvailability.preorder` = `{shipDate, deliveryDate, advancePct, advanceAmount}`, `Product.preorder{DeliveryDate,AdvancePct}`, `ProductPatch.preorder_{delivery_date,advance_pct}`, `CreateProductInput.preorder{ShipDate,DeliveryDate,AdvancePct}`, `AdminProductDetail.preorder{DeliveryDate,AdvancePct}`, `AdminOrderDetail.advanceTotal` + item `preorderAdvancePct` — names used consistently across tasks.
- **DB-types caveat** flagged in Global Constraints; narrow-cast pattern reused (not regeneration).
