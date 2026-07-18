"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { DetailContent } from "@/lib/types";
import type { Settings } from "@/lib/data/settings-shape";

/** Mirrors the `orders.status` check constraint (`supabase/migrations/0001_init.sql`). */
const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Update an order's status. Server Action — reachable directly (not just via
 * the admin UI), so it re-checks admin itself rather than trusting the
 * `src/proxy.ts` gate or the admin layout's re-check.
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  if (!isOrderStatus(status)) {
    return { ok: false, error: `Invalid status: ${status}` };
  }

  const db = createAdminSupabase();
  const { error } = await db.from("orders").update({ status }).eq("id", orderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return { ok: true };
}

/** Badges allowed on a product — mirrors the storefront `Product["badge"]`
 *  union (`src/lib/types.ts`). `null` clears the badge. */
const PRODUCT_BADGES = ["New", "Best Seller", "Limited"] as const;
type ProductBadge = (typeof PRODUCT_BADGES)[number];

function isProductBadge(value: string): value is ProductBadge {
  return (PRODUCT_BADGES as readonly string[]).includes(value);
}

/** Fields an admin may edit. Operational (overlay) fields plus — now that the
 *  catalog is DB-sourced (Slice 2) — the STRUCTURAL fields
 *  (title/description/category/age-tier/badge) that reflect on the storefront.
 *  All keys optional — only supplied ones are written. */
export type ProductPatch = {
  price?: number;
  compare_at_price?: number | null;
  stock_qty?: number;
  low_stock_threshold?: number;
  preorder_ship_date?: string | null;
  preorder_delivery_date?: string | null;
  preorder_advance_pct?: number | null;
  active?: boolean;
  badge?: ProductBadge | null;
  // Structural (now editable, reflected on the storefront):
  title?: string;
  description?: string | null;
  category_slug?: string | null;
  age_tier_slug?: string | null;
  detailContent?: DetailContent | null;
};

/** Non-negative safe integer (BDT is stored as whole Taka; quantities are counts). */
function isNonNegativeInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

/** URL-safe slug: lowercase alphanumerics in dash-separated words, no leading/
 *  trailing/double dashes (mirrors how storefront slugs are shaped). */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type AdminDb = ReturnType<typeof createAdminSupabase>;

/** Does a taxonomy row (`categories` / `age_tiers`) with this slug exist? Used
 *  to validate `category_slug` / `age_tier_slug` before writing a product (the
 *  DB FK would reject a bad slug, but we want a clean error message, not a 500). */
async function taxonomySlugExists(
  db: AdminDb,
  table: "categories" | "age_tiers",
  slug: string,
): Promise<boolean> {
  const { data, error } = await db.from(table).select("slug").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

/** Accept `YYYY-MM-DD` that round-trips to a real calendar date. */
function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Shape + sanitize an admin-supplied DetailContent: trim strings, drop empty
 *  list rows, coerce specs to the 5 known keys, videoUrl to null or an https URL. */
function cleanDetailContent(input: unknown): DetailContent | null {
  if (input == null || typeof input !== "object") return null;
  const i = input as Record<string, unknown>;
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === "string").map((x) => x.trim()).filter((x) => x !== "") : [];
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
    videoUrl: video.startsWith("https") ? video : null,
  };
}

/** Invalidate the storefront's cached catalog after an admin write. The public
 *  catalog read (`getFullCatalog`) is now wrapped in `unstable_cache` tagged
 *  `"catalog"`, so `revalidateTag("catalog")` actually refreshes the cached
 *  reads that back the (now static/ISR) storefront pages — the old
 *  `revalidateTag("products")` was a no-op because nothing carried that tag.
 *  Also invalidate `"taxonomy"` since a product's category/age-tier assignment
 *  can change which collection it appears in. Admin paths are still refreshed
 *  explicitly (they render dynamically). */
function revalidateStorefront(slug: string): void {
  revalidateTag("catalog", "max");
  revalidateTag("taxonomy", "max");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${slug}`);
  revalidatePath(`/products/${slug}`);
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/");
}

/**
 * Update a product's OPERATIONAL fields (price / compare-at / stock /
 * low-stock threshold / pre-order date / active / badge). Server Action —
 * re-checks admin itself (the `src/proxy.ts` gate is not the only guard) and
 * validates every field before touching the DB. Writes span two tables:
 * `products` (price/compare_at_price/badge/active/preorder_ship_date) and
 * `inventory` (stock_qty/low_stock_threshold), via the service-role client.
 */
/** The generated `products` Update type predates the pre-order/image columns
 *  (see database.types note). Extend it locally rather than regenerate. */
type ProductsUpdateExt = Database["public"]["Tables"]["products"]["Update"] & {
  preorder_delivery_date?: string | null;
  preorder_advance_pct?: number | null;
  detail_content?: DetailContent | null;
  gallery_urls?: string[] | null;
};

export async function updateProduct(slug: string, patch: ProductPatch): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const productUpdate: ProductsUpdateExt = {};
  const inventoryUpdate: Database["public"]["Tables"]["inventory"]["Update"] = {};

  if (patch.price !== undefined) {
    if (!isNonNegativeInt(patch.price)) return { ok: false, error: "Price must be a non-negative whole number." };
    productUpdate.price = patch.price;
  }
  if (patch.compare_at_price !== undefined) {
    if (patch.compare_at_price !== null && !isNonNegativeInt(patch.compare_at_price)) {
      return { ok: false, error: "Compare-at price must be a non-negative whole number or empty." };
    }
    productUpdate.compare_at_price = patch.compare_at_price;
  }
  if (patch.preorder_ship_date !== undefined) {
    if (patch.preorder_ship_date !== null && !isValidDateStr(patch.preorder_ship_date)) {
      return { ok: false, error: "Pre-order ship date must be a valid YYYY-MM-DD date or empty." };
    }
    productUpdate.preorder_ship_date = patch.preorder_ship_date;
  }
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
  if (patch.active !== undefined) {
    if (typeof patch.active !== "boolean") return { ok: false, error: "Active must be true or false." };
    productUpdate.active = patch.active;
  }
  if (patch.badge !== undefined) {
    if (patch.badge !== null && !isProductBadge(patch.badge)) {
      return { ok: false, error: `Invalid badge: ${patch.badge}` };
    }
    productUpdate.badge = patch.badge;
  }
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title === "") return { ok: false, error: "Title is required." };
    productUpdate.title = title;
  }
  if (patch.description !== undefined) {
    const desc = patch.description === null ? null : patch.description.trim();
    productUpdate.description = desc === "" ? null : desc;
  }
  if (patch.stock_qty !== undefined) {
    if (!isNonNegativeInt(patch.stock_qty)) return { ok: false, error: "Stock must be a non-negative whole number." };
    inventoryUpdate.stock_qty = patch.stock_qty;
  }
  if (patch.low_stock_threshold !== undefined) {
    if (!isNonNegativeInt(patch.low_stock_threshold)) {
      return { ok: false, error: "Low-stock threshold must be a non-negative whole number." };
    }
    inventoryUpdate.low_stock_threshold = patch.low_stock_threshold;
  }

  const db = createAdminSupabase();

  // Structural taxonomy fields need an existence check (async) before writing —
  // a bad slug would otherwise be a raw FK-violation 500.
  if (patch.category_slug !== undefined) {
    if (patch.category_slug === null || patch.category_slug === "") {
      productUpdate.category_slug = null;
    } else {
      if (!(await taxonomySlugExists(db, "categories", patch.category_slug))) {
        return { ok: false, error: `Unknown category: ${patch.category_slug}` };
      }
      productUpdate.category_slug = patch.category_slug;
    }
  }
  if (patch.age_tier_slug !== undefined) {
    if (patch.age_tier_slug === null || patch.age_tier_slug === "") {
      productUpdate.age_tier_slug = null;
    } else {
      if (!(await taxonomySlugExists(db, "age_tiers", patch.age_tier_slug))) {
        return { ok: false, error: `Unknown age tier: ${patch.age_tier_slug}` };
      }
      productUpdate.age_tier_slug = patch.age_tier_slug;
    }
  }
  if (patch.detailContent !== undefined) {
    productUpdate.detail_content = patch.detailContent === null ? null : cleanDetailContent(patch.detailContent);
  }

  if (Object.keys(productUpdate).length > 0) {
    // `preorder_delivery_date`/`preorder_advance_pct` predate the generated
    // types (see `ProductsUpdateExt` above) — cast narrowly at the call site,
    // same pattern as the `image_url` cast in `putProductImage`.
    const { error } = await db
      .from("products")
      .update(productUpdate as unknown as Database["public"]["Tables"]["products"]["Update"])
      .eq("slug", slug);
    if (error) return { ok: false, error: error.message };
  }

  if (Object.keys(inventoryUpdate).length > 0) {
    // `inventory` is keyed by product_id, so resolve it from the slug first.
    const { data: prod, error: lookupErr } = await db
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (lookupErr) return { ok: false, error: lookupErr.message };
    if (!prod) return { ok: false, error: `Product not found: ${slug}` };

    const { error } = await db.from("inventory").update(inventoryUpdate).eq("product_id", prod.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidateStorefront(slug);
  return { ok: true };
}

/** ~5 MB cap on uploaded product photos. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Map an image MIME subtype to a file extension for the storage object key. */
function extFromType(type: string): string | null {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return null;
  }
}

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

/**
 * Validate + upload a product photo to the public `product-images` bucket and
 * point `products.image_url` at its public https URL. Shared by
 * `uploadProductImage` (edit form) and `createProduct` (new-product form). NO
 * admin re-check or revalidate here — callers own those (so `createProduct`
 * revalidates once, after the whole product exists). */
async function putProductImage(
  db: AdminDb,
  slug: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const up = await uploadImageToBucket(db, slug, file);
  if (!up.ok) return up;

  // `products.image_url` ships in migration 0004 (applied) but the checked-in
  // generated `database.types.ts` predates it, so this one column isn't in the
  // typed `Update`. Cast narrowly rather than hand-edit generated types.
  const { error: updateErr } = await db
    .from("products")
    .update({ image_url: up.url } as unknown as Database["public"]["Tables"]["products"]["Update"])
    .eq("slug", slug);
  if (updateErr) return { ok: false, error: updateErr.message };

  return { ok: true, url: up.url };
}

/**
 * Upload a product photo to the public `product-images` bucket and point
 * `products.image_url` at its public URL (which the storefront prefers over
 * the bundled `/images/products/<slug>/` files). Server Action — re-checks
 * admin, validates content-type + size, uploads via the service-role storage
 * client, and requires an `https` public URL before persisting.
 */
export async function uploadProductImage(
  slug: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No image file provided." };

  const db = createAdminSupabase();
  const result = await putProductImage(db, slug, file);
  if (result.ok) revalidateStorefront(slug);
  return result;
}

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
  if (
    urls.length !== current.size ||
    new Set(urls).size !== urls.length ||
    urls.some((u) => !current.has(u))
  ) {
    return { ok: false, error: "Gallery order does not match current images." };
  }
  const w = await writeGallery(db, slug, urls);
  if (w.ok) revalidateStorefront(slug);
  return w;
}

/** Fields required/accepted when creating a product. `image` is an optional
 *  photo File (passed straight through a Server Action — React serializes it).
 *  Prices/quantities are whole BDT / counts. */
export type CreateProductInput = {
  slug: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  categorySlug: string;
  ageTierSlug: string;
  stockQty?: number;
  lowStockThreshold?: number;
  badge?: ProductBadge | null;
  description?: string | null;
  preorderShipDate?: string | null;
  preorderDeliveryDate?: string | null;
  preorderAdvancePct?: number | null;
  image?: File | null;
  detailContent?: DetailContent | null;
};

/**
 * Create a new product (Slice 2). Server Action — re-checks admin FIRST, then
 * validates every field (slug unique + url-safe, sku/title required, price a
 * non-negative whole number, category + age-tier exist in the DB taxonomy).
 * Inserts the `products` row (active=true) and its `inventory` row; if a photo
 * was supplied, uploads it and sets `image_url`. Revalidates the catalog + admin
 * so the new product is visible on the storefront immediately.
 */
type ProductsInsertExt = Database["public"]["Tables"]["products"]["Insert"] & {
  preorder_ship_date?: string | null;
  preorder_delivery_date?: string | null;
  preorder_advance_pct?: number | null;
  detail_content?: DetailContent | null;
  gallery_urls?: string[] | null;
};

export async function createProduct(
  input: CreateProductInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const slug = input.slug.trim().toLowerCase();
  const sku = input.sku.trim();
  const title = input.title.trim();

  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: "Slug must be lowercase letters, numbers and single dashes." };
  }
  if (sku === "") return { ok: false, error: "SKU is required." };
  if (title === "") return { ok: false, error: "Title is required." };
  if (!isNonNegativeInt(input.price)) {
    return { ok: false, error: "Price must be a non-negative whole number." };
  }
  if (input.compareAtPrice != null && !isNonNegativeInt(input.compareAtPrice)) {
    return { ok: false, error: "Compare-at price must be a non-negative whole number or empty." };
  }
  const stockQty = input.stockQty ?? 0;
  if (!isNonNegativeInt(stockQty)) {
    return { ok: false, error: "Stock must be a non-negative whole number." };
  }
  const lowStockThreshold = input.lowStockThreshold ?? 0;
  if (!isNonNegativeInt(lowStockThreshold)) {
    return { ok: false, error: "Low-stock threshold must be a non-negative whole number." };
  }
  if (input.badge != null && !isProductBadge(input.badge)) {
    return { ok: false, error: `Invalid badge: ${input.badge}` };
  }
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

  const db = createAdminSupabase();

  if (!(await taxonomySlugExists(db, "categories", input.categorySlug))) {
    return { ok: false, error: `Unknown category: ${input.categorySlug}` };
  }
  if (!(await taxonomySlugExists(db, "age_tiers", input.ageTierSlug))) {
    return { ok: false, error: `Unknown age tier: ${input.ageTierSlug}` };
  }

  // Slug must be unique — check up front for a clean error (the unique index
  // would otherwise surface as a raw Postgres conflict).
  const { data: existing, error: dupErr } = await db
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (dupErr) return { ok: false, error: dupErr.message };
  if (existing) return { ok: false, error: `A product with slug "${slug}" already exists.` };

  const insertRow: ProductsInsertExt = {
    slug,
    sku,
    title,
    price: input.price,
    compare_at_price: input.compareAtPrice ?? null,
    category_slug: input.categorySlug,
    age_tier_slug: input.ageTierSlug,
    badge: input.badge ?? null,
    description: input.description?.trim() || null,
    preorder_ship_date: input.preorderShipDate ?? null,
    preorder_delivery_date: input.preorderDeliveryDate ?? null,
    preorder_advance_pct: input.preorderAdvancePct ?? null,
    image_label: title,
    image_tones: ["cream", "neem-soft"],
    active: true,
    detail_content: input.detailContent ? cleanDetailContent(input.detailContent) : null,
  };

  const { data: inserted, error: insertErr } = await db
    .from("products")
    .insert(insertRow as unknown as Database["public"]["Tables"]["products"]["Insert"])
    .select("id")
    .single();
  if (insertErr) return { ok: false, error: insertErr.message };

  const { error: invErr } = await db
    .from("inventory")
    .insert({ product_id: inserted.id, stock_qty: stockQty, low_stock_threshold: lowStockThreshold });
  if (invErr) {
    // Roll back the orphan product so a retry with the same slug isn't blocked.
    await db.from("products").delete().eq("id", inserted.id);
    return { ok: false, error: invErr.message };
  }

  if (input.image instanceof File && input.image.size > 0) {
    const imgResult = await putProductImage(db, slug, input.image);
    if (!imgResult.ok) {
      // The product exists and is valid without an image — surface the upload
      // error but keep the row (admin can retry the upload from the edit form).
      revalidateStorefront(slug);
      return { ok: false, error: `Product created, but image upload failed: ${imgResult.error}` };
    }
  }

  revalidateStorefront(slug);
  return { ok: true, slug };
}

/**
 * Soft-delete a product (Slice 2): set `active=false` so it disappears from the
 * storefront catalog while its row (and order history) is preserved. Server
 * Action — re-checks admin, then revalidates the catalog + admin.
 */
export async function softDeleteProduct(slug: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const db = createAdminSupabase();
  const { error } = await db.from("products").update({ active: false }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };

  revalidateStorefront(slug);
  return { ok: true };
}

/** Validate + persist store settings to the single `site_settings.general` row.
 *  Server Action — admin re-check + service-role. Money fields are non-negative
 *  integers; strings are trimmed. */
export async function updateSettings(next: Settings): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const ints = [
    next.shipping?.insideDhakaFee, next.shipping?.outsideDhakaFee,
    next.shipping?.freeShippingThreshold, next.codFee,
  ];
  if (ints.some((n) => !isNonNegativeInt(n))) {
    return { ok: false, error: "Fees and threshold must be non-negative whole numbers." };
  }
  const email = (next.contact?.email ?? "").trim();
  if (email !== "" && !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address or leave it blank." };
  }
  const value = {
    shipping: {
      insideDhakaFee: next.shipping.insideDhakaFee,
      outsideDhakaFee: next.shipping.outsideDhakaFee,
      freeShippingThreshold: next.shipping.freeShippingThreshold,
    },
    codFee: next.codFee,
    contact: {
      phone: (next.contact?.phone ?? "").trim(),
      whatsapp: (next.contact?.whatsapp ?? "").trim(),
      email,
      address: (next.contact?.address ?? "").trim(),
    },
    brand: {
      tagline: (next.brand?.tagline ?? "").trim(),
      description: (next.brand?.description ?? "").trim(),
    },
  };

  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert(
    { key: "general", value: value as unknown as Database["public"]["Tables"]["site_settings"]["Insert"]["value"] },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("settings", "max");
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/contact");
  revalidatePath("/admin/settings");
  return { ok: true };
}
