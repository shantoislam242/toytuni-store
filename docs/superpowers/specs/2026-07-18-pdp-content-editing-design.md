# toytuni-store — Phase 3 Slice 3b: Full PDP content editing from admin

**Date:** 2026-07-18
**Status:** Design approved, pending spec review
**Scope:** Make the rich product-detail content (`ProductDetail`) DB-sourced and admin-editable, so an admin can edit everything shown on a product page — description, features, benefits, the "why play"/"how play" tabs, return policy, the specs table, delivery estimate, product video, and a multi-image gallery. Existing hand-written content is seeded into the DB so admins start from the current copy, not a blank slate. Mock stays as a fail-soft fallback.

## Background

Phase 1/2 + Slice 1 (admin: operational + image) + Slice 2 (catalog-in-DB) + Slice 3a (pre-order + advance) are merged and live. Today the PDP's rich editorial still comes from mock: `src/app/products/[slug]/page.tsx` loads `detail = productDetailBySlug(slug) ?? basicProductDetail(slug, product.description)` (`src/lib/mock/products.ts`). So an admin can edit price/stock/pre-order/title/category/badge/description/image, but NOT features, benefits, tabs, specs, delivery estimate, video, or the image gallery. This slice closes that gap.

The `ProductDetail` type (`src/lib/types.ts`): `description`, `features[]`, `benefits[]`, `imageSrcs[]` (gallery), `deliveryEstimate`, `saleCountdown`, `whyPlay?[]`, `howPlay?[]`, `returnPolicy?`, `specs?{materials,safety,weight,dimensions,ageRange}`, `reviews?[]`, `videoUrl?`.

## Goals

- **DB is the source of truth for editable PDP content.** A new `products.detail_content jsonb` holds the editable editorial (`features`, `benefits`, `whyPlay`, `howPlay`, `returnPolicy`, `specs`, `deliveryEstimate`, `videoUrl`). `description` stays its existing column. A new `products.gallery_urls text[]` holds the ordered PDP gallery images.
- **Seed existing content.** A one-time seed writes the current mock `detailCopy` + gallery image paths into `detail_content`/`gallery_urls` for the existing hand-authored products, so admins open the real current copy and can edit it.
- **`getProductDetail(slug)`** — a server read that builds a `ProductDetail` from the DB row, fail-soft to the mock (`productDetailBySlug ?? basicProductDetail`) on error/missing content. The PDP page uses it instead of the mock call.
- **Admin editing** — a "Content" section on the product edit AND create forms: reusable list editors for `features`/`benefits`/`whyPlay`/`howPlay`, the 5 spec fields, `returnPolicy`/`deliveryEstimate`/`videoUrl`, and a **multi-image gallery** (upload to Supabase Storage, remove, reorder). Writes go through the existing `updateProduct`/`createProduct` server actions plus gallery upload/remove actions.
- **Mock = fail-soft fallback** (site stays up if the DB read fails or content is absent).

## Non-goals (this slice)

- **Reviews** — customer-generated content; stays sourced from mock/defaults (`getProductDetail` fills `reviews` from the mock), managed separately in a later slice. Admins do NOT type reviews in the product form.
- **`saleCountdown`** — a promo countdown, not core content; keeps its default value (not admin-edited this slice).
- **Global/site-wide strips** — trust certifications, "300k+ babies", "9K shares", the certified-logo image. These are site-wide, not per-product; they move to a Settings slice later, not here.
- **Gift kits/cards editorial** — they generate their detail dynamically (`giftKitDetail`); leaving their `detail_content` null means `getProductDetail` fail-soft returns that generated detail. Not seeded, not form-edited this slice.

## Locked decisions

- Editable content lives in one **`detail_content jsonb`** column (not a separate table) — matches the nested/array shape, one migration, easy fail-soft.
- **Gallery = multi-image**, uploaded to the existing public `product-images` bucket, stored as an ordered `gallery_urls text[]`.
- **Seed the existing hand-written copy** into the DB (idempotent).
- Reviews + saleCountdown + global strips are **out of scope** (fallback/default).
- `detail_content`/`gallery_urls` are **PDP-only reads** — they are NOT added to the client `getFullCatalog` payload (which hydrates cart/search across the whole catalog) to avoid bloating the client bundle.

## Schema (migration 0007)

- `products`: `add column if not exists detail_content jsonb;` (null = fall back to mock/default), `add column if not exists gallery_urls text[];`
- Re-seed (`scripts/seed.ts`): for each product that has hand-authored mock detail (`detailCopy` entries), write `detail_content` = `{features, benefits, whyPlay, howPlay, returnPolicy, specs, deliveryEstimate, videoUrl}` from the mock, and `gallery_urls` from the mock `productImageSrcs[slug]` (the existing public image paths). Idempotent upsert. Gift kits/cards left null (dynamic fallback).

## Architecture

- **`src/lib/data/product-detail.ts`** (server-only): `getProductDetail(slug): Promise<ProductDetail>`.
  - Reads the product row (`detail_content, description, gallery_urls, rating, review_count, image_url`) via the cookieless public client (static-friendly, like `getFullCatalog`).
  - If `detail_content` is present: build `ProductDetail` from it + `description` (column) + gallery (`gallery_urls` → else `[image_url]` → else mock `imageSrcs`) + `reviews` (from mock `productDetailBySlug(slug)?.reviews` ?? default) + `saleCountdown` (default). A pure `rowToProductDetail(row, mockReviews)` mapper does the shaping and is unit-tested.
  - If `detail_content` is null OR the read throws: fail-soft to `productDetailBySlug(slug) ?? basicProductDetail(slug, description)` (unchanged mock path) — so existing-but-unseeded products, gift kits, and DB blips all still render.
  - Wrapped in `unstable_cache` tag `catalog` (same tag admin writes already bust) so PDP content refreshes on an admin save; 1-hour `revalidate` bound.
- **PDP page** (`src/app/products/[slug]/page.tsx`): replace `productDetailBySlug(slug) ?? basicProductDetail(...)` with `await getProductDetail(slug)`. `generateMetadata`'s description similarly reads from it (or the product description). Gift-card branch unchanged.
- **Gallery source in the view:** `ProductDetailsView` currently uses `product.imageUrl ? [product.imageUrl] : detail.imageSrcs`. Since `getProductDetail` now folds the gallery precedence into `detail.imageSrcs`, the view uses `detail.imageSrcs` directly.
- **Admin write actions** (`src/lib/admin/actions.ts`):
  - Extend `ProductPatch` + `CreateProductInput` with a `detailContent` object (validated: arrays of non-empty strings, specs strings, videoUrl optional URL) → written to `detail_content` (jsonb, via the established narrow-cast for untyped columns).
  - `gallery_urls`: managed by dedicated actions — `uploadGalleryImage(slug, formData)` (validate + upload to `product-images`, append its public URL to `gallery_urls`), `removeGalleryImage(slug, url)` (drop it), `reorderGallery(slug, urls)` (persist a new order). Each re-checks admin + revalidates. (Reuses `putProductImage`'s validation for the file.)
- **Admin queries** (`src/lib/admin/queries.ts`): `getAdminProductBySlug` returns `detailContent` (typed) + `galleryUrls`; `AdminProductDetail` gains those fields.
- **Admin UI** (`src/components/admin/product-edit-form.tsx` + `product-create-form.tsx`): a new "Content" card with:
  - `StringListEditor` (reusable) for features, benefits, whyPlay, howPlay — add/remove/reorder rows.
  - Specs: 5 labeled inputs.
  - `returnPolicy` textarea, `deliveryEstimate` input, `videoUrl` input.
  - `GalleryEditor` (reusable): thumbnails of `gallery_urls`, an upload control (multi), per-image remove, reorder (up/down). Calls the gallery actions; optimistic-ish with `router.refresh()`.

## Data flow — edit PDP content

1. Admin opens `/admin/products/<slug>` → server reads `detail_content` + `gallery_urls` (+ operational fields) → the Content card is pre-filled with the current (seeded) copy.
2. Admin edits features/benefits/tabs/specs/policy/delivery/video → Save → `updateProduct` writes `detail_content` (jsonb) → `revalidateTag('catalog')`.
3. Gallery: admin uploads images (each → `uploadGalleryImage` → Storage + append URL), removes/reorders → each action persists `gallery_urls` + revalidates.
4. `getProductDetail(slug)` now returns the DB content → the PDP shows the edits.

## Security / correctness

- Admin write actions re-check `getIsAdmin()` server-side + service-role; gallery upload validates content-type + size (reuses `putProductImage`).
- `detail_content` is validated/shaped server-side before write (arrays of strings, known spec keys, optional URL) — a malformed client payload can't corrupt the PDP.
- Fail-soft: `getProductDetail` returns mock ONLY on a thrown error or null content — never masks partial data; logs on failure.
- New columns absent from generated `database.types.ts` → use the established narrow-cast / `.overrideTypes()` pattern (as `image_url`/pre-order columns do), NOT a regenerated types file.
- `detail_content`/`gallery_urls` stay OUT of the client catalog payload (PDP-only server read).

## Testing

- **Pure (TDD):** `rowToProductDetail(row, mockReviews)` — maps a `detail_content` row → `ProductDetail` (arrays, specs, gallery precedence, reviews/saleCountdown fallback); the fail-soft selector (null/error → mock).
- **Integration (drive it):** a seeded product's PDP renders identically off the DB (features/benefits/tabs/specs/gallery); editing a feature/spec/return-policy in admin reflects on the PDP after save; adding/removing/reordering gallery images reflects; a DB-only product (no seed) edited via the form shows content on its PDP; DB read failure → mock fallback renders; gift kit PDP still renders (dynamic fallback). Verified with a real admin session + live render.

## Open questions for review

- Gallery reorder UX: up/down buttons (simple, keyboard-friendly) vs. drag-and-drop. Proposal: **up/down** this slice (no new dep); drag-and-drop later if wanted.
- `videoUrl` validation: accept any `https` URL, or restrict to YouTube watch/shorts/embed forms (the PDP already normalizes YouTube URLs)? Proposal: accept `https` + let the existing normalizer handle YouTube; non-YouTube simply won't embed.
