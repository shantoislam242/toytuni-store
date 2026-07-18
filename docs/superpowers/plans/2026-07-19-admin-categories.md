# Admin Categories + Age-tiers CRUD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An `/admin/categories` page (two tabs) to create / edit / delete (blocked when referenced) / reorder both the `categories` and `age_tiers` taxonomies, reflected on the storefront via `revalidateTag('taxonomy')`.

**Architecture:** A pure taxonomy module (`kind → {table, fkColumn}`, `TONES`, validator, permutation check) feeds `getAdminTaxonomy(kind)` (rows + product counts) and four server actions; a shared `TaxonomyManager` client component renders a per-tab table with an add/edit modal + up/down reorder + FK-safe delete.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-admin-categories-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / `revalidateTag`. Middleware is `src/proxy.ts`.
- **No migration** — `categories`/`age_tiers` already carry `slug, title, sort, tone, tagline`. `tone`/`tagline` are absent from parts of the generated `database.types.ts`; write payloads use the established `as never` / narrow-cast (as `scripts/seed.ts` does), reads use `.overrideTypes<Row[],{merge:false}>()`. Do NOT regenerate types.
- **Slug is immutable** after create (FK key). Edit writes title/tone/tagline/sort only.
- **Delete is FK-safe:** block when the referencing-product count > 0 (clear message); the DB FK is the backstop.
- **`tone` ∈ the 8 `Tone` union values** (`src/lib/types.ts`).
- Every taxonomy write re-checks `getIsAdmin()` + service-role + `revalidateTag('taxonomy')`. Storefront reads are unchanged (Slice 2 already DB-sources taxonomy). Toytuni theme. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## File structure

- Create `src/lib/admin/taxonomy.ts` (+ `.test.ts`) — pure kind-map / TONES / validator / `isPermutation`.
- Modify `src/lib/admin/queries.ts` — `getAdminTaxonomy`.
- Modify `src/lib/admin/actions.ts` — `createTaxonomy`/`updateTaxonomy`/`deleteTaxonomy`/`reorderTaxonomy` + `revalidateTaxonomy`.
- Create `src/app/admin/categories/page.tsx`, `src/components/admin/taxonomy-manager.tsx`; modify `src/components/admin/admin-sidebar.tsx`.

---

## Task 1: Pure taxonomy module (TDD)

**Files:** Create `src/lib/admin/taxonomy.ts`, `src/lib/admin/taxonomy.test.ts`.

**Interfaces:**
- Produces: `TaxonomyKind = "category" | "ageTier"`; `TAXONOMY_TABLES` (kind → `{table, fkColumn, label}`); `TONES: Tone[]`; `validateTaxonomyInput(input, {requireSlug}): {ok:true}|{ok:false,error}`; `isPermutation(next, current): boolean`.

- [ ] **Step 1 — failing test** `src/lib/admin/taxonomy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateTaxonomyInput, isPermutation, TONES, TAXONOMY_TABLES } from "./taxonomy";

describe("validateTaxonomyInput", () => {
  const base = { slug: "wooden-toys", title: "Wooden Toys", tone: "neem", sort: 0 };
  it("accepts a valid create input", () => {
    expect(validateTaxonomyInput(base, { requireSlug: true })).toEqual({ ok: true });
  });
  it("rejects a bad slug on create", () => {
    expect(validateTaxonomyInput({ ...base, slug: "Bad Slug" }, { requireSlug: true }).ok).toBe(false);
  });
  it("skips the slug check on edit", () => {
    expect(validateTaxonomyInput({ title: "T", tone: "neem", sort: 1 }, { requireSlug: false })).toEqual({ ok: true });
  });
  it("rejects empty title, bad tone, negative sort", () => {
    expect(validateTaxonomyInput({ ...base, title: "  " }, { requireSlug: true }).ok).toBe(false);
    expect(validateTaxonomyInput({ ...base, tone: "rainbow" }, { requireSlug: true }).ok).toBe(false);
    expect(validateTaxonomyInput({ ...base, sort: -1 }, { requireSlug: true }).ok).toBe(false);
  });
});

describe("isPermutation", () => {
  it("true for a reorder of the same set", () => expect(isPermutation(["b", "a"], ["a", "b"])).toBe(true));
  it("false for dup / missing / extra / wrong length", () => {
    expect(isPermutation(["a", "a"], ["a", "b"])).toBe(false);
    expect(isPermutation(["a", "c"], ["a", "b"])).toBe(false);
    expect(isPermutation(["a"], ["a", "b"])).toBe(false);
  });
});

describe("TAXONOMY_TABLES", () => {
  it("maps both kinds to their table + fk column", () => {
    expect(TAXONOMY_TABLES.category).toMatchObject({ table: "categories", fkColumn: "category_slug" });
    expect(TAXONOMY_TABLES.ageTier).toMatchObject({ table: "age_tiers", fkColumn: "age_tier_slug" });
    expect(TONES).toContain("neem");
  });
});
```

- [ ] **Step 2 — run → FAIL.** `npx vitest run src/lib/admin/taxonomy.test.ts`

- [ ] **Step 3 — implement `src/lib/admin/taxonomy.ts`:**

```ts
import type { Tone } from "@/lib/types";

export type TaxonomyKind = "category" | "ageTier";

/** kind → its DB table + the products FK column that references it + a UI label. */
export const TAXONOMY_TABLES: Record<
  TaxonomyKind,
  { table: "categories" | "age_tiers"; fkColumn: "category_slug" | "age_tier_slug"; label: string }
> = {
  category: { table: "categories", fkColumn: "category_slug", label: "Category" },
  ageTier: { table: "age_tiers", fkColumn: "age_tier_slug", label: "Age tier" },
};

/** The 8 theme tones (mirrors the `Tone` union in src/lib/types.ts). */
export const TONES: Tone[] = [
  "cream", "neem", "neem-soft", "wood", "terracotta", "mustard", "dusty-blue", "blush",
];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Validate a taxonomy create/edit input. `requireSlug` is true on create (slug
 *  is immutable on edit, so it isn't validated there). Pure. */
export function validateTaxonomyInput(
  input: { slug?: string; title: string; tone: string; sort: number },
  opts: { requireSlug: boolean },
): { ok: true } | { ok: false; error: string } {
  if (opts.requireSlug && (!input.slug || !SLUG_RE.test(input.slug))) {
    return { ok: false, error: "Slug must be lowercase letters, numbers and single dashes." };
  }
  if (input.title.trim() === "") return { ok: false, error: "Name is required." };
  if (!(TONES as string[]).includes(input.tone)) return { ok: false, error: `Invalid tone: ${input.tone}` };
  if (!Number.isInteger(input.sort) || input.sort < 0) {
    return { ok: false, error: "Sort must be a non-negative whole number." };
  }
  return { ok: true };
}

/** Is `next` a permutation of `current` (same set + size, no duplicates)? Pure. */
export function isPermutation(next: string[], current: string[]): boolean {
  if (next.length !== current.length) return false;
  if (new Set(next).size !== next.length) return false;
  const cur = new Set(current);
  return next.every((s) => cur.has(s));
}
```

- [ ] **Step 4 — run → PASS.** `npx vitest run src/lib/admin/taxonomy.test.ts`, then `npx tsc --noEmit`.

- [ ] **Step 5 — commit** `feat(categories): pure taxonomy module — kinds, tones, validator, permutation (TDD)`.

---

## Task 2: `getAdminTaxonomy` query + CRUD actions

**Files:** Modify `src/lib/admin/queries.ts`, `src/lib/admin/actions.ts`.

**Interfaces:**
- Consumes: Task 1 module.
- Produces: `getAdminTaxonomy(kind): Promise<AdminTaxonomyItem[]>`; `createTaxonomy`/`updateTaxonomy`/`deleteTaxonomy`/`reorderTaxonomy` actions.

- [ ] **Step 1 — `queries.ts`.** Import `{ TAXONOMY_TABLES, type TaxonomyKind }` from `@/lib/admin/taxonomy`. Add:

```ts
export type AdminTaxonomyItem = {
  slug: string; title: string; tone: string | null; tagline: string | null; sort: number; productCount: number;
};

type TaxonomyRow = { slug: string; title: string; tone: string | null; tagline: string | null; sort: number };

/** All rows of a taxonomy (categories / age_tiers) ordered by sort, each with
 *  its referencing-product count (drives the delete-block UX). Service-role. */
export async function getAdminTaxonomy(kind: TaxonomyKind): Promise<AdminTaxonomyItem[]> {
  const { table, fkColumn } = TAXONOMY_TABLES[kind];
  const db = createAdminSupabase();
  const { data, error } = await db
    .from(table)
    .select("slug, title, tone, tagline, sort")
    .order("sort", { ascending: true })
    .overrideTypes<TaxonomyRow[], { merge: false }>();
  if (error) throw new Error(`getAdminTaxonomy(${kind}) failed: ${error.message}`);
  const rows = data ?? [];
  // Per-row referencing-product count. N+1 but tiny (≤ a dozen rows).
  const counts = await Promise.all(
    rows.map(async (r) => {
      const { count } = await db
        .from("products").select("id", { count: "exact", head: true }).eq(fkColumn, r.slug);
      return [r.slug, count ?? 0] as const;
    }),
  );
  const byslug = new Map(counts);
  return rows.map((r) => ({ ...r, productCount: byslug.get(r.slug) ?? 0 }));
}
```

- [ ] **Step 2 — `actions.ts` imports + revalidate helper.** Import `{ TAXONOMY_TABLES, validateTaxonomyInput, isPermutation, type TaxonomyKind }` from `@/lib/admin/taxonomy`. Add:

```ts
/** Refresh the storefront taxonomy caches after a category/age-tier write. */
function revalidateTaxonomy(): void {
  revalidateTag("taxonomy", "max");
  revalidateTag("catalog", "max"); // catalog rows carry category/age-tier slugs used by collection views
  revalidatePath("/");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/admin/categories");
}

type TaxonomyWriteInput = { slug: string; title: string; tone: string; tagline: string | null; sort: number };
```

- [ ] **Step 3 — `createTaxonomy`:**

```ts
export async function createTaxonomy(kind: TaxonomyKind, input: TaxonomyWriteInput): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const slug = input.slug.trim().toLowerCase();
  const v = validateTaxonomyInput({ slug, title: input.title, tone: input.tone, sort: input.sort }, { requireSlug: true });
  if (!v.ok) return v;

  const { table } = TAXONOMY_TABLES[kind];
  const db = createAdminSupabase();
  const { data: existing, error: dupErr } = await db.from(table).select("slug").eq("slug", slug).maybeSingle();
  if (dupErr) return { ok: false, error: dupErr.message };
  if (existing) return { ok: false, error: `"${slug}" already exists.` };

  const { error } = await db.from(table).insert({
    slug, title: input.title.trim(), tone: input.tone,
    tagline: input.tagline?.trim() || null, sort: input.sort,
  } as never);
  if (error) return { ok: false, error: error.message };
  revalidateTaxonomy();
  return { ok: true };
}
```

- [ ] **Step 4 — `updateTaxonomy`** (never writes slug):

```ts
export async function updateTaxonomy(
  kind: TaxonomyKind, slug: string, patch: { title: string; tone: string; tagline: string | null; sort: number },
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const v = validateTaxonomyInput({ title: patch.title, tone: patch.tone, sort: patch.sort }, { requireSlug: false });
  if (!v.ok) return v;
  const { table } = TAXONOMY_TABLES[kind];
  const db = createAdminSupabase();
  const { error } = await db.from(table).update({
    title: patch.title.trim(), tone: patch.tone, tagline: patch.tagline?.trim() || null, sort: patch.sort,
  } as never).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateTaxonomy();
  return { ok: true };
}
```

- [ ] **Step 5 — `deleteTaxonomy`** (FK-safe block):

```ts
export async function deleteTaxonomy(kind: TaxonomyKind, slug: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const { table, fkColumn } = TAXONOMY_TABLES[kind];
  const db = createAdminSupabase();
  const { count, error: cErr } = await db
    .from("products").select("id", { count: "exact", head: true }).eq(fkColumn, slug);
  if (cErr) return { ok: false, error: cErr.message };
  if ((count ?? 0) > 0) {
    return { ok: false, error: `${count} product(s) use this — reassign them first.` };
  }
  const { error } = await db.from(table).delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateTaxonomy();
  return { ok: true };
}
```

- [ ] **Step 6 — `reorderTaxonomy`** (permutation-guarded, persists `sort = index`):

```ts
export async function reorderTaxonomy(kind: TaxonomyKind, slugs: string[]): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const { table } = TAXONOMY_TABLES[kind];
  const db = createAdminSupabase();
  const { data, error: rErr } = await db.from(table).select("slug")
    .overrideTypes<{ slug: string }[], { merge: false }>();
  if (rErr) return { ok: false, error: rErr.message };
  const current = (data ?? []).map((r) => r.slug);
  if (!isPermutation(slugs, current)) return { ok: false, error: "Order does not match the current set." };
  for (let i = 0; i < slugs.length; i += 1) {
    const { error } = await db.from(table).update({ sort: i } as never).eq("slug", slugs[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidateTaxonomy();
  return { ok: true };
}
```

- [ ] **Step 7 — verify + commit.** `npx tsc --noEmit && npx vitest run && npm run build`. Commit `feat(admin): taxonomy query + create/update/delete/reorder actions`.

---

## Task 3: Admin UI — page + `TaxonomyManager` + sidebar

**Files:** Create `src/app/admin/categories/page.tsx`, `src/components/admin/taxonomy-manager.tsx`. Modify `src/components/admin/admin-sidebar.tsx`.

**Interfaces:** Consumes `getAdminTaxonomy` (Task 2), the four actions (Task 2), `TONES`/`TaxonomyKind` (Task 1), `moveInArray` (`@/lib/array-move`, from Slice 3b).

- [ ] **Step 1 — sidebar.** In `src/components/admin/admin-sidebar.tsx`, add a **Categories** nav item (import a lucide icon e.g. `Tags`) after Products (or near Orders), NOT disabled: `{ label: "Categories", href: "/admin/categories", icon: Tags }`. Leave Customers/Inventory/Blog disabled.

- [ ] **Step 2 — page** `src/app/admin/categories/page.tsx` (server):

```tsx
import type { Metadata } from "next";
import { getAdminTaxonomy } from "@/lib/admin/queries";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const metadata: Metadata = { title: "Categories", robots: { index: false, follow: false } };

export default async function Page() {
  const [categories, ageTiers] = await Promise.all([
    getAdminTaxonomy("category"),
    getAdminTaxonomy("ageTier"),
  ]);
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Categories</h1>
      <p className="mt-1 text-sm text-ink-muted">Manage product categories and age tiers.</p>
      <Tabs defaultValue="category" className="mt-6">
        <TabsList>
          <TabsTrigger value="category">Categories</TabsTrigger>
          <TabsTrigger value="ageTier">Age tiers</TabsTrigger>
        </TabsList>
        <TabsContent value="category" className="mt-4">
          <TaxonomyManager kind="category" items={categories} />
        </TabsContent>
        <TabsContent value="ageTier" className="mt-4">
          <TaxonomyManager kind="ageTier" items={ageTiers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3 — `TaxonomyManager`** (`"use client"`). A table of rows (name, slug, tone swatch+label, tagline, sort, product count) with per-row Edit / ↑ / ↓ / Delete and an "Add" button; Add/Edit open an inline modal (reuse the manual-dialog pattern from `product-edit-form.tsx` — `role="dialog"` + `fixed inset-0 z-50`). Reorder uses `moveInArray` → `reorderTaxonomy` (revert on failure); delete confirms then calls `deleteTaxonomy` (shows the block message on failure).

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moveInArray } from "@/lib/array-move";
import { TONES, type TaxonomyKind } from "@/lib/admin/taxonomy";
import { createTaxonomy, updateTaxonomy, deleteTaxonomy, reorderTaxonomy } from "@/lib/admin/actions";
import type { AdminTaxonomyItem } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

type DialogState =
  | { mode: "add" }
  | { mode: "edit"; item: AdminTaxonomyItem }
  | null;

export function TaxonomyManager({ kind, items }: { kind: TaxonomyKind; items: AdminTaxonomyItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, start] = useTransition();

  // keep local rows in sync when the server sends fresh props
  if (rows !== items && rows.map((r) => r.slug).join() !== items.map((r) => r.slug).join()) {
    // no-op guard; the effect below handles sync
  }

  const refresh = () => router.refresh();

  const move = (index: number, delta: number) => {
    const next = moveInArray(rows, index, delta);
    if (next === rows) return;
    const prev = rows;
    setRows(next);
    start(async () => {
      const r = await reorderTaxonomy(kind, next.map((x) => x.slug));
      if (!r.ok) { setRows(prev); toast.error(r.error); } else refresh();
    });
  };

  const remove = (item: AdminTaxonomyItem) => {
    if (!confirm(`Delete "${item.title}"?`)) return;
    start(async () => {
      const r = await deleteTaxonomy(kind, item.slug);
      if (r.ok) { toast.success("Deleted."); refresh(); } else toast.error(r.error);
    });
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setDialog({ mode: "add" })}>
          <Plus className="size-4" /> Add {kind === "category" ? "category" : "age tier"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Tone</th>
              <th className="px-3 py-2 font-medium">Tagline</th>
              <th className="px-3 py-2 text-right font-medium">Products</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr key={item.slug} className="border-b border-cream-200 last:border-b-0">
                <td className="px-3 py-2.5 font-medium text-ink">{item.title}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink-muted">{item.slug}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-ink-muted">
                    <span className={cn("size-3 rounded-full border border-cream-300", `bg-${item.tone ?? "cream"}`)} />
                    {item.tone ?? "—"}
                  </span>
                </td>
                <td className="max-w-48 truncate px-3 py-2.5 text-ink-muted">{item.tagline ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink">{item.productCount}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="icon" aria-label="Move up" disabled={i === 0 || busy}
                      onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Move down" disabled={i === rows.length - 1 || busy}
                      onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Edit" disabled={busy}
                      onClick={() => setDialog({ mode: "edit", item })}><Pencil className="size-4" /></Button>
                    <Button variant="outline" size="icon" aria-label="Delete" disabled={busy}
                      className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => remove(item)}><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-ink-muted">No entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <TaxonomyDialog
          kind={kind}
          state={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); refresh(); }}
        />
      )}
    </div>
  );
}

function TaxonomyDialog({
  kind, state, onClose, onSaved,
}: {
  kind: TaxonomyKind;
  state: { mode: "add" } | { mode: "edit"; item: AdminTaxonomyItem };
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state.mode === "edit";
  const existing = isEdit ? state.item : null;
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [tone, setTone] = useState(existing?.tone ?? "cream");
  const [tagline, setTagline] = useState(existing?.tagline ?? "");
  const [sort, setSort] = useState(String(existing?.sort ?? 0));
  const [busy, start] = useTransition();

  const save = () => {
    const sortNum = Number(sort);
    if (!Number.isInteger(sortNum) || sortNum < 0) return toast.error("Sort must be a whole number ≥ 0.");
    start(async () => {
      const payload = { title, tone, tagline: tagline.trim() === "" ? null : tagline, sort: sortNum };
      const r = isEdit
        ? await updateTaxonomy(kind, existing!.slug, payload)
        : await createTaxonomy(kind, { slug, ...payload });
      if (r.ok) { toast.success(isEdit ? "Saved." : "Added."); onSaved(); } else toast.error(r.error);
    });
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-bold text-ink">
          {isEdit ? "Edit" : "Add"} {kind === "category" ? "category" : "age tier"}
        </h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Slug</span>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={isEdit}
              placeholder="wooden-toys" className="mt-1 font-mono" />
            {isEdit && <span className="mt-1 block text-xs text-ink-soft">Slug can’t be changed.</span>}
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Name</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </label>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tone</span>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span className="inline-flex items-center gap-2">
                      <span className={cn("size-3 rounded-full border border-cream-300", `bg-${t}`)} />{t}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Tagline</span>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Sort</span>
            <Input type="number" min={0} step={1} inputMode="numeric" value={sort}
              onChange={(e) => setSort(e.target.value)} className="mt-1" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
```

Note the `cn` import (`@/lib/utils`). If `Button` lacks a `size="icon"` variant, use `className="size-9 p-0"` (check `src/components/ui/button.tsx`). For the tone swatch, `bg-${tone}` classes must exist in the Tailwind theme — check that tones like `bg-neem`, `bg-terracotta`, `bg-mustard`, `bg-cream` resolve (grep existing usage); if a tone has no bg utility, the swatch just shows a default border (acceptable — the label still names the tone). Remove the dead "keep local rows in sync" comment block in `TaxonomyManager` if you instead rely on `router.refresh()` re-supplying `items` (simplest: drop the local-sync guard; use `key={item.slug}` rows off `rows`, and re-init `rows` from a `useEffect` on `items` OR just trust `router.refresh()` to remount with new props — pick the clean approach and note it).

- [ ] **Step 4 — verify.** `npx tsc --noEmit && npx vitest run && npm run build` (`/admin/categories` renders; dynamic admin route). Live (controller, real admin session): add a category → storefront nav/collections show it; edit tone/name → reflects; reorder → order changes; delete unreferenced → gone; delete a referenced one → blocked with the count; same on the Age tiers tab. Clean up test rows.

- [ ] **Step 5 — commit** `feat(admin): categories page — taxonomy manager (CRUD + reorder) + sidebar`.

---

## Final verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean; storefront static/ISR intact (taxonomy reads unchanged).
- [ ] End-to-end (real admin session): create/edit/delete/reorder on BOTH tabs; storefront nav + `/collections/<slug>` + shop-by-age reflect; referenced-delete blocked with count; non-admin rejected. Clean up test rows.
- [ ] PR to `master`; set the 5 per-branch Supabase preview env vars for this branch if the preview build reports `supabaseUrl is required`, then redeploy (as prior slices).

## Self-Review (done during authoring)

- **Spec coverage:** pure module (kinds/tones/validator/permutation) → T1; query + CRUD/reorder actions → T2; page/manager/dialog/sidebar → T3. Both taxonomies via `kind`; delete blocks on referencing count; slug immutable on edit; storefront untouched (revalidateTag).
- **Placeholder scan:** none — real code/commands. The one soft spot (tone `bg-*` class existence + the local-rows-sync approach) is called out explicitly in T3 with the decision left to the implementer with a stated fallback.
- **Type consistency:** `TaxonomyKind`, `TAXONOMY_TABLES{table,fkColumn,label}`, `TONES`, `validateTaxonomyInput(input,{requireSlug})`, `isPermutation(next,current)`, `getAdminTaxonomy(kind)→AdminTaxonomyItem[]`, `createTaxonomy/updateTaxonomy/deleteTaxonomy/reorderTaxonomy` — consistent across tasks. `moveInArray` reused from Slice 3b.
- **FK-safety + admin-gating** are the load-bearing invariants; both in Global Constraints and exercised in T2.
