# Admin Customer Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the thin admin customer detail into a CRM profile — status (active/inactive/blocked), tags, internal notes, an admin-configurable auto tier, and richer metrics (AOV, first order, days-since, cancelled) + a read-only last delivery address — and enrich the customer list (badges, filters, KPI strip).

**Architecture:** Migration 0013 adds `customers.status/tags/notes/updated_at`. Pure `customerTier(spend, thresholds)` + extended `aggregateCustomers` (TDD). Tier thresholds live in site settings (admin-editable). Reads compute tier via `getSettings()`; the extended `updateCustomer` writes the CRM fields. UI: enriched profile + list.

**Tech Stack:** Next.js 16.2.9 (App Router, `src/proxy.ts`), Supabase (service-role), vitest (TDD), Tailwind (cream/ink), lucide-react, sonner.

## Global Constraints

- Next.js is **non-standard (v16)**; `/admin/*` is admin-gated (layout + proxy). New columns absent from generated `database.types.ts` → `as never` on writes / `.overrideTypes<Row[],{merge:false}>()` on reads. Service-role client = `createAdminSupabase()`.
- Every admin write action re-checks `getIsAdmin()` (throw `"unauthorized"`) + `revalidatePath('/admin/customers')` + `/admin/customers/${id}`.
- **Reads default the new fields** (`status ?? 'active'`, `tags ?? []`, `notes ?? null`) so a pre-migration DB / null values never 500. `blocked` is an admin flag only — do NOT touch checkout / `place_order`.
- Money is integer BDT; format with `formatTk` (`@/lib/format`). Dates with `formatDate`.
- Tier thresholds are NEVER hardcoded in logic — always read from `settings.customerTiers` and passed into `customerTier`.
- Pure logic is TDD (test first → fail → implement → pass), no `Date.now()` inside pure functions. Run `npx tsc --noEmit && npx vitest run && npm run build` before each commit. Do NOT `git add` `.env.local` or `.superpowers/`.
- `ActionResult`, `getIsAdmin`, `createAdminSupabase`, `getSettings` (`@/lib/data/settings`), `StringListEditor` (`@/components/admin/string-list-editor`), `KpiCard` (`@/components/admin/kpi-card`) already exist — reuse them.

---

### Task 1: Migration 0013 — customer CRM columns

**Files:** Create `supabase/migrations/0013_customer_profile.sql`

**Interfaces:** Produces `customers.status` (`active|inactive|blocked`, default `active`), `customers.tags text[]`, `customers.notes text`, `customers.updated_at timestamptz` + `customers_set_updated_at` trigger (reuses `set_updated_at()` from 0011).

- [ ] **Step 1: Write the migration** (SQL only; user applies it before merge).

```sql
-- 0013_customer_profile.sql — admin customer CRM fields.
-- Apply in the Supabase SQL editor after 0012_analytics_functions.sql.
alter table customers add column if not exists status text not null default 'active'
  check (status in ('active','inactive','blocked'));
alter table customers add column if not exists tags text[];
alter table customers add column if not exists notes text;
alter table customers add column if not exists updated_at timestamptz not null default now();

-- set_updated_at() already exists (migration 0011). Attach the trigger to customers.
drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at before update on customers
  for each row execute function set_updated_at();
```

- [ ] **Step 2: Commit**
```bash
git add supabase/migrations/0013_customer_profile.sql
git commit -m "feat(customers): migration 0013 — status, tags, notes, updated_at"
```

---

### Task 2: Pure — customerTier + settings tier thresholds (TDD)

**Files:**
- Create: `src/lib/admin/customer-tier.ts` (+ `.test.ts`)
- Modify: `src/lib/data/settings-shape.ts` (+ `src/lib/data/settings-shape.test.ts` — create if absent)

**Interfaces:**
- Produces: `type CustomerTier = 'bronze'|'silver'|'gold'`; `type TierThresholds = { silver: number; gold: number }`; `customerTier(totalSpent: number, thresholds: TierThresholds): CustomerTier`.
- Extends `Settings` with `customerTiers: { silver: number; gold: number }`.

- [ ] **Step 1: Write the failing test — customer-tier**
```ts
// src/lib/admin/customer-tier.test.ts
import { describe, it, expect } from "vitest";
import { customerTier } from "./customer-tier";
const T = { silver: 3000, gold: 10000 };
describe("customerTier", () => {
  it("bronze below silver", () => { expect(customerTier(0, T)).toBe("bronze"); expect(customerTier(2999, T)).toBe("bronze"); });
  it("silver at/above silver, below gold", () => { expect(customerTier(3000, T)).toBe("silver"); expect(customerTier(9999, T)).toBe("silver"); });
  it("gold at/above gold", () => { expect(customerTier(10000, T)).toBe("gold"); expect(customerTier(50000, T)).toBe("gold"); });
  it("honors custom thresholds (not hardcoded)", () => {
    expect(customerTier(600, { silver: 500, gold: 1000 })).toBe("silver");
    expect(customerTier(1000, { silver: 500, gold: 1000 })).toBe("gold");
  });
});
```

- [ ] **Step 2: Run → fail.** `npx vitest run src/lib/admin/customer-tier.test.ts`

- [ ] **Step 3: Implement**
```ts
// src/lib/admin/customer-tier.ts
export type CustomerTier = "bronze" | "silver" | "gold";
export type TierThresholds = { silver: number; gold: number };
export function customerTier(totalSpent: number, thresholds: TierThresholds): CustomerTier {
  if (totalSpent >= thresholds.gold) return "gold";
  if (totalSpent >= thresholds.silver) return "silver";
  return "bronze";
}
```

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Extend settings-shape — write the failing test.** READ `src/lib/data/settings-shape.ts` first. Add to its test (create `settings-shape.test.ts` if none):
```ts
// src/lib/data/settings-shape.test.ts (add these; keep any existing tests)
import { describe, it, expect } from "vitest";
import { rowToSettings, DEFAULT_SETTINGS } from "./settings-shape";
describe("customerTiers", () => {
  it("defaults present", () => {
    expect(DEFAULT_SETTINGS.customerTiers).toEqual({ silver: 3000, gold: 10000 });
    expect(rowToSettings({}).customerTiers).toEqual({ silver: 3000, gold: 10000 });
  });
  it("reads valid stored thresholds", () => {
    expect(rowToSettings({ customerTiers: { silver: 5000, gold: 20000 } }).customerTiers).toEqual({ silver: 5000, gold: 20000 });
  });
  it("falls back to defaults when gold < silver (inverted)", () => {
    expect(rowToSettings({ customerTiers: { silver: 9000, gold: 1000 } }).customerTiers).toEqual({ silver: 3000, gold: 10000 });
  });
  it("coerces invalid/negative to defaults per field", () => {
    expect(rowToSettings({ customerTiers: { silver: -5, gold: 20000 } }).customerTiers).toEqual({ silver: 3000, gold: 20000 });
  });
});
```

- [ ] **Step 6: Run → fail.**

- [ ] **Step 7: Implement in settings-shape.ts.** Add `customerTiers` to `Settings`, `DEFAULT_SETTINGS`, and `rowToSettings`:
```ts
// in the Settings type:
customerTiers: { silver: number; gold: number };
// in DEFAULT_SETTINGS:
customerTiers: { silver: 3000, gold: 10000 },
// in rowToSettings (after the existing sections), using the existing `nnInt` helper:
const ct = (v.customerTiers && typeof v.customerTiers === "object" ? v.customerTiers : {}) as Record<string, unknown>;
let silver = nnInt(ct.silver, d.customerTiers.silver);
let gold = nnInt(ct.gold, d.customerTiers.gold);
if (gold < silver) { silver = d.customerTiers.silver; gold = d.customerTiers.gold; } // inverted → defaults
// ...add `customerTiers: { silver, gold }` to the returned object.
```

- [ ] **Step 8: Run → pass; then full check.** `npx tsc --noEmit && npx vitest run`

- [ ] **Step 9: Commit**
```bash
git add src/lib/admin/customer-tier.ts src/lib/admin/customer-tier.test.ts src/lib/data/settings-shape.ts src/lib/data/settings-shape.test.ts
git commit -m "feat(customers): customerTier + admin-configurable tier thresholds (TDD)"
```

---

### Task 3: Pure — extend aggregateCustomers (TDD)

**Files:** Modify `src/lib/admin/customer-metrics.ts` (+ its test — create `customer-metrics.test.ts` if absent)

**Interfaces:**
- `CustomerRow` gains `status?: string; tags?: string[] | null` (threaded through from the DB row).
- `CustomerListItem` gains `aov: number; firstOrderAt: string | null; cancelledCount: number; status: string; tags: string[]`. (`tier` is added later in the queries layer, which has the settings — NOT here.)
- `aggregateCustomers` computes `aov`/`firstOrderAt`/`cancelledCount` and passes through `status`/`tags`.

- [ ] **Step 1: Write the failing test**
```ts
// src/lib/admin/customer-metrics.test.ts
import { describe, it, expect } from "vitest";
import { aggregateCustomers } from "./customer-metrics";
const cust = (id: string, extra = {}) => ({ id, name: "N", phone: "p"+id, email: null, created_at: "2026-01-01", status: "active", tags: [], ...extra });
const ord = (cid: string, total: number, status: string, date: string) => ({ customer_id: cid, total, status, created_at: date });
describe("aggregateCustomers extensions", () => {
  it("aov = spent / non-cancelled count; cancelled excluded from spend but counted", () => {
    const [c] = aggregateCustomers([cust("a")], [
      ord("a", 1000, "delivered", "2026-02-01"),
      ord("a", 500, "delivered", "2026-03-01"),
      ord("a", 9999, "cancelled", "2026-04-01"),
    ]);
    expect(c.totalSpent).toBe(1500);
    expect(c.aov).toBe(750);           // 1500 / 2 non-cancelled
    expect(c.cancelledCount).toBe(1);
    expect(c.orderCount).toBe(3);
    expect(c.firstOrderAt).toBe("2026-02-01");
  });
  it("aov 0 and firstOrderAt null with no orders", () => {
    const [c] = aggregateCustomers([cust("b")], []);
    expect(c.aov).toBe(0); expect(c.firstOrderAt).toBeNull(); expect(c.cancelledCount).toBe(0);
  });
  it("aov 0 when only cancelled orders", () => {
    const [c] = aggregateCustomers([cust("c")], [ord("c", 500, "cancelled", "2026-02-01")]);
    expect(c.aov).toBe(0); expect(c.totalSpent).toBe(0); expect(c.cancelledCount).toBe(1);
  });
  it("passes status + tags through", () => {
    const [c] = aggregateCustomers([cust("d", { status: "blocked", tags: ["vip"] })], []);
    expect(c.status).toBe("blocked"); expect(c.tags).toEqual(["vip"]);
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement.** Extend `CustomerRow` (`status?`, `tags?`), `CustomerListItem` (`aov`, `firstOrderAt`, `cancelledCount`, `status`, `tags`), and the map in `aggregateCustomers`:
```ts
const nonCancelled = os.filter((o) => o.status !== "cancelled");
const totalSpent = nonCancelled.reduce((s, o) => s + o.total, 0);
const aov = nonCancelled.length > 0 ? Math.round(totalSpent / nonCancelled.length) : 0;
const cancelledCount = os.filter((o) => o.status === "cancelled").length;
const firstOrderAt = os.reduce<string | null>((min, o) => (min === null || o.created_at < min ? o.created_at : min), null);
// return: { ...existing, aov, firstOrderAt, cancelledCount, status: c.status ?? "active", tags: c.tags ?? [] }
```

- [ ] **Step 4: Run → pass.** Then `npx tsc --noEmit && npx vitest run`.

- [ ] **Step 5: Commit**
```bash
git add src/lib/admin/customer-metrics.ts src/lib/admin/customer-metrics.test.ts
git commit -m "feat(customers): AOV + first-order + cancelled metrics; status/tags passthrough (TDD)"
```

---

### Task 4: Data layer — queries (tier + CRM fields + last address) + updateCustomer

**Files:** Modify `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`

**Interfaces:**
- Consumes: `aggregateCustomers` (T3), `customerTier` (T2), `getSettings`.
- `getAdminCustomers()`: select `status, tags` (+ existing) → pass through `aggregateCustomers` → add `tier: customerTier(item.totalSpent, settings.customerTiers)` to each; `CustomerListItem` now has `tier`.
- `getAdminCustomerById(id)`: select `status, tags, notes` on the customer; the per-customer orders read also selects `division, district, area, address_line, landmark`; returns `AdminCustomerDetail` = the aggregate metrics + `tier` + `status` + `tags` + `notes` + `orders[]` + `lastAddress: { addressLine, landmark, area, district, division } | null` (from the newest order).
- `updateCustomer(id, patch: { name?; email?; status?; tags?; notes? })` writes the CRM fields.

- [ ] **Step 1: Extend `getAdminCustomers`.** Add `status, tags` to the customers `.select` + `CustomerRow` mapping (the read already passes rows to `aggregateCustomers`). After aggregation, `const settings = await getSettings();` and map each item to include `tier: customerTier(item.totalSpent, settings.customerTiers)`. Extend the returned type (`CustomerListItem` from customer-metrics already has `status`/`tags`; add `tier` here — either widen the type in queries or add a `CustomerListRow = CustomerListItem & { tier: CustomerTier }`). Keep it consistent so the list component gets `status`, `tags`, `tier`.

- [ ] **Step 2: Extend `getAdminCustomerById`.** Add `status, tags, notes` to the customer `.select`; add `division, district, area, address_line, landmark` to the orders `.select`. Build the metrics via `aggregateCustomers([c],...)` as today, then `const settings = await getSettings(); const tier = customerTier(metrics.totalSpent, settings.customerTiers);`. Derive `lastAddress` from the FIRST order in the newest-first orders list (or null). Return `AdminCustomerDetail` with `status`, `tags`, `notes`, `aov`, `firstOrderAt`, `cancelledCount`, `tier`, `lastAddress`, plus the existing fields + `orders`. (Default `status ?? 'active'`, `tags ?? []`.)

- [ ] **Step 3: Extend `updateCustomer`** in `actions.ts`:
```ts
export async function updateCustomer(
  id: string,
  patch: { name?: string; email?: string | null; status?: string; tags?: string[]; notes?: string | null },
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!CUSTOMER_UUID_RE.test(id)) return { ok: false, error: "Customer not found." };
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name === "") return { ok: false, error: "Name is required." };
    update.name = name;
  }
  if (patch.email !== undefined) {
    const email = (patch.email ?? "").trim();
    if (email !== "" && !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Enter a valid email address or leave it blank." };
    update.email = email === "" ? null : email;
  }
  if (patch.status !== undefined) {
    if (!["active", "inactive", "blocked"].includes(patch.status)) return { ok: false, error: "Invalid status." };
    update.status = patch.status;
  }
  if (patch.tags !== undefined) {
    update.tags = [...new Set(patch.tags.map((t) => t.trim()).filter(Boolean))];
  }
  if (patch.notes !== undefined) {
    const notes = (patch.notes ?? "").trim();
    if (notes.length > 2000) return { ok: false, error: "Note too long (max 2000)." };
    update.notes = notes === "" ? null : notes;
  }
  if (Object.keys(update).length === 0) return { ok: true };
  const db = createAdminSupabase();
  const { data, error } = await db.from("customers").update(update as never).eq("id", id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Customer not found." };
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return { ok: true };
}
```

- [ ] **Step 4: Verify + commit.** `npx tsc --noEmit && npx vitest run`
```bash
git add src/lib/admin/queries.ts src/lib/admin/actions.ts
git commit -m "feat(customers): thread CRM fields + tier + last address; extend updateCustomer"
```

---

### Task 5: Settings form — Customer tiers card

**Files:** Modify `src/components/admin/settings-form.tsx`

**Interfaces:** Consumes `Settings.customerTiers` (T2). Writes it back via the existing `updateSettings`.

- [ ] **Step 1: Add the card.** READ `settings-form.tsx`. Add two `useState`s seeded from `settings.customerTiers.silver`/`.gold` (as strings). In `handleSave`, parse both via the existing `parseIntOrNull`, include them in the validation guard, add `if (gold < silver) return toast.error("Gold threshold must be ≥ silver.")`, and add `customerTiers: { silver, gold }` to the `next: Settings` object. Add a new `<Card>` "Customer tiers" (mirror the Shipping card markup) with two number inputs: **Silver at (৳)** and **Gold at (৳)**, plus a caption "Customers reach Silver/Gold when lifetime spend crosses these." Place it after the Shipping card.

- [ ] **Step 2: Verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add src/components/admin/settings-form.tsx
git commit -m "feat(settings): editable customer-tier thresholds"
```

---

### Task 6: Profile page — badges, metrics strip, last address, extended edit form

**Files:** Modify `src/app/admin/customers/[id]/page.tsx`, `src/components/admin/customer-edit-form.tsx`

**Interfaces:** Consumes `AdminCustomerDetail` (T4), `customerTier` output on it, `KpiCard`, `StringListEditor`, `updateCustomer`.

- [ ] **Step 1: Extend `customer-edit-form.tsx`.** READ it. Add props for the current `status`, `tags`, `notes`. Add: a **status `<select>`** (Active / Inactive / Blocked), a **tags** editor (`<StringListEditor label="Tags" value={tags} onChange={setTags} addLabel="Add tag" />`), and a **notes** `<textarea>` (bounded, placeholder "Internal notes (admins only)…"). On Save, call `updateCustomer(id, { name, email, status, tags, notes })`; keep phone read-only; toast + `router.refresh()`.

- [ ] **Step 2: Enrich the profile page.** In `[id]/page.tsx`:
  - Header: after the name, render a **status badge** (active=green `bg-neem/10 text-neem-deep` / inactive=slate / blocked=red `bg-danger/10 text-danger`), a **tier badge** (bronze/silver/gold with distinct styles), and the **tags** as chips (when non-empty).
  - A **metrics strip** (grid of `KpiCard`, no trend): Orders (`orderCount`), Spent (`formatTk(totalSpent)`), AOV (`formatTk(aov)`), Last order (`lastOrderAt ? formatDate(lastOrderAt) : '—'` with a sublabel "N days ago" computed here from `lastOrderAt` and `new Date()`), Cancelled (`cancelledCount`). First order (`firstOrderAt`) can be a small caption.
  - Keep the existing **Orders** card.
  - A read-only **"Last delivery address"** card when `lastAddress` is present: `addressLine`, `landmark?`, then `area, district, division`.
  - Pass `status`/`tags`/`notes` into the extended `<CustomerEditForm>`.

- [ ] **Step 3: Verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add "src/app/admin/customers/[id]/page.tsx" src/components/admin/customer-edit-form.tsx
git commit -m "feat(customers): profile — status/tier/tags badges, metrics strip, last address, edit CRM fields"
```

---

### Task 7: List page — badges, filters, KPI strip

**Files:** Modify `src/components/admin/customers-table.tsx`

**Interfaces:** Consumes the extended `CustomerListItem` (with `status`, `tags`, `tier`).

- [ ] **Step 1: Add badges + filters + KPI strip.** READ `customers-table.tsx`.
  - Add a **Status** badge column + a **Tier** badge column (same style maps as the profile).
  - Add a **status filter** `<select>` (`all` + active/inactive/blocked) and a **tag filter** `<select>` (built from the union of all customers' tags, `all` + each tag) beside the existing search; extend the `filtered` computation to AND both in.
  - Add a **KPI strip** above the table (client-computed from the loaded rows): Total customers, Active (status==='active'), Blocked (status==='blocked'), Total spend (`formatTk` of Σ `totalSpent`). Reuse `KpiCard` or a small inline stat card.

- [ ] **Step 2: Verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add src/components/admin/customers-table.tsx
git commit -m "feat(customers): list — status/tier badges, status/tag filters, KPI strip"
```

---

## Final Verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean.
- [ ] **Apply `supabase/migrations/0013_customer_profile.sql`** in the Supabase SQL editor (release gate).
- [ ] End-to-end (0013 applied, admin session): profile shows status/tier/tags + metrics strip + last delivery address; editing status→blocked / tags / notes persists + reflects on the list; **changing Silver/Gold thresholds in `/admin/settings` re-buckets tiers**; list status + tag filters narrow + KPI strip totals match; a blocked customer can still place a COD order; with 0013 unapplied the pages still render (defaults, no 500). Spot-check AOV vs the DB.
- [ ] Opus whole-branch review, then finish branch (PR to `master`; set per-branch preview env vars if the preview reports missing vars; redeploy).

## Self-Review

- **Spec coverage:** migration → T1; customerTier + settings thresholds → T2; metrics extension → T3; queries+action → T4; settings UI → T5; profile UI → T6; list UI → T7. Non-goals (loyalty points, address book, block enforcement, delete/merge) excluded. ✓
- **Placeholder scan:** T1–T3 carry full SQL/code + tests; T4 gives the full `updateCustomer` + the query-extension recipe; T5–T7 name the exact fields, reused components (`KpiCard`, `StringListEditor`), and badge style maps. No TBD.
- **Type consistency:** `CustomerTier`/`TierThresholds`/`customerTier` (T2) used by queries (T4) + UI (T6/T7); `Settings.customerTiers` (T2) used by settings form (T5) + queries (T4); `CustomerListItem` extensions (T3) consumed by list (T7); `AdminCustomerDetail` (T4) consumed by profile (T6). `updateCustomer`'s widened patch matches the edit form's call.
- **Load-bearing safety:** tier thresholds always from settings (never hardcoded); reads default the new fields (no 500 pre-migration); `updateCustomer` validates status/tags/notes server-side; `blocked` never touches checkout; `customerTier`/`aggregateCustomers` pure + total (AOV divide-by-zero guarded).
