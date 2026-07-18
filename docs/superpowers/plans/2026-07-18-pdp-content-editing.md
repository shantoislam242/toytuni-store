# PDP Content Editing (Slice 3b) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rich PDP editorial (`ProductDetail`: features, benefits, why/how-play, return policy, specs, delivery estimate, video, multi-image gallery) DB-sourced and fully admin-editable, seeding the existing hand-written copy so admins start from the current content.

**Architecture:** A new `products.detail_content jsonb` + `products.gallery_urls text[]` hold the editable content; a seed migrates the current mock copy in. A server `getProductDetail(slug)` builds a `ProductDetail` from the row (fail-soft to mock), used by the PDP only (kept out of the client catalog payload). Admin edit/create forms gain a "Content" section (reusable list + gallery editors) writing through `updateProduct`/`createProduct` plus dedicated gallery actions.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase (`@supabase/ssr`), shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-pdp-content-editing-design.md`

## Global Constraints

- **Non-standard Next.js.** Read `node_modules/next/dist/docs/` before touching server actions / `revalidateTag` / `unstable_cache`. Middleware is `src/proxy.ts`.
- **Stale generated types.** `src/lib/supabase/database.types.ts` predates `detail_content` and `gallery_urls`. Do NOT regenerate. Use the established pattern: local `& {…}` extension type for writes (as Slice 3a's `ProductsUpdateExt`) and `.overrideTypes<Row[],{merge:false}>()` for reads (as `full-catalog.ts`).
- **Fail-soft:** `getProductDetail` returns the mock (`productDetailBySlug(slug) ?? basicProductDetail(slug, description)`) ONLY on a thrown error OR when `detail_content` is null — never masks partial data; logs on failure.
- **PDP-only reads:** `detail_content`/`gallery_urls` must NOT be added to `getFullCatalog`'s select or the client `CatalogProvider` payload.
- **Out of scope (keep as fallback/default):** reviews (sourced from mock/default), `saleCountdown` (default constant), global strips. Gift kits/cards keep `detail_content = null` (dynamic `giftKitDetail` fallback).
- Admin writes re-check `getIsAdmin()` server-side + service-role. Gallery uploads validate content-type + size (reuse the existing `product-images` upload path). BDT/`formatTk`, toytuni theme. `.env.local`/`.superpowers/` gitignored — stage explicit paths.

## Manual step (user)

Apply `supabase/migrations/0007_pdp_content.sql`, then run `npm run db:seed`, BEFORE the Task 3/4/6 live verification. Unit tests + build do not require it.

## File structure

- Create `supabase/migrations/0007_pdp_content.sql`; modify `scripts/seed.ts`.
- Add `DetailContent` type to `src/lib/types.ts`.
- Create `src/lib/data/product-detail.ts` (+ `.test.ts`) — `rowToProductDetail` + `getProductDetail`.
- Modify `src/app/products/[slug]/page.tsx` + `src/components/product/product-details-view.tsx`.
- Modify `src/lib/admin/actions.ts` (detail write + gallery actions), `src/lib/admin/queries.ts` (return new fields).
- Create `src/lib/array-move.ts` (+ `.test.ts`) — pure reorder helper.
- Create `src/components/admin/string-list-editor.tsx`, `src/components/admin/gallery-editor.tsx`.
- Modify `src/components/admin/product-edit-form.tsx` + `product-create-form.tsx` (Content section).

---

## Task 1: Migration 0007 + seed detail_content & gallery_urls

**Files:** Create `supabase/migrations/0007_pdp_content.sql`. Modify `scripts/seed.ts`.

**Interfaces:**
- Produces: columns `products.detail_content jsonb`, `products.gallery_urls text[]`; seeded content for shelf products.

- [ ] **Step 1 — migration.** `supabase/migrations/0007_pdp_content.sql`:

```sql
-- toytuni-store — Phase 3 Slice 3b: editable PDP content.
-- detail_content = editable editorial (features/benefits/why-how play/return policy/
-- specs/delivery estimate/video); gallery_urls = ordered PDP gallery images.
-- Both null/empty => the app falls back to the mock ProductDetail.
-- Run in the Supabase SQL editor after 0006_preorder_advance.sql, then re-seed.

alter table products add column if not exists detail_content jsonb;
alter table products add column if not exists gallery_urls text[];
```

- [ ] **Step 2 — seed.** In `scripts/seed.ts`, import the resolved mock detail and write it for shelf products. At the top add:

```ts
import { productDetailBySlug, basicProductDetail } from "@/lib/mock/products";
```

In the products upsert (currently sets `description: null`), replace those fields so each shelf product carries its resolved content. Change the upsert object's `description: null,` and add two fields, deriving them once above the upsert call:

```ts
    // Resolved current PDP content (mock copy merged over defaults). Gift
    // kits/cards have no hand-written copy and stay null (dynamic fallback).
    const detail = productDetailBySlug(p.slug) ?? basicProductDetail(p.slug);
    const detailContent = {
      features: detail.features,
      benefits: detail.benefits,
      whyPlay: detail.whyPlay ?? [],
      howPlay: detail.howPlay ?? [],
      returnPolicy: detail.returnPolicy ?? "",
      specs: detail.specs ?? {},
      deliveryEstimate: detail.deliveryEstimate,
      videoUrl: detail.videoUrl ?? null,
    };
```

and in the `.upsert({ … })` object set:

```ts
    description: detail.description || null,
    detail_content: detailContent,
    gallery_urls: detail.imageSrcs,
```

(If the seed also upserts gift kits/cards through a separate list, leave their `detail_content`/`gallery_urls` unset/null — only the shelf `products` array gets seeded content.)

- [ ] **Step 3 — (after user applies 0007) run `npm run db:seed`;** spot-check via REST that a known product has content:

```bash
URL="https://qbvymmzraatzcewiztve.supabase.co"; SECRET=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2)
curl -s -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" \
  "$URL/rest/v1/products?select=slug,description,gallery_urls,detail_content&slug=eq.neem-rattle-set"
```
Expected: `detail_content` has the features/benefits/specs; `gallery_urls` is a non-empty array.

- [ ] **Step 4 — commit** `feat(pdp): migration 0007 + seed detail_content & gallery_urls`.

---

## Task 2: `DetailContent` type + `rowToProductDetail` + `getProductDetail` (TDD)

**Files:** Modify `src/lib/types.ts`. Create `src/lib/data/product-detail.ts`, `src/lib/data/product-detail.test.ts`.

**Interfaces:**
- Produces: `DetailContent` type; `rowToProductDetail(row, opts): ProductDetail` (pure); `getProductDetail(slug): Promise<ProductDetail>` (server, cached, fail-soft).

- [ ] **Step 1 — `DetailContent` in `src/lib/types.ts`** (after `ProductDetail`):

```ts
/** The admin-editable subset of ProductDetail stored in `products.detail_content`
 *  (jsonb). description lives in its own column; reviews/saleCountdown/gallery are
 *  handled outside this object. */
export type DetailContent = {
  features: string[];
  benefits: string[];
  whyPlay: string[];
  howPlay: string[];
  returnPolicy: string;
  specs: ProductSpecs;
  deliveryEstimate: string;
  videoUrl: string | null;
};
```

- [ ] **Step 2 — write the failing test.** `src/lib/data/product-detail.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rowToProductDetail } from "./product-detail";
import type { Review } from "@/lib/types";

const reviews: Review[] = [{ id: "r", nameBn: "N", rating: 5, dateBn: "now", bodyBn: "b" }];
const dc = {
  features: ["f1", "f2"], benefits: ["b1"], whyPlay: ["w1"], howPlay: ["h1"],
  returnPolicy: "RP", specs: { materials: "wood" }, deliveryEstimate: "1-2 days",
  videoUrl: "https://youtu.be/x",
};

describe("rowToProductDetail", () => {
  it("maps detail_content + description + gallery + injected reviews", () => {
    const d = rowToProductDetail(
      { slug: "p", description: "DESC", detail_content: dc, gallery_urls: ["/a.jpg", "/b.jpg"], image_url: null },
      { reviews, fallbackImages: ["/mock.jpg"] },
    );
    expect(d.slug).toBe("p");
    expect(d.description).toBe("DESC");
    expect(d.features).toEqual(["f1", "f2"]);
    expect(d.specs).toEqual({ materials: "wood" });
    expect(d.imageSrcs).toEqual(["/a.jpg", "/b.jpg"]); // gallery_urls wins
    expect(d.reviews).toBe(reviews);
    expect(d.videoUrl).toBe("https://youtu.be/x");
    expect(typeof d.saleCountdown).toBe("string"); // default constant
  });

  it("falls back gallery: image_url when gallery_urls empty, then fallbackImages", () => {
    expect(
      rowToProductDetail({ slug: "p", description: "", detail_content: dc, gallery_urls: [], image_url: "/up.jpg" },
        { reviews: [], fallbackImages: ["/mock.jpg"] }).imageSrcs,
    ).toEqual(["/up.jpg"]);
    expect(
      rowToProductDetail({ slug: "p", description: "", detail_content: dc, gallery_urls: null, image_url: null },
        { reviews: [], fallbackImages: ["/mock.jpg"] }).imageSrcs,
    ).toEqual(["/mock.jpg"]);
  });
});
```

- [ ] **Step 3 — run it — expect FAIL** (`rowToProductDetail` not defined).
Run: `npx vitest run src/lib/data/product-detail.test.ts` → FAIL.

- [ ] **Step 4 — implement `src/lib/data/product-detail.ts`:**

```ts
import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { productDetailBySlug, basicProductDetail } from "@/lib/mock/products";
import type { DetailContent, ProductDetail, Review } from "@/lib/types";

/** Promo countdown is not admin-editable this slice — a fixed default. */
const DEFAULT_SALE_COUNTDOWN = "1D 12H 00M 00S";

type ProductDetailRow = {
  slug: string;
  description: string | null;
  detail_content: DetailContent | null;
  gallery_urls: string[] | null;
  image_url: string | null;
};

/** Pure: build the app `ProductDetail` from a DB row that HAS detail_content.
 *  Gallery precedence: gallery_urls → [image_url] → fallbackImages (mock). */
export function rowToProductDetail(
  row: Omit<ProductDetailRow, "detail_content"> & { detail_content: DetailContent },
  opts: { reviews: Review[]; fallbackImages: string[] },
): ProductDetail {
  const dc = row.detail_content;
  const gallery =
    row.gallery_urls && row.gallery_urls.length > 0
      ? row.gallery_urls
      : row.image_url
        ? [row.image_url]
        : opts.fallbackImages;
  return {
    slug: row.slug,
    description: row.description ?? "",
    features: dc.features ?? [],
    benefits: dc.benefits ?? [],
    imageSrcs: gallery,
    deliveryEstimate: dc.deliveryEstimate ?? "",
    saleCountdown: DEFAULT_SALE_COUNTDOWN,
    whyPlay: dc.whyPlay ?? [],
    howPlay: dc.howPlay ?? [],
    returnPolicy: dc.returnPolicy ?? "",
    specs: dc.specs ?? {},
    reviews: opts.reviews,
    videoUrl: dc.videoUrl ?? undefined,
  };
}

/** Uncached read: DB detail (fail-soft to mock). */
async function readProductDetail(slug: string): Promise<ProductDetail> {
  const mock = productDetailBySlug(slug) ?? basicProductDetail(slug);
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("slug, description, detail_content, gallery_urls, image_url")
      .eq("slug", slug)
      .maybeSingle()
      .overrideTypes<ProductDetailRow, { merge: false }>();
    if (error) throw error;
    if (!data || !data.detail_content) return mock; // unseeded / gift kit → mock
    return rowToProductDetail(
      { ...data, detail_content: data.detail_content },
      { reviews: mock.reviews ?? [], fallbackImages: mock.imageSrcs },
    );
  } catch (err) {
    console.error(`getProductDetail(${slug}) failed; mock fallback:`, err);
    return mock;
  }
}

/** Cached per-slug, tagged `catalog` so an admin save refreshes the PDP. */
export function getProductDetail(slug: string): Promise<ProductDetail> {
  return unstable_cache(() => readProductDetail(slug), ["product-detail", slug], {
    tags: ["catalog"],
    revalidate: 3600,
  })();
}
```

- [ ] **Step 5 — run it — expect PASS.** `npx vitest run src/lib/data/product-detail.test.ts` → PASS. Then `npx tsc --noEmit`.

- [ ] **Step 6 — commit** `feat(pdp): getProductDetail DB read + rowToProductDetail mapper (TDD)`.

---

## Task 3: PDP uses `getProductDetail`; gallery source in the view

**Files:** Modify `src/app/products/[slug]/page.tsx`, `src/components/product/product-details-view.tsx`.

**Interfaces:** Consumes `getProductDetail` (Task 2).

- [ ] **Step 1 — page.tsx.** Add `import { getProductDetail } from "@/lib/data/product-detail";`. Replace the detail load (currently `const detail = productDetailBySlug(slug) ?? basicProductDetail(slug, product.description);`) with:

```ts
  const detail = await getProductDetail(slug);
```

In `generateMetadata`, replace the `productDetailBySlug(slug)?.description ?? …` expression with the product's description or the fetched detail — simplest: keep using `product.description` if present, else `(await getProductDetail(slug)).description`. (If `productDetailBySlug`/`basicProductDetail` become unused in this file, drop those imports.)

- [ ] **Step 2 — product-details-view.tsx.** The gallery precedence now lives in `getProductDetail`, so the view uses `detail.imageSrcs` directly. Change the `ProductGallery` usage (currently `images={product.imageUrl ? [product.imageUrl] : detail.imageSrcs}`) to:

```tsx
        <ProductGallery
          images={detail.imageSrcs}
          imageLabel={product.imageLabelBn}
          imageTones={product.imageTones}
        />
```

- [ ] **Step 3 — verify.** `npx tsc --noEmit && npm run build`. After 0007+seed (Task 1) applied, live-check a seeded product renders identically (features/benefits/tabs/specs/gallery) — controller runs this.

- [ ] **Step 4 — commit** `feat(pdp): product page reads editorial + gallery from the DB`.

---

## Task 4: Admin write path — detail_content + gallery actions + queries

**Files:** Modify `src/lib/admin/actions.ts`, `src/lib/admin/queries.ts`.

**Interfaces:**
- Produces: `ProductPatch.detailContent?` + `CreateProductInput.detailContent?`; `updateProduct`/`createProduct` write `detail_content`; `uploadGalleryImage(slug, formData)`, `removeGalleryImage(slug, url)`, `reorderGallery(slug, urls)`; `getAdminProductBySlug` returns `detailContent` + `galleryUrls`; `AdminProductDetail` gains them.

- [ ] **Step 1 — READ Next docs** for server actions + FormData if needed, then implement.

- [ ] **Step 2 — actions.ts: a validating shaper.** Add `DetailContent` to this file's type imports (`import type { DetailContent } from "@/lib/types";`), then add near the other helpers:

```ts
/** Shape + sanitize an admin-supplied DetailContent: trim strings, drop empty
 *  list rows, coerce specs to the 5 known keys, videoUrl to null or an https URL. */
function cleanDetailContent(input: unknown): DetailContent | null {
  if (input == null || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter((x) => x !== "") : [];
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const specsIn = (i.specs ?? {}) as Record<string, unknown>;
  const video = str(i.videoUrl);
  return {
    features: list(i.features),
    benefits: list(i.benefits),
    whyPlay: list(i.whyPlay),
    howPlay: list(i.howPlay),
    returnPolicy: str(i.returnPolicy),
    specs: {
      materials: str(specsIn.materials),
      safety: str(specsIn.safety),
      weight: str(specsIn.weight),
      dimensions: str(specsIn.dimensions),
      ageRange: str(specsIn.ageRange),
    },
    deliveryEstimate: str(i.deliveryEstimate),
    videoUrl: video === "" ? null : video,
  };
}
```

- [ ] **Step 3 — actions.ts: write detail_content.** Add `detailContent?: DetailContent | null;` to `ProductPatch` and to `CreateProductInput`. Extend `ProductsUpdateExt` (Slice 3a) and `ProductsInsertExt` with `detail_content?: DetailContent | null;` (and, harmlessly, `gallery_urls?: string[] | null;`). In `updateProduct`, after the existing field handling:

```ts
  if (patch.detailContent !== undefined) {
    productUpdate.detail_content = patch.detailContent === null ? null : cleanDetailContent(patch.detailContent);
  }
```

In `createProduct`, in the `insertRow` object add:

```ts
    detail_content: input.detailContent ? cleanDetailContent(input.detailContent) : null,
```

(The `.update()`/`.insert()` call sites already cast `as unknown as …Update/Insert` from Slice 3a — keep that.)

- [ ] **Step 4 — actions.ts: gallery upload helper refactor.** Extract the bucket-upload core so gallery and single-image share it. Add:

```ts
/** Upload a validated image to the public product-images bucket; return its
 *  https URL. Does NOT write any product column — callers decide (image_url vs
 *  gallery_urls). */
async function uploadImageToBucket(
  db: AdminDb, slug: string, file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size === 0) return { ok: false, error: "No image file provided." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "File must be an image." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Image must be 5 MB or smaller." };
  const ext = extFromType(file.type);
  if (!ext) return { ok: false, error: `Unsupported image type: ${file.type}` };
  const objectPath = `${slug}/${Date.now()}-${Math.round(file.size)}.${ext}`;
  const { error: uploadErr } = await db.storage
    .from("product-images").upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadErr) return { ok: false, error: uploadErr.message };
  const { data: pub } = db.storage.from("product-images").getPublicUrl(objectPath);
  if (!pub.publicUrl?.startsWith("https")) return { ok: false, error: "Storage returned a non-https URL." };
  return { ok: true, url: pub.publicUrl };
}
```

Refactor `putProductImage` to call `uploadImageToBucket` then set `image_url` (keep its external behavior identical). NOTE: `objectPath` must stay unique — the original used `${Date.now()}.${ext}`; `Date.now()` is fine in a server action (only `unstable_cache`/build-time forbids it — server actions run per-request). Keep `Date.now()`.

- [ ] **Step 5 — actions.ts: gallery actions.** Add:

```ts
/** Read the current gallery_urls for a slug (empty array if none). */
async function readGallery(db: AdminDb, slug: string): Promise<string[]> {
  const { data } = await db.from("products").select("gallery_urls").eq("slug", slug).maybeSingle()
    .overrideTypes<{ gallery_urls: string[] | null }, { merge: false }>();
  return data?.gallery_urls ?? [];
}

async function writeGallery(db: AdminDb, slug: string, urls: string[]): Promise<ActionResult> {
  const { error } = await db.from("products")
    .update({ gallery_urls: urls } as unknown as Database["public"]["Tables"]["products"]["Update"])
    .eq("slug", slug);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function uploadGalleryImage(
  slug: string, formData: FormData,
): Promise<{ ok: true; url: string; gallery: string[] } | { ok: false; error: string }> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No image file provided." };
  const db = createAdminSupabase();
  const up = await uploadImageToBucket(db, slug, file);
  if (!up.ok) return up;
  const gallery = [...(await readGallery(db, slug)), up.url];
  const w = await writeGallery(db, slug, gallery);
  if (!w.ok) return w;
  revalidateStorefront(slug);
  return { ok: true, url: up.url, gallery };
}

export async function removeGalleryImage(slug: string, url: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const gallery = (await readGallery(db, slug)).filter((u) => u !== url);
  const w = await writeGallery(db, slug, gallery);
  if (w.ok) revalidateStorefront(slug);
  return w;
}

export async function reorderGallery(slug: string, urls: string[]): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
    return { ok: false, error: "Invalid gallery order." };
  }
  const db = createAdminSupabase();
  // Only persist a permutation of the existing set (never inject arbitrary URLs).
  const current = new Set(await readGallery(db, slug));
  if (urls.length !== current.size || urls.some((u) => !current.has(u))) {
    return { ok: false, error: "Gallery order does not match current images." };
  }
  const w = await writeGallery(db, slug, urls);
  if (w.ok) revalidateStorefront(slug);
  return w;
}
```

- [ ] **Step 6 — queries.ts.** Add to `AdminProductDetail`: `detailContent: DetailContent | null;` and `galleryUrls: string[];`. Add to `AdminProductDetailRow`: `detail_content: DetailContent | null;` and `gallery_urls: string[] | null;`. In `getAdminProductBySlug`, add `detail_content, gallery_urls` to the `.select(...)` string and map: `detailContent: data.detail_content,` and `galleryUrls: data.gallery_urls ?? [],`. Import `DetailContent` from `@/lib/types`.

- [ ] **Step 7 — verify.** `npx tsc --noEmit && npx vitest run && npm run build`. Commit `feat(admin): write detail_content + gallery upload/remove/reorder actions`.

---

## Task 5: Reusable editors — `array-move` (TDD), `StringListEditor`, `GalleryEditor`

**Files:** Create `src/lib/array-move.ts` (+ `.test.ts`), `src/components/admin/string-list-editor.tsx`, `src/components/admin/gallery-editor.tsx`.

**Interfaces:**
- Produces: `moveInArray(arr, index, delta): T[]`; `<StringListEditor label value onChange addLabel? />`; `<GalleryEditor slug images onChange />`.

- [ ] **Step 1 — TDD `array-move`.** `src/lib/array-move.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { moveInArray } from "./array-move";

describe("moveInArray", () => {
  it("moves an item by delta, returning a new array", () => {
    expect(moveInArray(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveInArray(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
  });
  it("clamps at the ends (no-op)", () => {
    expect(moveInArray(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveInArray(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
```

Run → FAIL. Implement `src/lib/array-move.ts`:

```ts
/** Return a copy of `arr` with the item at `index` shifted by `delta`
 *  positions. Out-of-range targets clamp to a no-op. Pure. */
export function moveInArray<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= arr.length || target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
```

Run → PASS.

- [ ] **Step 2 — `StringListEditor`** (`"use client"`). A labeled editor for a `string[]`: one text input per row with ▲/▼/✕ controls and an "Add" button. Fully controlled via `value`/`onChange`.

```tsx
"use client";

import { Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { moveInArray } from "@/lib/array-move";

export function StringListEditor({
  label, value, onChange, addLabel = "Add item", placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  placeholder?: string;
}) {
  const setAt = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      <div className="mt-1 space-y-2">
        {value.map((row, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input value={row} placeholder={placeholder} onChange={(e) => setAt(i, e.target.value)} />
            <Button type="button" variant="outline" size="icon" aria-label="Move up"
              onClick={() => onChange(moveInArray(value, i, -1))} disabled={i === 0}>
              <ArrowUp className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Move down"
              onClick={() => onChange(moveInArray(value, i, 1))} disabled={i === value.length - 1}>
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Remove"
              onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, ""])}>
          <Plus className="size-4" /> {addLabel}
        </Button>
      </div>
    </div>
  );
}
```

(If `Button` has no `size="icon"` variant, use `className="size-9 p-0"` instead — check `src/components/ui/button.tsx` first.)

- [ ] **Step 3 — `GalleryEditor`** (`"use client"`). Shows current gallery thumbnails with reorder/remove, plus a multi-file upload. Calls the Task-4 actions and reports the new list up via `onChange`.

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moveInArray } from "@/lib/array-move";
import { uploadGalleryImage, removeGalleryImage, reorderGallery } from "@/lib/admin/actions";

export function GalleryEditor({
  slug, images, onChange,
}: {
  slug: string;
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [reordering, setReordering] = useState(false);

  const handleUpload = () => {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) return toast.error("Choose image(s) first.");
    start(async () => {
      let latest = images;
      for (const file of files) {
        const fd = new FormData();
        fd.set("file", file);
        const r = await uploadGalleryImage(slug, fd);
        if (r.ok) { latest = r.gallery; onChange(r.gallery); }
        else { toast.error(r.error); break; }
      }
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Gallery updated.");
    });
  };

  const remove = (url: string) =>
    start(async () => {
      const r = await removeGalleryImage(slug, url);
      if (r.ok) { onChange(images.filter((u) => u !== url)); toast.success("Image removed."); }
      else toast.error(r.error);
    });

  const move = (i: number, delta: number) => {
    const next = moveInArray(images, i, delta);
    if (next === images) return;
    onChange(next);
    setReordering(true);
    start(async () => {
      const r = await reorderGallery(slug, next);
      setReordering(false);
      if (!r.ok) { toast.error(r.error); onChange(images); }
    });
  };

  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Gallery images</span>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((url, i) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-cream-300 bg-cream-50">
            <Image src={url} alt="" fill sizes="120px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/50 p-1">
              <button type="button" aria-label="Move left" disabled={i === 0 || busy}
                onClick={() => move(i, -1)} className="text-paper disabled:opacity-40"><ArrowLeft className="size-4" /></button>
              <button type="button" aria-label="Move right" disabled={i === images.length - 1 || busy}
                onClick={() => move(i, 1)} className="text-paper disabled:opacity-40"><ArrowRight className="size-4" /></button>
              <button type="button" aria-label="Remove" disabled={busy}
                onClick={() => remove(url)} className="text-paper disabled:opacity-40"><X className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="mt-2 block w-full text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-cream-300 file:bg-cream-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-cream-200" />
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleUpload} disabled={busy}>
        <Upload className="size-4" /> {busy ? "Working…" : reordering ? "Saving order…" : "Upload image(s)"}
      </Button>
    </div>
  );
}
```

NOTE: `next/image` needs the Supabase Storage host in `images.remotePatterns` (`next.config.*`). If the config doesn't already allow the `*.supabase.co` host (Slice 1's single upload also renders admin images), add it. Check the config first; if single-image admin previews already render Storage URLs, no change is needed.

- [ ] **Step 4 — verify + commit.** `npx vitest run src/lib/array-move.test.ts` (PASS), `npx tsc --noEmit`. Commit `feat(admin): reusable StringListEditor + GalleryEditor + moveInArray (TDD)`.

---

## Task 6: Wire the "Content" section into the edit + create forms

**Files:** Modify `src/components/admin/product-edit-form.tsx`, `src/components/admin/product-create-form.tsx`.

**Interfaces:** Consumes `StringListEditor`, `GalleryEditor` (Task 5); `AdminProductDetail.detailContent`/`galleryUrls`, `ProductPatch.detailContent`, `CreateProductInput.detailContent` (Task 4).

- [ ] **Step 1 — edit form state.** Import the editors + `DetailContent`. Seed state from `product.detailContent` (fall back to empty) and `product.galleryUrls`:

```tsx
import { StringListEditor } from "@/components/admin/string-list-editor";
import { GalleryEditor } from "@/components/admin/gallery-editor";
import type { DetailContent } from "@/lib/types";
// …
  const dc = product.detailContent;
  const [features, setFeatures] = useState<string[]>(dc?.features ?? []);
  const [benefits, setBenefits] = useState<string[]>(dc?.benefits ?? []);
  const [whyPlay, setWhyPlay] = useState<string[]>(dc?.whyPlay ?? []);
  const [howPlay, setHowPlay] = useState<string[]>(dc?.howPlay ?? []);
  const [returnPolicy, setReturnPolicy] = useState(dc?.returnPolicy ?? "");
  const [deliveryEstimate, setDeliveryEstimate] = useState(dc?.deliveryEstimate ?? "");
  const [videoUrl, setVideoUrl] = useState(dc?.videoUrl ?? "");
  const [specMaterials, setSpecMaterials] = useState(dc?.specs?.materials ?? "");
  const [specSafety, setSpecSafety] = useState(dc?.specs?.safety ?? "");
  const [specWeight, setSpecWeight] = useState(dc?.specs?.weight ?? "");
  const [specDimensions, setSpecDimensions] = useState(dc?.specs?.dimensions ?? "");
  const [specAgeRange, setSpecAgeRange] = useState(dc?.specs?.ageRange ?? "");
  const [gallery, setGallery] = useState<string[]>(product.galleryUrls ?? []);
```

- [ ] **Step 2 — edit form: include detailContent in the save patch.** In `handleSave`, before calling `updateProduct`, add:

```tsx
    const detailContent: DetailContent = {
      features, benefits, whyPlay, howPlay,
      returnPolicy, deliveryEstimate,
      videoUrl: videoUrl.trim() === "" ? null : videoUrl.trim(),
      specs: {
        materials: specMaterials, safety: specSafety, weight: specWeight,
        dimensions: specDimensions, ageRange: specAgeRange,
      },
    };
    patch.detailContent = detailContent;
```

- [ ] **Step 3 — edit form: the Content card JSX.** Add a new `Card` after the existing "Details" card (inside the same left column), rendering the editors:

```tsx
        <Card className="border-cream-300">
          <CardHeader><CardTitle>Content</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <StringListEditor label="Features" value={features} onChange={setFeatures} addLabel="Add feature" />
            <StringListEditor label="Benefits" value={benefits} onChange={setBenefits} addLabel="Add benefit" />
            <StringListEditor label="Why play (tab)" value={whyPlay} onChange={setWhyPlay} addLabel="Add point" />
            <StringListEditor label="How to play (tab)" value={howPlay} onChange={setHowPlay} addLabel="Add step" />
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Return policy</span>
              <textarea value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} rows={3}
                className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block"><span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Delivery estimate</span>
                <Input value={deliveryEstimate} onChange={(e) => setDeliveryEstimate(e.target.value)} className="mt-1" /></label>
              <label className="block"><span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Video URL (YouTube)</span>
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" className="mt-1" /></label>
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Specs</span>
              <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input value={specMaterials} onChange={(e) => setSpecMaterials(e.target.value)} placeholder="Materials" />
                <Input value={specSafety} onChange={(e) => setSpecSafety(e.target.value)} placeholder="Safety" />
                <Input value={specWeight} onChange={(e) => setSpecWeight(e.target.value)} placeholder="Weight" />
                <Input value={specDimensions} onChange={(e) => setSpecDimensions(e.target.value)} placeholder="Dimensions" />
                <Input value={specAgeRange} onChange={(e) => setSpecAgeRange(e.target.value)} placeholder="Age range" />
              </div>
            </div>
            <GalleryEditor slug={product.slug} images={gallery} onChange={setGallery} />
          </CardContent>
        </Card>
```

- [ ] **Step 4 — create form.** Mirror Steps 1–3 with empty initial state (`[]`/`""`). The gallery differs: a NEW product has no slug row yet until `createProduct` runs, so the `GalleryEditor` (which uploads to a slug) can't be used pre-create. **Create-form gallery:** omit `GalleryEditor` from the create form; instead reuse the existing single-image upload the create form already has, and show a note "Add more gallery images after creating, from the edit page." Pass `detailContent` (features/benefits/tabs/specs/policy/delivery/video) into the `createProduct(input)` call. (Everything except gallery is available pre-create.)

- [ ] **Step 5 — verify (drive it, real admin session; 0007 + seed applied).** Edit a seeded product's features/spec/return-policy → Save → PDP reflects. Add/remove/reorder gallery images → PDP gallery updates. Create a new product with content → its PDP shows it; then add gallery from the edit page. Non-admin rejected (actions re-check). `npx tsc --noEmit && npx vitest run && npm run build`. Controller runs the live checks.

- [ ] **Step 6 — commit** `feat(admin): Content section — edit PDP editorial + gallery`.

---

## Final verification

- [ ] `npx vitest run` all green; `npx tsc --noEmit && npm run build` clean; storefront static/ISR intact (PDP `/products/[slug]` was already dynamic ƒ — unchanged).
- [ ] End-to-end (0007 + seed applied, real admin session): seeded product PDP renders identically off DB; editing content + gallery reflects after save; new product content works; gift-kit PDP still renders (dynamic fallback); DB read failure → mock fallback.
- [ ] Open a PR to `master`; ensure the Vercel preview build is green (set the 5 per-branch Supabase preview env vars for this branch if the build reports `supabaseUrl is required`, then redeploy — same as prior slices).

## Self-Review (done during authoring)

- **Spec coverage:** schema+seed → T1; getProductDetail+mapper+fail-soft → T2; PDP wiring+gallery source → T3; detail write + gallery actions + queries → T4; reusable editors → T5; forms Content section → T6. Reviews/saleCountdown/global strips untouched; gift kits keep null→fallback.
- **Placeholder scan:** none — real code/commands throughout. (The one deliberate NOTE in T4 Step 2 corrects the import path inline.)
- **Type consistency:** `DetailContent{features,benefits,whyPlay,howPlay,returnPolicy,specs,deliveryEstimate,videoUrl}`, `rowToProductDetail(row,{reviews,fallbackImages})`, `getProductDetail(slug)`, `ProductPatch.detailContent`/`CreateProductInput.detailContent`, `AdminProductDetail.detailContent`/`galleryUrls`, gallery actions `uploadGalleryImage`/`removeGalleryImage`/`reorderGallery`, `moveInArray(arr,index,delta)` — consistent across tasks.
- **DB-types caveat** flagged in Global Constraints; narrow-cast/`.overrideTypes()` reused (not regeneration).
