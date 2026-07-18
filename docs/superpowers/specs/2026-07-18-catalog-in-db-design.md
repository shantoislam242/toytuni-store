# toytuni-store — Phase 3 Slice 2: Catalog-in-DB + add/delete product

**Date:** 2026-07-18
**Status:** Design approved, pending spec review
**Scope:** Make the DB the source of truth for the product CATALOG (listing/structural fields) and for categories/age-tiers, so the admin can add / soft-delete products that work end-to-end (storefront + client cart/search). Rich PDP editorial (`ProductDetail`) stays mock this slice.

## Background

Phase 1 (overlay: DB=price/stock/pre-order, mock=structure) + Phase 2 (auth) + Slice 1 (admin: dashboard, edit operational fields, orders, image upload) are merged and live. Today the storefront's product STRUCTURE (title, category, image, badge) still comes from `src/lib/mock/products.ts`, and ~7 CLIENT components (`cart-context`, `wishlist`, `smart-search`, `recently-viewed`, `shop-by-age`, `product-list-item`, `bulk-order-builder`) read that mock synchronously. So an admin-added product (DB-only) would not appear on the storefront and would break the client cart. This slice fixes that.

## Goals

- **`getFullCatalog()`** — read the full `Product` (structural + operational) from the DB (`products` + `inventory` + `product_variants` + `kit_contents`), for all sellable rows (the 27 incl. gift kits/cards).
- **`CatalogProvider`** — a client React context hydrated once (server-fetched) with the full catalog; the 7 client components use `useCatalog().bySlug(slug)` / `.all` instead of mock. This is the risky, purchase-critical change.
- **Categories + age-tiers in DB** — migration adds presentational columns (tone, tagline; name/href derived or stored); re-seed; storefront reads them from the DB.
- **Admin CRUD** — add a new product (full form + image → products + inventory rows), soft-delete (`active=false`), and make Slice 1's edit form's STRUCTURAL fields (title, category, age-tier, description, badge) editable now that they reflect on the storefront.
- **Mock = fail-soft fallback** — if the DB read fails, the storefront renders from the mock catalog (site stays up).

## Non-goals (this slice)

- **Rich `ProductDetail` in DB** (features/benefits/specs/reviews/tabs/video). Existing products keep their mock `ProductDetail` (keyed by slug); NEW products get a basic PDP (title/price/image/description, empty tabs). Full editorial-in-DB is a later slice.
- No admin Categories/Customers/Inventory/Blog/Settings pages (still "Soon").
- No hard delete.

## Locked decisions
- Delete = **soft** (`active=false`; storefront hides inactive, admin sees all, orders/history intact).
- Mock catalog kept as **fail-soft fallback**, not deleted.
- Category/age-tier presentation moves **fully to DB**.

## Schema (migration 0005)
- `products`: add `kit_contents jsonb` (gift-kit "what's inside"; null for normal products).
- `categories`: add `name text` (display, currently in `title`), `tone text`, `tagline text`. (href derived as `/collections/<slug>`.)
- `age_tiers`: add `label text`, `tone text`, `tagline text`.
- Re-seed (`scripts/seed.ts`): populate `kit_contents` for gift kits, and category/age-tier `tone`/`tagline` from the mock. Idempotent upsert.

## Architecture
- **`src/lib/data/full-catalog.ts`** (server-only): `getFullCatalog(): Promise<Product[]>` (all active + inactive? — storefront uses active only; provide `getFullCatalog()` = active for the storefront and let admin queries read all). Builds each `Product` from the joined row; on any DB error, returns the mock catalog (fail-soft) and logs.
- **`src/lib/catalog/catalog-context.tsx`** (client): `CatalogProvider` (given the catalog array as a prop) + `useCatalog(): { all: Product[]; bySlug(slug): Product | undefined }`. Hydrated in the root layout by a small server wrapper that calls `getFullCatalog()`.
- **Migrate client consumers** to `useCatalog()`: `cart-context` (`productBySlug` → `useCatalog().bySlug`), `wishlist`, `smart-search`, `recently-viewed`, `shop-by-age`, `product-list-item`, `bulk-order-builder`. Each keeps identical behavior; only the data source changes.
- **Server catalog** (`src/lib/data/catalog.ts`) switches its base from the mock array to `getFullCatalog()` (overlay logic folds in — price/stock/pre-order already in the same rows now). Derived selectors (bestSellers/deals/…) operate on the DB catalog.
- **Categories/age-tiers**: `getCategories()`/`getAgeTiers()` read from DB (with tone/tagline); the storefront category/age views + nav use them. Mock category/age-tier kept as fail-soft fallback.
- **Admin actions** (`src/lib/admin/actions.ts`): `createProduct(input)` (validate; insert products + inventory rows; optional image; revalidate), `softDeleteProduct(slug)` (`active=false`; revalidate), extend `updateProduct` to accept structural fields (title, description, category_slug, age_tier_slug, badge) now. `src/app/admin/products/new/page.tsx` + a create form; a delete control on the edit page.

## Data flow — add a product
1. Admin `/admin/products/new` → fills title, sku, price, category, age-tier, stock, badge, description, image.
2. `createProduct` (admin re-check, validate, service-role): insert `products` + `inventory`; if image, upload to Storage + set `image_url`; `revalidateTag('catalog')` + paths.
3. `getFullCatalog()` now includes it → CatalogProvider hydrates it → it appears in listings, PDP, search, and can be added to cart and ordered (createOrder already re-reads price/stock by slug).

## Security / correctness
- Admin writes re-check `getIsAdmin()` server-side; service-role server-only.
- `getFullCatalog` fail-soft must NOT mask a partial/corrupt read as success — fall back to mock only on a thrown error, and log it.
- The client catalog payload is the full 27-product set (small); fine at this scale (documented; not for thousands of SKUs).
- createOrder still re-reads price/stock from the DB by slug — a client with a stale catalog can't alter the charged price.

## Testing
- **Pure (TDD):** `rowToFullProduct` mapper (DB row + inventory + variants + kit_contents → Product); the fail-soft selector (error → mock).
- **Integration (drive it):** existing products render identically (server + client) from the DB catalog; a NEW admin-added product appears in listings/PDP/search and can be added to cart + ordered; soft-delete hides it from the storefront but keeps it in admin; structural edit (title/category) reflects on the storefront; DB-unreachable → mock fallback renders. Verified with real admin sessions.

## Open questions for review
- Gift kits/cards `kit_contents`: added as a jsonb column + seeded, so they're DB-sourced like everything else (no mock special-case in the client path). Confirm this is wanted vs. leaving gift kits mock-only.
