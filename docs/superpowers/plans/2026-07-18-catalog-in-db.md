# Phase 3 Slice 2 — Catalog-in-DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Make the DB the source of truth for the product catalog + categories/age-tiers so admin add/soft-delete products work end-to-end (storefront + client cart/search), with mock as a fail-soft fallback.

**Architecture:** `getFullCatalog()` reads full `Product` rows from the DB (fail-soft to mock); a client `CatalogProvider` hydrates the ~7 client consumers off it; the server catalog switches its base from mock to DB; admin gains create + soft-delete + structural edits.

**Tech Stack:** Next.js 16, TypeScript, Supabase, shadcn, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-catalog-in-db-design.md`

## Global Constraints
- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before server actions / `revalidateTag` / context in layouts. Middleware is `src/proxy.ts`.
- **Existing products must render IDENTICALLY** off the DB catalog (server + client) — this is the regression bar.
- **Fail-soft:** `getFullCatalog`/category reads fall back to mock ONLY on a thrown error (never mask partial data), and log.
- Admin writes re-check `getIsAdmin()` server-side; service-role server-only.
- `createOrder` still re-reads price/stock by slug (unchanged) — the client catalog is display-only.
- BDT integers; `formatTk`/`formatDate`; toytuni theme. `.env.local`/`.superpowers/` gitignored — stage explicit paths only.

## Manual step (user): apply `supabase/migrations/0005_catalog_fields.sql` before the re-seed + full verification.

---

## Task 1: Migration 0005 + re-seed (kit_contents, category/age-tier presentation)
**Files:** Create `supabase/migrations/0005_catalog_fields.sql`. Modify `scripts/seed.ts`.
- [ ] Step 1 — `0005_catalog_fields.sql`: `alter table products add column if not exists kit_contents jsonb;` `alter table categories add column if not exists tone text, add column if not exists tagline text;` `alter table age_tiers add column if not exists tone text, add column if not exists tagline text;`
- [ ] Step 2 — extend `scripts/seed.ts`: on products upsert add `kit_contents: p.kitContents ?? null`; on categories add `tone: c.tone, tagline: c.taglineBn ?? null`; age_tiers `tone: a.tone, tagline: a.taglineBn ?? null`. Keep idempotent.
- [ ] Step 3 — (after user applies 0005) run `npm run db:seed`; confirm counts unchanged (27 products, 8 categories, 4 age tiers) and the new columns populated (spot-check via REST).
- [ ] Step 4 — commit `feat(catalog): migration 0005 + seed kit_contents & category/age-tier presentation`.

## Task 2: `rowToFullProduct` mapper + `getFullCatalog` (fail-soft) (TDD)
**Files:** Create `src/lib/data/full-catalog.ts`, `src/lib/data/full-catalog.test.ts`.
**Interfaces:** `rowToFullProduct(row): Product` (pure — DB products row + inventory stock + variants + kit_contents → the app `Product`, incl. `imageUrl`). `getFullCatalog(): Promise<Product[]>` (server-only; active products; on thrown error returns the mock catalog).
- [ ] Step 1 — TDD `rowToFullProduct`: fixture row → asserts every Product field maps (titleBn from title, imageTones, badge, imageUrl, variants, kitContents). RED → GREEN.
- [ ] Step 2 — `getFullCatalog`: `createServerSupabase()` select products (all catalog columns) + `inventory(stock_qty)` + `product_variants(name,tone)` where `active=true`; map via `rowToFullProduct`; wrap in try/catch → on error, `import { products } from "@/lib/mock/products"` and return that (log the error). `.overrideTypes()` for the select-never quirk.
- [ ] Step 3 — verify tsc/eslint/build + tests. Commit `feat(catalog): getFullCatalog DB read with mock fail-soft`.

## Task 3: Server catalog switch + categories/age-tiers from DB
**Files:** Modify `src/lib/data/catalog.ts` (base = getFullCatalog), `src/lib/data/catalog.ts`'s `getCatalogProduct`; create/extend `src/lib/data/taxonomy.ts` (`getCategories`, `getAgeTiers` from DB, fail-soft). Modify the server views/nav that read mock categories/age-tiers.
- [ ] Step 1 — `catalog.ts`: replace the `mockProducts` base with `await getFullCatalog()`; the overlay `applyOverride` is no longer needed for price/stock (already in the full row) — simplify `getCatalog` to return the full products directly (still compute `availability` via `getProductState` from the row's stock+preorder). Keep gift kits/cards resolution for `getCatalogProduct` (they're in the catalog now).
- [ ] Step 2 — `taxonomy.ts`: `getCategories()`/`getAgeTiers()` read DB (slug, name/title, tone, tagline, sort), fail-soft to mock; derive href. Swap the server category/age views + nav (`src/lib/mock/nav.ts` consumers) to these.
- [ ] Step 3 — verify: build; every storefront route 200 with correct prices + categories; existing products unchanged. Commit `feat(catalog): storefront reads catalog + taxonomy from DB`.

## Task 4: CatalogProvider + migrate client consumers (the risky one)
**Files:** Create `src/lib/catalog/catalog-context.tsx` + a server hydrator; modify `src/app/layout.tsx`; modify `src/lib/cart/cart-context.tsx`, `src/components/wishlist/wishlist-view.tsx`, `src/components/search/smart-search.tsx`, `src/components/product/recently-viewed.tsx`, `src/components/home/shop-by-age.tsx`, `src/components/product/product-list-item.tsx`, `src/components/bulk/bulk-order-builder.tsx`.
- [ ] Step 1 — `catalog-context.tsx` (client): `CatalogProvider({ catalog, children })` + `useCatalog(): { all, bySlug }`. A server wrapper fetches `getFullCatalog()` and renders `<CatalogProvider catalog={…}>`; mount it in `layout.tsx` (inside existing providers, above CartProvider since cart uses it).
- [ ] Step 2 — migrate each client consumer: replace `productBySlug`/`products` mock imports with `useCatalog().bySlug`/`.all`. Keep behavior identical. **cart-context is purchase-critical** — verify a product resolves and the cart line total is correct.
- [ ] Step 3 — verify (drive it): existing products add-to-cart + cart line totals correct; search finds products; wishlist/recently-viewed resolve; build clean. Controller live-verifies. Commit `feat(catalog): CatalogProvider hydrates client cart/search/wishlist from DB`.

## Task 5: Admin — create product + soft-delete + structural edits
**Files:** Modify `src/lib/admin/actions.ts` (add `createProduct`, `softDeleteProduct`; extend `updateProduct` with structural fields); `src/lib/admin/queries.ts` (select structural fields incl. image_url — done in Slice-1 fix — and category/age options); create `src/app/admin/products/new/page.tsx` + `src/components/admin/product-create-form.tsx`; modify `src/components/admin/product-edit-form.tsx` (structural fields now editable + a soft-delete control); `src/components/admin/products-table.tsx` (a "New product" button, show inactive).
- [ ] Step 1 — READ Next docs for server actions/revalidate/FormData.
- [ ] Step 2 — `createProduct(input)`: admin re-check; validate required (slug unique, sku, title, price>=0, category, age-tier); insert `products` (+ `image_url` if uploaded) + `inventory`; `revalidateTag('catalog')` + paths. `softDeleteProduct(slug)`: admin re-check; set `active=false`; revalidate. Extend `updateProduct` to also write title/description/category_slug/age_tier_slug/badge (validate category/age-tier exist).
- [ ] Step 3 — `new/page.tsx` + `product-create-form.tsx` (client): full field form + image; on submit calls `createProduct`; on success redirect to the edit page; toast.
- [ ] Step 4 — `product-edit-form.tsx`: make structural fields editable (were read-only in Slice 1); add a "Deactivate/Delete" (soft) control with confirm.
- [ ] Step 5 — verify (drive it, real admin session): add a new product → appears in storefront listings/PDP/search, add-to-cart + order works; edit a title/category → reflects on storefront; soft-delete → hidden from storefront, still in admin; non-admin rejected. Clean up the test product. Commit `feat(admin): create product, soft-delete, structural edits`.

## Self-Review Notes
- Every spec goal maps to a task: schema/seed (T1), full-catalog read + fail-soft (T2), server catalog+taxonomy switch (T3), client hydration (T4), admin CRUD (T5).
- 0005 is user-applied; T1 re-seed + full verification gate on it. getFullCatalog fail-soft means the storefront survives 0005 not-yet-applied (renders mock) — but categories/age-tiers DB read also needs fail-soft (T3).
- Rich ProductDetail deferred; new products get a basic PDP. Add-new works end-to-end because createOrder re-reads by slug and the client catalog now includes new products.
- Regression bar: existing products render identically off the DB catalog (T3/T4 verify).
