# Admin Inventory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An `/admin/inventory` page listing every product with inline set-stock, ±adjust, and threshold edits + low-stock / out-of-stock filters, reflecting on the storefront via `revalidateTag('catalog')`.

**Architecture:** A pure status/clamp module feeds a `getAdminInventory()` read (low-stock-first) and two actions (`updateInventory` set, `adjustStock` ±clamp≥0); an `InventoryTable` client component renders per-row inline editors + a filter toolbar.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-admin-inventory-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / `revalidateTag`. Middleware is `src/proxy.ts`.
- **No migration** — `inventory (product_id pk, stock_qty, low_stock_threshold)` exists. `image_url` is absent from parts of generated types → reads via `.overrideTypes<Row[],{merge:false}>()` (as `getAdminProducts` does).
- **Inventory writes reflect availability:** every write calls the existing `revalidateStorefront(slug)` helper (which fires `revalidateTag('catalog')` + taxonomy + paths), so a restock flips sold-out → in-stock on the storefront.
- **Adjust clamps ≥ 0** (`clampAdjust`); read-modify-write in the action (single-admin scale, documented). The order path's atomic `place_order` guarded decrement is untouched.
- Whole non-negative integers (reuse `isNonNegativeInt`). Admin writes re-check `getIsAdmin()` + service-role. Toytuni theme. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## File structure

- Create `src/lib/admin/inventory-status.ts` (+ `.test.ts`) — pure `stockStatus` + `clampAdjust`.
- Modify `src/lib/admin/queries.ts` — `getAdminInventory`.
- Modify `src/lib/admin/actions.ts` — `updateInventory` + `adjustStock`.
- Create `src/app/admin/inventory/page.tsx`, `src/components/admin/inventory-table.tsx`; modify `src/components/admin/admin-sidebar.tsx`.

---

## Task 1: Pure `stockStatus` + `clampAdjust` (TDD)

**Files:** Create `src/lib/admin/inventory-status.ts`, `src/lib/admin/inventory-status.test.ts`.

**Interfaces:** Produces `StockStatus = "out" | "low" | "in_stock"`; `stockStatus(stockQty, threshold): StockStatus`; `clampAdjust(current, delta): number`.

- [ ] **Step 1 — failing test** `src/lib/admin/inventory-status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { stockStatus, clampAdjust } from "./inventory-status";

describe("stockStatus", () => {
  it("out at 0 or below", () => {
    expect(stockStatus(0, 5)).toBe("out");
    expect(stockStatus(-1, 5)).toBe("out");
  });
  it("low at or below threshold (but > 0)", () => {
    expect(stockStatus(5, 5)).toBe("low");
    expect(stockStatus(3, 5)).toBe("low");
    expect(stockStatus(1, 0)).toBe("in_stock"); // threshold 0 → nothing is 'low'
  });
  it("in_stock above threshold", () => expect(stockStatus(6, 5)).toBe("in_stock"));
});

describe("clampAdjust", () => {
  it("adds a positive delta", () => expect(clampAdjust(5, 3)).toBe(8));
  it("clamps a negative result to 0", () => {
    expect(clampAdjust(1, -3)).toBe(0);
    expect(clampAdjust(5, -5)).toBe(0);
  });
  it("subtracts within range", () => expect(clampAdjust(10, -4)).toBe(6));
});
```

- [ ] **Step 2 — run → FAIL.** `npx vitest run src/lib/admin/inventory-status.test.ts`

- [ ] **Step 3 — implement `src/lib/admin/inventory-status.ts`:**

```ts
export type StockStatus = "out" | "low" | "in_stock";

/** Derive a product's stock status. 0 (or less) → out; >0 and ≤ threshold → low;
 *  otherwise in_stock. A threshold of 0 means nothing is ever "low". Pure. */
export function stockStatus(stockQty: number, threshold: number): StockStatus {
  if (stockQty <= 0) return "out";
  if (threshold > 0 && stockQty <= threshold) return "low";
  return "in_stock";
}

/** New stock after applying `delta`, clamped to ≥ 0 (stock never goes negative). Pure. */
export function clampAdjust(current: number, delta: number): number {
  return Math.max(0, current + delta);
}
```

Note the test `stockStatus(1, 0) === "in_stock"` — the `threshold > 0` guard makes a 0 threshold never mark anything low (matches "low = at/below a positive threshold").

- [ ] **Step 4 — run → PASS**, then `npx tsc --noEmit`.

- [ ] **Step 5 — commit** `feat(inventory): pure stockStatus + clampAdjust (TDD)`.

---

## Task 2: `getAdminInventory` query + `updateInventory` / `adjustStock` actions

**Files:** Modify `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`.

**Interfaces:**
- Consumes: `clampAdjust` (Task 1).
- Produces: `getAdminInventory(): Promise<AdminInventoryItem[]>`; `updateInventory(slug, {stockQty?, lowStockThreshold?})`; `adjustStock(slug, delta): {ok:true, stock}|{ok:false,error}`.

- [ ] **Step 1 — `queries.ts`.** Add (reuse the file's existing `oneInventory` helper + `createAdminSupabase`):

```ts
export type AdminInventoryItem = {
  slug: string; sku: string; title: string; imageUrl: string | null;
  stockQty: number; lowStockThreshold: number;
};

type InventoryProductRow = {
  slug: string; sku: string; title: string; image_url: string | null;
  inventory: { stock_qty: number; low_stock_threshold: number } | { stock_qty: number; low_stock_threshold: number }[] | null;
};

/** Every product with its current stock + threshold, ordered out-of-stock/low
 *  first (most actionable), then by title. Service-role. */
export async function getAdminInventory(): Promise<AdminInventoryItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("products")
    .select("slug, sku, title, image_url, inventory(stock_qty, low_stock_threshold)")
    .overrideTypes<InventoryProductRow[], { merge: false }>();
  if (error) throw new Error(`getAdminInventory failed: ${error.message}`);

  const items = (data ?? []).map((p) => {
    const inv = oneInventory(p.inventory);
    return {
      slug: p.slug, sku: p.sku, title: p.title, imageUrl: p.image_url ?? null,
      stockQty: inv?.stock_qty ?? 0, lowStockThreshold: inv?.low_stock_threshold ?? 0,
    };
  });
  const rank = (i: AdminInventoryItem) => (i.stockQty <= 0 ? 0 : i.stockQty <= i.lowStockThreshold ? 1 : 2);
  return items.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}
```

- [ ] **Step 2 — `actions.ts`: `updateInventory`.** Import `{ clampAdjust }` from `@/lib/admin/inventory-status`. Add (reuse `getIsAdmin`, `createAdminSupabase`, `isNonNegativeInt`, `revalidateStorefront`, `ActionResult`):

```ts
/** Set a product's stock and/or low-stock threshold (inventory management view).
 *  Server Action — admin re-check + service-role; both fields non-negative ints. */
export async function updateInventory(
  slug: string, patch: { stockQty?: number; lowStockThreshold?: number },
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const update: { stock_qty?: number; low_stock_threshold?: number } = {};
  if (patch.stockQty !== undefined) {
    if (!isNonNegativeInt(patch.stockQty)) return { ok: false, error: "Stock must be a non-negative whole number." };
    update.stock_qty = patch.stockQty;
  }
  if (patch.lowStockThreshold !== undefined) {
    if (!isNonNegativeInt(patch.lowStockThreshold)) return { ok: false, error: "Threshold must be a non-negative whole number." };
    update.low_stock_threshold = patch.lowStockThreshold;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const db = createAdminSupabase();
  const { data: prod, error: lookupErr } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
  if (lookupErr) return { ok: false, error: lookupErr.message };
  if (!prod) return { ok: false, error: `Product not found: ${slug}` };
  const { error } = await db.from("inventory").update(update).eq("product_id", prod.id);
  if (error) return { ok: false, error: error.message };
  revalidateStorefront(slug);
  return { ok: true };
}
```

- [ ] **Step 3 — `actions.ts`: `adjustStock`** (read-modify-write, clamp ≥ 0):

```ts
/** Adjust a product's stock by `delta` (restock / deduct), clamped to ≥ 0.
 *  Returns the new stock. Server Action — admin re-check + service-role. */
export async function adjustStock(
  slug: string, delta: number,
): Promise<{ ok: true; stock: number } | { ok: false; error: string }> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, error: "Adjustment must be a non-zero whole number." };
  }
  const db = createAdminSupabase();
  const { data: prod, error: lookupErr } = await db
    .from("products").select("id, inventory(stock_qty)").eq("slug", slug).maybeSingle()
    .overrideTypes<{ id: string; inventory: { stock_qty: number } | { stock_qty: number }[] | null }, { merge: false }>();
  if (lookupErr) return { ok: false, error: lookupErr.message };
  if (!prod) return { ok: false, error: `Product not found: ${slug}` };
  const inv = Array.isArray(prod.inventory) ? prod.inventory[0] : prod.inventory;
  const next = clampAdjust(inv?.stock_qty ?? 0, delta);
  const { error } = await db.from("inventory").update({ stock_qty: next }).eq("product_id", prod.id);
  if (error) return { ok: false, error: error.message };
  revalidateStorefront(slug);
  return { ok: true, stock: next };
}
```

- [ ] **Step 4 — verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`. Commit `feat(admin): getAdminInventory + updateInventory/adjustStock actions`.

---

## Task 3: Admin UI — `/admin/inventory` page + `InventoryTable` + sidebar

**Files:** Create `src/app/admin/inventory/page.tsx`, `src/components/admin/inventory-table.tsx`. Modify `src/components/admin/admin-sidebar.tsx`.

**Interfaces:** Consumes `getAdminInventory` + `updateInventory`/`adjustStock` (Task 2), `stockStatus` (Task 1).

- [ ] **Step 1 — sidebar.** In `src/components/admin/admin-sidebar.tsx`, remove `disabled: true` from the **Inventory** item (leave Customers/Blog disabled).

- [ ] **Step 2 — page** `src/app/admin/inventory/page.tsx` (server):

```tsx
import type { Metadata } from "next";
import { getAdminInventory } from "@/lib/admin/queries";
import { InventoryTable } from "@/components/admin/inventory-table";

export const metadata: Metadata = { title: "Inventory", robots: { index: false, follow: false } };

export default async function Page() {
  const items = await getAdminInventory();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Inventory</h1>
      <p className="mt-1 text-sm text-ink-muted">Set or adjust stock and low-stock thresholds. Low stock shows first.</p>
      <div className="mt-6">
        <InventoryTable items={items} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3 — `inventory-table.tsx`** (`"use client"`). Toolbar (search + "Low stock only" + "Out of stock" toggles) + a table of `InventoryRow`s. Filtering is client-side; each row owns its input state and calls the actions optimistically (no `router.refresh()` so rows don't re-sort mid-edit; the storefront is refreshed server-side by the action's `revalidateStorefront`).

```tsx
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import { Search, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product/product-image";
import { updateInventory, adjustStock } from "@/lib/admin/actions";
import { stockStatus, type StockStatus } from "@/lib/admin/inventory-status";
import type { AdminInventoryItem } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const STATUS_META: Record<StockStatus, { label: string; cls: string }> = {
  out: { label: "Out", cls: "bg-danger/10 text-danger" },
  low: { label: "Low", cls: "bg-mustard/20 text-ink" },
  in_stock: { label: "In stock", cls: "bg-neem/10 text-neem-deep" },
};

export function InventoryTable({ items }: { items: AdminInventoryItem[] }) {
  const [rows, setRows] = useState(items);
  useEffect(() => setRows(items), [items]);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [outOnly, setOutOnly] = useState(false);

  const patchRow = (slug: string, next: Partial<AdminInventoryItem>) =>
    setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...next } : r)));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(r.title.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q))) return false;
      const st = stockStatus(r.stockQty, r.lowStockThreshold);
      if (outOnly && st !== "out") return false;
      if (lowOnly && st === "in_stock") return false;
      return true;
    });
  }, [rows, query, lowOnly, outOnly]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border border-cream-300 bg-cream-50/60 px-3 py-2">
          <Search className="size-4 flex-none text-ink-soft" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={outOnly} onChange={(e) => setOutOnly(e.target.checked)} /> Out of stock
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Stock</th>
              <th className="px-3 py-2 font-medium">Low-stock at</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <InventoryRow key={item.slug} item={item} onPatch={(n) => patchRow(item.slug, n)} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-ink-muted">No products match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryRow({ item, onPatch }: { item: AdminInventoryItem; onPatch: (n: Partial<AdminInventoryItem>) => void }) {
  const [busy, start] = useTransition();
  const [stock, setStock] = useState(String(item.stockQty));
  const [thr, setThr] = useState(String(item.lowStockThreshold));
  useEffect(() => setStock(String(item.stockQty)), [item.stockQty]);
  useEffect(() => setThr(String(item.lowStockThreshold)), [item.lowStockThreshold]);

  const status = stockStatus(item.stockQty, item.lowStockThreshold);
  const meta = STATUS_META[status];

  const commitStock = () => {
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) { setStock(String(item.stockQty)); return toast.error("Stock must be a whole number ≥ 0."); }
    if (n === item.stockQty) return;
    start(async () => {
      const r = await updateInventory(item.slug, { stockQty: n });
      if (r.ok) { onPatch({ stockQty: n }); toast.success("Stock updated."); }
      else { toast.error(r.error); setStock(String(item.stockQty)); }
    });
  };
  const adjust = (delta: number) => start(async () => {
    const r = await adjustStock(item.slug, delta);
    if (r.ok) onPatch({ stockQty: r.stock });
    else toast.error(r.error);
  });
  const commitThreshold = () => {
    const n = Number(thr);
    if (!Number.isInteger(n) || n < 0) { setThr(String(item.lowStockThreshold)); return toast.error("Threshold must be a whole number ≥ 0."); }
    if (n === item.lowStockThreshold) return;
    start(async () => {
      const r = await updateInventory(item.slug, { lowStockThreshold: n });
      if (r.ok) onPatch({ lowStockThreshold: n });
      else { toast.error(r.error); setThr(String(item.lowStockThreshold)); }
    });
  };

  return (
    <tr className="border-b border-cream-200 last:border-b-0">
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="size-10 flex-none overflow-hidden rounded-lg border border-cream-300 bg-cream-50">
            <ProductImage slug={item.slug} imageNum={1} label={item.title} fallbackTone="cream" imageUrl={item.imageUrl ?? undefined} className="size-full" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{item.title}</p>
            <p className="font-mono text-xs text-ink-muted">{item.sku}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold", meta.cls)}>{meta.label}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Decrease" disabled={busy} onClick={() => adjust(-1)}><Minus className="size-4" /></Button>
          <Input type="number" min={0} step={1} inputMode="numeric" value={stock} disabled={busy}
            onChange={(e) => setStock(e.target.value)} onBlur={commitStock}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="w-20 text-center" />
          <Button variant="outline" size="icon" aria-label="Increase" disabled={busy} onClick={() => adjust(1)}><Plus className="size-4" /></Button>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Input type="number" min={0} step={1} inputMode="numeric" value={thr} disabled={busy}
          onChange={(e) => setThr(e.target.value)} onBlur={commitThreshold}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="w-20" />
      </td>
    </tr>
  );
}
```

Check `Button` supports `size="icon"` (else `className="size-9 p-0"`) and `ProductImage`'s prop names (`slug`/`imageNum`/`label`/`fallbackTone`/`imageUrl`) against `src/components/product/product-image.tsx` — adjust to the real signature. Status colours (`bg-danger`, `bg-mustard`, `bg-neem`, `text-neem-deep`) are theme tokens already used elsewhere — verify they resolve; fall back to a neutral badge if any is missing.

- [ ] **Step 4 — verify.** `npx tsc --noEmit && npx vitest run && npm run build` (`/admin/inventory` renders). Live (controller, real admin session): the page lists products low-stock-first; set a stock → persists + storefront availability flips; +/− adjusts + clamps at 0; edit a threshold → the Low badge boundary changes; search + Low/Out filters work; non-admin rejected. Restore any test values.

- [ ] **Step 5 — commit** `feat(admin): inventory page — inline set/adjust stock + threshold + filters + sidebar`.

---

## Final verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean; storefront static/ISR intact (availability reads unchanged).
- [ ] End-to-end (real admin session): set/adjust/threshold edits persist; storefront availability (sold-out ↔ in-stock ↔ pre-order) reflects after a stock change; filters/search work; adjust clamps at 0; non-admin rejected. Restore test values.
- [ ] PR to `master`; set the 5 per-branch Supabase preview env vars for this branch if the preview build reports `supabaseUrl is required`, then redeploy (as prior slices).

## Self-Review (done during authoring)

- **Spec coverage:** pure status/clamp → T1; query + set/adjust actions → T2; page/table/row/filters/sidebar → T3. No migration; `revalidateStorefront` reused so stock reflects on availability.
- **Placeholder scan:** none — real code/commands. The soft spots (Button `size="icon"`, `ProductImage` signature, theme-token classes) are called out in T3 with a stated fallback.
- **Type consistency:** `stockStatus(stockQty,threshold)→StockStatus`, `clampAdjust(current,delta)`, `getAdminInventory()→AdminInventoryItem[]`, `updateInventory(slug,{stockQty?,lowStockThreshold?})`, `adjustStock(slug,delta)→{ok,stock}` — consistent across tasks.
- **Availability reflection + admin-gating** are the load-bearing invariants; both in Global Constraints and exercised in T2.
