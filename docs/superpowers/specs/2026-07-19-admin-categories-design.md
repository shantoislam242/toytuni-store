# toytuni-store — Phase 3 Slice: Admin Categories + Age-tiers CRUD

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** An `/admin/categories` page (two tabs: Categories | Age tiers) that lets an admin create, edit, delete (blocked when referenced), and reorder both taxonomies — the `categories` and `age_tiers` tables. The storefront already reads these from the DB (Slice 2), so admin writes reflect immediately via `revalidateTag('taxonomy')`. Second of five admin sections (Settings ✓ → **Categories** → Inventory → Customers → Blog).

## Background

Phase 3 Slices 1/2/3a/3b + Settings are merged and live. `categories` and `age_tiers` are identical-shape tables (`slug text primary key, title text, sort int` + `tone text, tagline text` from migration 0005), 8 categories + 4 age-tiers seeded. `src/lib/data/taxonomy.ts` reads them (`getCategories`/`getAgeTiers`, `unstable_cache` tag `taxonomy`, fail-soft to mock) and the storefront nav / collection views / shop-by-age consume them. Products reference them by FK: `products.category_slug references categories(slug)`, `products.age_tier_slug references age_tiers(slug)` (no `ON DELETE` → a delete of a referenced row is blocked by the DB). There is no admin UI for taxonomy yet, and the admin sidebar has no Categories item.

## Goals

- **Admin CRUD for both taxonomies** (shared UI/logic, parameterized by `kind: "category" | "ageTier"`):
  - **Create** a new category/age-tier (slug + title + tone + tagline + sort).
  - **Edit** title / tone / tagline / sort (slug is immutable — it's the FK key).
  - **Delete**, blocked with a clear message when products reference it (report the count); a delete only proceeds for a taxonomy with zero referencing products.
  - **Reorder** (persist `sort`).
- **Admin read** `getAdminTaxonomy(kind)` — all rows with each row's referencing-product count (drives the delete-block UX + a count column).
- **`/admin/categories` page** with two tabs sharing a `TaxonomyManager` component; a new **Categories** sidebar item.
- **Storefront reflects** taxonomy edits via the existing `revalidateTag('taxonomy')` — no storefront code change.

## Non-goals (this slice)

- No storefront changes (categories/age-tiers already DB-sourced from Slice 2).
- No slug editing (immutable after create — renaming would break product FKs; the admin reassigns via product edit if needed).
- No product reassignment flow on delete (delete is blocked when referenced; the admin reassigns products first via the product edit form). Deferred as a possible later enhancement.
- No new taxonomy kinds beyond categories + age-tiers. No hierarchy/nesting.

## Locked decisions

- **Both** `categories` and `age_tiers` in this slice (twin shape, shared component).
- **Delete = block when referenced** (FK-safe; clear "N products use this" message), hard-delete when unreferenced.
- **Slug immutable** after create.
- One `/admin/categories` page, two tabs, one shared `TaxonomyManager`. Add/edit via a modal dialog.

## Schema

No migration — `categories`/`age_tiers` already carry `slug, title, tone, tagline, sort`.

## Architecture

- **`src/lib/admin/queries.ts`** — `getAdminTaxonomy(kind: TaxonomyKind): Promise<AdminTaxonomyItem[]>` (service-role, uncached; reads all rows of the `categories`/`age_tiers` table ordered by `sort`, and for each the count of referencing products via the matching FK column `category_slug`/`age_tier_slug`). `AdminTaxonomyItem = { slug, title, tone, tagline, sort, productCount }`. A `TaxonomyKind = "category" | "ageTier"` maps to `{ table, fkColumn }`.
- **`src/lib/admin/actions.ts`** — server actions, each admin re-check + service-role + `revalidateTag('taxonomy')` (+ revalidate `/`, `/collections/[slug]`, `/admin/categories`):
  - `createTaxonomy(kind, { slug, title, tone, tagline, sort })` — validate slug url-safe + unique in that table, title required, `tone` one of the 8 `Tone` values, sort a non-negative int; insert.
  - `updateTaxonomy(kind, slug, { title, tone, tagline, sort })` — validate; update (never slug).
  - `deleteTaxonomy(kind, slug)` — count referencing products; if `> 0` return `{ ok: false, error: "N product(s) use this — reassign them first." }`; else delete.
  - `reorderTaxonomy(kind, slugs)` — validate `slugs` is a permutation of the current set (length + no-dup + membership, as `reorderGallery` does), then persist `sort = index` for each.
- **Admin UI:**
  - `src/app/admin/categories/page.tsx` (server) — reads `getAdminTaxonomy("category")` + `getAdminTaxonomy("ageTier")`, renders a tabs shell (shadcn `Tabs`, already in the UI kit) with a `TaxonomyManager` per tab.
  - `src/components/admin/taxonomy-manager.tsx` (client) — a table (name, slug, a **tone swatch** + label, tagline, sort, product count) with per-row Edit / ↑ / ↓ / Delete controls and an **"Add"** button; Add/Edit open a modal dialog (`TaxonomyDialog`) with fields slug (create-only, read-only on edit), title, a **tone `Select`** (the 8 tones with a color swatch), tagline, sort. Reorder uses `moveInArray` (from Slice 3b) → `reorderTaxonomy`; delete confirms then calls `deleteTaxonomy` (surfaces the block message).
  - `src/components/admin/admin-sidebar.tsx` — add a **Categories** nav item (`/admin/categories`, a `Tags`/`FolderTree` lucide icon), not disabled.

## Data flow — add a category

1. Admin `/admin/categories` → Categories tab → "Add" → dialog (slug, title, tone, tagline, sort) → `createTaxonomy("category", …)`.
2. Action validates + inserts into `categories`; `revalidateTag('taxonomy')` + paths.
3. `getCategories()` now includes it → the storefront nav + `/collections/<slug>` + any category view show it immediately.

## Security / correctness

- Every taxonomy write re-checks `getIsAdmin()` + service-role; slug/tone/sort validated server-side (a bad `tone` or slug can't corrupt the catalog theme).
- Delete is FK-safe: the referencing-product count is checked in the action AND the DB FK is the ultimate backstop (a race that inserts a product between check and delete surfaces as a caught DB error, not a 500).
- `tone` restricted to the 8 `Tone` union values (mirrors the storefront theme).
- `getAdminTaxonomy` is service-role, server-only; no admin query reaches the client bundle.
- `reorderTaxonomy` persists only a permutation of the existing slugs (no injected/foreign slug).

## Testing

- **Pure (TDD):** a taxonomy-input validator (slug url-safe, title non-empty, tone ∈ Tone, sort ≥ 0) and the reorder permutation check.
- **Integration (drive it, real admin session):** add a category → appears in the storefront nav + collections; edit its name/tone/tagline/sort → reflects; delete an unreferenced category → gone; attempt to delete a referenced category → blocked with the product count; reorder → the storefront order changes; the same for age-tiers (shop-by-age reflects); non-admin rejected on every action. Clean up any test rows.

## Open questions for review

- Add/Edit UX: modal dialog vs. an inline expandable row. Proposal: **modal dialog** (clean for 5 fields; matches the deactivate-confirm dialog pattern already in the product edit form).
- Reorder control: up/down buttons (reuse `moveInArray`, keyboard-friendly, no new dep) vs. drag-and-drop. Proposal: **up/down** this slice.
