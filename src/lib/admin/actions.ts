"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

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

/** Operational (overlay) fields an admin may edit in Slice 1. Structural
 *  fields (title/category/age-tier/description) stay read-only until the
 *  catalog moves to the DB. All keys optional — only supplied ones are written. */
export type ProductPatch = {
  price?: number;
  compare_at_price?: number | null;
  stock_qty?: number;
  low_stock_threshold?: number;
  preorder_ship_date?: string | null;
  active?: boolean;
  badge?: ProductBadge | null;
};

/** Non-negative safe integer (BDT is stored as whole Taka; quantities are counts). */
function isNonNegativeInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

/** Accept `YYYY-MM-DD` that round-trips to a real calendar date. */
function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Storefront paths whose cached data derives from the products overlay. Kept
 *  best-effort — the dynamic collection route is refreshed by pattern. */
function revalidateStorefront(slug: string): void {
  revalidateTag("products", "max");
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
export async function updateProduct(slug: string, patch: ProductPatch): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  const productUpdate: Database["public"]["Tables"]["products"]["Update"] = {};
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

  if (Object.keys(productUpdate).length > 0) {
    const { error } = await db.from("products").update(productUpdate).eq("slug", slug);
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
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No image file provided." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File must be an image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }
  const ext = extFromType(file.type);
  if (!ext) {
    return { ok: false, error: `Unsupported image type: ${file.type}` };
  }

  const db = createAdminSupabase();
  const objectPath = `${slug}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await db.storage
    .from("product-images")
    .upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data: pub } = db.storage.from("product-images").getPublicUrl(objectPath);
  const url = pub.publicUrl;
  if (!url || !url.startsWith("https")) {
    return { ok: false, error: "Storage returned a non-https public URL." };
  }

  // `products.image_url` ships in migration 0004 (applied) but the checked-in
  // generated `database.types.ts` predates it, so this one column isn't in the
  // typed `Update`. Cast narrowly rather than hand-edit generated types.
  const { error: updateErr } = await db
    .from("products")
    .update({ image_url: url } as unknown as Database["public"]["Tables"]["products"]["Update"])
    .eq("slug", slug);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidateStorefront(slug);
  return { ok: true, url };
}
