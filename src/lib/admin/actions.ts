"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getIsAdmin, getSessionUser } from "@/lib/auth/session";
import { getIsSuperAdmin, adminEnvEmails } from "@/lib/auth/roles";
import { wouldOrphanSupers } from "@/lib/auth/super-guard";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { DetailContent } from "@/lib/types";
import type { Settings } from "@/lib/data/settings-shape";
import { TAXONOMY_TABLES, validateTaxonomyInput, isPermutation, type TaxonomyKind } from "@/lib/admin/taxonomy";
import { validateBlogCategory } from "@/lib/admin/blog-taxonomy";
import { clampAdjust } from "@/lib/admin/inventory-status";
import { cleanTags } from "@/lib/blog/tags";
import { sanitizeBlogHtml } from "@/lib/blog/sanitize";
import { canTransition, timestampFieldFor, isOrderStatus, type OrderStatus } from "@/lib/orders/status-workflow";
import { sendOrderEmail } from "@/lib/email/send-order-email";
import { getAdminOrderById } from "@/lib/admin/queries";
import { ORDER_CARRIERS } from "@/lib/admin/order-constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Mirrors `UUID_RE` in `src/lib/admin/queries.ts` — kept local since actions.ts
 *  can't import that file's non-exported regex. */
const CUSTOMER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Look up an order's current status, narrowed to `OrderStatus` (null if the
 *  order doesn't exist or its status is somehow outside the known set). */
async function currentOrderStatus(db: ReturnType<typeof createAdminSupabase>, orderId: string): Promise<OrderStatus | null> {
  const { data } = await db.from("orders").select("status").eq("id", orderId)
    .maybeSingle().overrideTypes<{ status: string }, { merge: false }>();
  return data && isOrderStatus(data.status) ? data.status : null;
}

/** The signed-in admin's email for `order_status_history.changed_by`, or
 *  `"system"` if the session can't be resolved. */
async function actorEmail(): Promise<string> {
  const user = await getSessionUser();
  return user?.email ?? "system";
}

/** Append a row to `order_status_history`. New table (migration 0011) absent
 *  from the generated types — `as never` on the insert payload, same
 *  escape hatch used elsewhere in this file for post-generation tables. */
async function appendHistory(db: ReturnType<typeof createAdminSupabase>, orderId: string, status: string, note: string | null, by: string) {
  const { error } = await db
    .from("order_status_history")
    .insert({ order_id: orderId, status, note, changed_by: by } as never);
  // The order mutation already succeeded; a missing timeline row shouldn't fail the
  // action, but log it so a silently-dropped history entry is discoverable.
  if (error) console.error(`appendHistory failed for order ${orderId}:`, error.message);
}

/** Refresh the admin orders list + this order's detail page after a write. */
function revalidateOrder(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/** Fail-soft shipped/delivered/cancelled order-status email. Re-reads the
 *  order (for the customer's email + current carrier/tracking/status) rather
 *  than threading that data through every caller. No-ops silently if the
 *  order has no email on file. Never rethrows — a broken email send must
 *  never fail the admin action that already succeeded. */
async function emailOrder(orderId: string, kind: "shipped" | "delivered" | "cancelled") {
  try {
    const order = await getAdminOrderById(orderId);
    if (!order?.customerEmail) return;
    await sendOrderEmail(kind, {
      orderNumber: order.orderNumber, customerName: order.customerName, customerEmail: order.customerEmail,
      status: order.status,
      items: order.items.map((i) => ({ title: i.title, qty: i.qty, lineTotal: i.lineTotal })),
      subtotal: order.subtotal, deliveryFee: order.deliveryFee, advanceTotal: order.advanceTotal, total: order.total,
      carrier: order.carrier, trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl,
    });
  } catch (err) {
    console.error(`emailOrder(${kind}) failed:`, err);
  }
}

/**
 * Update an order's status. Server Action — reachable directly (not just via
 * the admin UI), so it re-checks admin itself rather than trusting the
 * `src/proxy.ts` gate or the admin layout's re-check. Routes through the
 * `status-workflow` transition table server-side (never trusts a client-
 * supplied transition) and rejects `cancelled` — cancelling goes through the
 * atomic `cancelOrder`/`cancel_order` RPC instead, which also restores stock.
 */
export async function updateOrderStatus(orderId: string, to: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!isOrderStatus(to)) return { ok: false, error: "Invalid status." };
  if (to === "cancelled") return { ok: false, error: "Use cancel to cancel an order." };
  const db = createAdminSupabase();
  const from = await currentOrderStatus(db, orderId);
  if (!from) return { ok: false, error: "Order not found." };
  if (!canTransition(from, to)) return { ok: false, error: `Cannot move ${from} → ${to}.` };
  const patch: Record<string, unknown> = { status: to };
  const ts = timestampFieldFor(to);
  if (ts) patch[ts] = new Date().toISOString();
  const { error } = await db.from("orders").update(patch as never).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await appendHistory(db, orderId, to, null, await actorEmail());
  revalidateOrder(orderId);
  if (to === "delivered") await emailOrder(orderId, "delivered");
  return { ok: true };
}

/**
 * Mark a `confirmed` order as `shipped`, recording the carrier + tracking
 * number (and optional tracking URL). Server Action — admin re-check,
 * validates the carrier against `ORDER_CARRIERS` and requires a non-empty
 * tracking number, guards the transition via `canTransition`, and appends a
 * history row noting the carrier/tracking.
 */
export async function shipOrder(
  orderId: string, input: { carrier: string; trackingNumber: string; trackingUrl?: string },
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const carrier = input.carrier.trim();
  const trackingNumber = input.trackingNumber.trim();
  if (!(ORDER_CARRIERS as readonly string[]).includes(carrier)) return { ok: false, error: "Invalid carrier." };
  if (!trackingNumber) return { ok: false, error: "Tracking number is required." };
  const trackingUrl = input.trackingUrl?.trim() || null;
  const db = createAdminSupabase();
  const from = await currentOrderStatus(db, orderId);
  if (!from) return { ok: false, error: "Order not found." };
  if (!canTransition(from, "shipped")) return { ok: false, error: `Cannot ship from ${from}.` };
  const { error } = await db.from("orders").update({
    status: "shipped", shipped_at: new Date().toISOString(),
    carrier, tracking_number: trackingNumber, tracking_url: trackingUrl,
  } as never).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await appendHistory(db, orderId, "shipped", `${carrier} · ${trackingNumber}`, await actorEmail());
  revalidateOrder(orderId);
  await emailOrder(orderId, "shipped");
  return { ok: true };
}

/**
 * Mark a Cash-on-Delivery order's payment as settled. Server Action — admin
 * re-check; blocks a cancelled order and a no-op re-mark of an already-
 * settled payment_status. Does not touch `orders.status` — payment and
 * fulfillment status are tracked independently.
 */
export async function markOrderPaid(orderId: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data } = await db.from("orders").select("status, payment_status").eq("id", orderId)
    .maybeSingle().overrideTypes<{ status: string; payment_status: string }, { merge: false }>();
  if (!data) return { ok: false, error: "Order not found." };
  if (data.status === "cancelled") return { ok: false, error: "Order is cancelled." };
  if (data.payment_status !== "pending") return { ok: false, error: "Already settled." };
  const { error } = await db.from("orders").update({
    payment_status: "paid", paid_at: new Date().toISOString(),
  } as never).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await appendHistory(db, orderId, data.status, "Marked paid", await actorEmail());
  revalidateOrder(orderId);
  return { ok: true };
}

/**
 * Cancel an order. Server Action — admin re-check; the actual cancel + stock
 * restore happens atomically in the `cancel_order` Postgres function
 * (migration 0011) so a concurrent order can't read stale inventory between
 * the status flip and the restock — this action is a thin, validated wrapper
 * around that RPC. The RPC itself appends the history row (with the reason
 * as its note) and enforces the `cannot_cancel_from` guard (only
 * pending/confirmed orders may be cancelled), which is mapped here to a
 * friendly message.
 */
export async function cancelOrder(orderId: string, reason: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { error } = await db.rpc("cancel_order" as never, {
    p_order_id: orderId, p_reason: reason.trim(), p_changed_by: await actorEmail(),
  } as never);
  if (error) {
    const msg = error.message.includes("cannot_cancel_from")
      ? "Only pending or confirmed orders can be cancelled." : error.message;
    return { ok: false, error: msg };
  }
  revalidateOrder(orderId);
  await emailOrder(orderId, "cancelled");
  return { ok: true };
}

/**
 * Add an internal note to an order's history without changing its status.
 * Server Action — admin re-check; rejects an empty/whitespace-only note and
 * caps length at 1000 chars. Appends a history row stamped with the order's
 * CURRENT status (the note doesn't represent a transition).
 */
export async function addOrderNote(orderId: string, note: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "Note is empty." };
  if (trimmed.length > 1000) return { ok: false, error: "Note too long." };
  const db = createAdminSupabase();
  const from = await currentOrderStatus(db, orderId);
  if (!from) return { ok: false, error: "Order not found." };
  await appendHistory(db, orderId, from, trimmed, await actorEmail());
  revalidateOrder(orderId);
  return { ok: true };
}

/** Correct a customer's contact + CRM fields (name required if provided; email
 *  optional + light-validated; status one of active/inactive/blocked; tags
 *  trimmed/deduped; notes trimmed + capped at 2000 chars). Phone (the unique
 *  identity key) is never editable. Server Action — admin re-check +
 *  service-role. Does not rewrite past orders' name/email snapshots. */
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
  // This writes an admin-supplied absolute value rather than reading-then-
  // adjusting, so it can still clobber a concurrent order's atomic decrement
  // (see adjustStock's race note below) — accepted at single-admin scale.
  const { error } = await db.from("inventory").update(update).eq("product_id", prod.id);
  if (error) return { ok: false, error: error.message };
  revalidateStorefront(slug);
  return { ok: true };
}

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
  // Read-modify-write: at single-admin scale a lost update vs. a concurrent
  // customer-order decrement is accepted (clampAdjust still guarantees ≥ 0;
  // the order path keeps its own atomic guarded decrement in place_order).
  const next = clampAdjust(inv?.stock_qty ?? 0, delta);
  const { error } = await db.from("inventory").update({ stock_qty: next }).eq("product_id", prod.id);
  if (error) return { ok: false, error: error.message };
  revalidateStorefront(slug);
  return { ok: true, stock: next };
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
 *  Server Action — super-admin re-check + service-role (Settings is gated to
 *  super admins only). Money fields are non-negative integers; strings are
 *  trimmed. */
export async function updateSettings(next: Settings): Promise<ActionResult> {
  if (!(await getIsSuperAdmin())) throw new Error("unauthorized");

  const ints = [
    next.shipping?.insideDhakaFee, next.shipping?.outsideDhakaFee,
    next.shipping?.freeShippingThreshold, next.codFee,
    next.customerTiers?.silver, next.customerTiers?.gold,
    next.preorder?.thresholdQty, next.preorder?.leadDays, next.preorder?.advancePct,
  ];
  if (ints.some((n) => !isNonNegativeInt(n))) {
    return { ok: false, error: "Fees and threshold must be non-negative whole numbers." };
  }
  if (next.customerTiers.gold < next.customerTiers.silver) {
    return { ok: false, error: "Gold tier threshold must be at least the Silver threshold." };
  }
  if (next.preorder.advancePct > 100) {
    return { ok: false, error: "Pre-order advance must be between 0 and 100." };
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
    // customerTiers was previously dropped here — a Save silently reset tiers to
    // defaults. Persist it (and the pre-order policy) so nothing is lost.
    customerTiers: { silver: next.customerTiers.silver, gold: next.customerTiers.gold },
    preorder: {
      enabled: next.preorder.enabled,
      thresholdQty: next.preorder.thresholdQty,
      leadDays: next.preorder.leadDays,
      advancePct: next.preorder.advancePct,
    },
  };

  const db = createAdminSupabase();
  const { error } = await db.from("site_settings").upsert(
    { key: "general", value: value as unknown as Database["public"]["Tables"]["site_settings"]["Insert"]["value"] },
    { onConflict: "key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidateTag("settings", "max");
  // The pre-order policy feeds product availability baked into the cached
  // catalog, so a Settings change must refresh it too.
  revalidateTag("catalog", "max");
  revalidatePath("/");
  revalidatePath("/checkout");
  revalidatePath("/contact");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Refresh the storefront taxonomy caches after a category/age-tier write. */
function revalidateTaxonomy(): void {
  revalidateTag("taxonomy", "max");
  revalidateTag("catalog", "max"); // catalog rows carry category/age-tier slugs used by collection views
  revalidatePath("/");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/admin/categories");
}

type TaxonomyWriteInput = { slug: string; title: string; tone: string; tagline: string | null; sort: number };

/**
 * Create a category or age-tier row. Server Action — re-checks admin, then
 * validates the input (slug required + url-safe on create) and rejects a
 * duplicate slug with a clean error before the DB's unique index would.
 */
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

/**
 * Update a category or age-tier row's title/tone/tagline/sort. Server Action
 * — re-checks admin; never writes `slug` (it's immutable once created, and is
 * used here only to locate the row).
 */
export async function updateTaxonomy(
  kind: TaxonomyKind, slug: string, patch: { title: string; tone: string; tagline: string | null; sort: number },
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const v = validateTaxonomyInput({ title: patch.title, tone: patch.tone, sort: patch.sort }, { requireSlug: false });
  if (!v.ok) return v;
  const { table } = TAXONOMY_TABLES[kind];
  const db = createAdminSupabase();
  const { data, error } = await db.from(table).update({
    title: patch.title.trim(), tone: patch.tone, tagline: patch.tagline?.trim() || null, sort: patch.sort,
  } as never).eq("slug", slug).select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This entry no longer exists." };
  revalidateTaxonomy();
  return { ok: true };
}

/**
 * Delete a category or age-tier row. Server Action — re-checks admin, then
 * FK-safe blocks the delete if any product still references this slug
 * (surfacing a clean "reassign them first" error rather than a raw FK
 * violation from the DB).
 */
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

/**
 * Persist a new display order for a taxonomy's rows. Server Action —
 * re-checks admin; guards that `slugs` is exactly a permutation of the
 * current row set (never trusts client-supplied order blindly) before
 * writing `sort = index` for each row.
 */
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

/** Fields an admin sets when creating/editing a blog post (Task 5). `coverImage`
 *  is a Storage https URL, set separately via `uploadBlogCover` — the form
 *  passes the returned URL back in here on create/update, this action never
 *  uploads a file itself. `coverTone`/`coverLabel` are optional cosmetic
 *  fallbacks the storefront placeholder art uses when there's no `coverImage`. */
export type BlogPostInput = {
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  category: string;
  author: string;
  coverImage?: string | null;
  coverTone?: string;
  coverLabel?: string;
  featured: boolean;
  published: boolean;
  /** Blog 3b (migration 0009): per-post SEO overrides. `focusKeyword` drives
   *  the editor's live SEO score; the other three override the storefront's
   *  auto-derived metadata (title/excerpt/coverImage) when set. */
  focusKeyword?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  /** Blog 3c (migration 0010): free-form tags + a future publish schedule.
   *  `scheduledAt` empty/absent → null (no schedule); a non-null value in the
   *  past is treated as already live by `isPostLive`/the storefront query. */
  tags?: string[];
  scheduledAt?: string | null;
};

/** Trim an admin-supplied SEO string; blank/absent → null (matches the
 *  column's nullable "unset" state, not an empty string). */
function cleanSeoField(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** Refresh the public blog (list + this post) and the admin list after a write. */
function revalidateBlog(slug: string): void {
  revalidateTag("blog", "max");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/blog");
}

/**
 * Create a blog post. Server Action — re-checks admin, validates slug/title,
 * and rejects a duplicate slug with a clean error before the DB's primary key
 * would. `blog_posts`'s current columns (migration 0008: `body` as text, plus
 * `cover_tone`/`cover_label`) predate the generated `database.types.ts` Insert
 * type, so the row is cast `as never` — same escape hatch used by the seed
 * script and `src/lib/data/blog.ts`/`src/lib/admin/queries.ts` elsewhere.
 */
export async function createBlogPost(input: { slug: string } & BlogPostInput): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const slug = input.slug.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return { ok: false, error: "Slug must be lowercase letters, numbers and single dashes." };
  if (input.title.trim() === "") return { ok: false, error: "Title is required." };
  const db = createAdminSupabase();
  const { data: existing } = await db.from("blog_posts").select("slug").eq("slug", slug).maybeSingle();
  if (existing) return { ok: false, error: `A post with slug "${slug}" already exists.` };
  const { error } = await db.from("blog_posts").insert({
    slug, title: input.title.trim(), excerpt: input.excerpt.trim(), body: sanitizeBlogHtml(input.bodyMarkdown),
    author: input.author.trim(), category: input.category || null, cover_image: input.coverImage ?? null,
    cover_tone: input.coverTone ?? "cream", cover_label: input.coverLabel ?? input.title.trim(),
    featured: input.featured, published: input.published,
    date_iso: new Date().toISOString().slice(0, 10),
    focus_keyword: cleanSeoField(input.focusKeyword), seo_title: cleanSeoField(input.seoTitle),
    meta_description: cleanSeoField(input.metaDescription), og_image: cleanSeoField(input.ogImage),
    tags: cleanTags(input.tags), scheduled_at: input.scheduledAt?.trim() ? input.scheduledAt : null,
  } as never);
  if (error) return { ok: false, error: error.message };
  revalidateBlog(slug);
  return { ok: true };
}

/**
 * Update a blog post's editable fields. Server Action — re-checks admin;
 * only supplied keys are written, and `slug` is never one of them (it's
 * immutable once created — used here only to locate the row).
 */
export async function updateBlogPost(slug: string, patch: Partial<BlogPostInput>): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) { if (patch.title.trim() === "") return { ok: false, error: "Title is required." }; update.title = patch.title.trim(); }
  if (patch.excerpt !== undefined) update.excerpt = patch.excerpt.trim();
  if (patch.bodyMarkdown !== undefined) update.body = sanitizeBlogHtml(patch.bodyMarkdown);
  if (patch.author !== undefined) update.author = patch.author.trim();
  if (patch.category !== undefined) update.category = patch.category || null;
  if (patch.coverImage !== undefined) update.cover_image = patch.coverImage;
  if (patch.featured !== undefined) update.featured = patch.featured;
  if (patch.published !== undefined) update.published = patch.published;
  if (patch.focusKeyword !== undefined) update.focus_keyword = cleanSeoField(patch.focusKeyword);
  if (patch.seoTitle !== undefined) update.seo_title = cleanSeoField(patch.seoTitle);
  if (patch.metaDescription !== undefined) update.meta_description = cleanSeoField(patch.metaDescription);
  if (patch.ogImage !== undefined) update.og_image = cleanSeoField(patch.ogImage);
  if (patch.tags !== undefined) update.tags = cleanTags(patch.tags);
  if (patch.scheduledAt !== undefined) update.scheduled_at = patch.scheduledAt?.trim() ? patch.scheduledAt : null;
  if (Object.keys(update).length === 0) return { ok: true };
  const db = createAdminSupabase();
  const { data, error } = await db.from("blog_posts").update(update as never).eq("slug", slug).select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Post not found." };
  revalidateBlog(slug);
  return { ok: true };
}

/** Delete a blog post. Server Action — re-checks admin + service-role. */
export async function deleteBlogPost(slug: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { error } = await db.from("blog_posts").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateBlog(slug);
  return { ok: true };
}

/**
 * Upload a blog cover photo, reusing the same public `product-images` bucket
 * and validation as product photos (`uploadImageToBucket`), and return its
 * public https URL. Unlike `putProductImage`, this does NOT write any DB
 * column — the blog form passes the returned URL back as `coverImage` to
 * `createBlogPost`/`updateBlogPost` itself. That's what makes cover upload
 * work on the NEW-post form too, before any `blog_posts` row exists: the
 * Storage object path only needs a valid slug *string* to namespace it under
 * (same as a product's `<slug>/<file>` path) — not an existing row — and the
 * new-post form already knows its slug (typed, or derived from the title)
 * before the admin clicks "Create". Server Action — re-checks admin and
 * validates the slug shape itself (it's untrusted client input here, not yet
 * a real row to look up).
 */
export async function uploadBlogCover(
  slug: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const cleanSlug = slug.trim().toLowerCase();
  if (!SLUG_RE.test(cleanSlug)) {
    return { ok: false, error: "Enter a valid slug before uploading a cover image." };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No image file provided." };
  const db = createAdminSupabase();
  return uploadImageToBucket(db, cleanSlug, file);
}

/** Refresh the storefront reviews/Q&A read + the admin moderation screen
 *  after a `product_reviews`/`product_questions` write. `catalog` is only
 *  needed for review writes — the `refresh_product_rating` trigger (migration
 *  0014) moves `products.rating`/`review_count`, which the cached catalog
 *  read carries. */
function revalidateReviews(includeCatalog: boolean): void {
  revalidateTag("reviews", "max");
  if (includeCatalog) revalidateTag("catalog", "max");
  revalidatePath("/admin/reviews");
}

/** Show/hide a review on the storefront. Server Action — admin re-check +
 *  service-role; hiding/unhiding also shifts `products.rating`/`review_count`
 *  via the DB trigger, so the catalog cache is busted too. */
export async function setReviewHidden(id: string, hidden: boolean): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("product_reviews" as never)
    .update({ hidden } as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidateReviews(true);
  return { ok: true };
}

/** Permanently delete a review. Server Action — admin re-check + service-role;
 *  the DB trigger recomputes `products.rating`/`review_count` on delete too. */
export async function deleteReview(id: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("product_reviews" as never)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidateReviews(true);
  return { ok: true };
}

/** Answer a customer question. Server Action — admin re-check + service-role;
 *  validates a non-empty, ≤ 2000-char answer, then stamps `answered_at`/
 *  `answered_by` (the signed-in admin's email, or "admin" if unresolvable).
 *  An answered question becomes publicly visible via `product_questions`'s
 *  "read answered questions" RLS policy. */
export async function answerQuestion(id: string, answer: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const trimmed = answer.trim();
  if (!trimmed) return { ok: false, error: "Answer is empty." };
  if (trimmed.length > 2000) return { ok: false, error: "Answer too long (max 2000)." };
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("product_questions" as never)
    .update({
      answer: trimmed,
      answered_at: new Date().toISOString(),
      answered_by: (await getSessionUser())?.email ?? "admin",
    } as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidateReviews(false);
  return { ok: true };
}

/** Show/hide a question on the storefront. Server Action — admin re-check +
 *  service-role. Doesn't affect `products.rating` — no catalog revalidation. */
export async function setQuestionHidden(id: string, hidden: boolean): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("product_questions" as never)
    .update({ hidden } as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidateReviews(false);
  return { ok: true };
}

/** Permanently delete a question. Server Action — admin re-check + service-role. */
export async function deleteQuestion(id: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("product_questions" as never)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidateReviews(false);
  return { ok: true };
}

/** Refresh the public blog (list) and the admin categories screen after a
 *  `blog_categories` write. */
function revalidateBlogTaxonomy(): void {
  revalidateTag("blog", "max");
  revalidatePath("/blog");
  revalidatePath("/admin/blog/categories");
}

/**
 * Create a blog category row. Server Action — re-checks admin, then
 * validates the input (slug required + url-safe on create) and rejects a
 * duplicate slug with a clean error before the DB's unique index would.
 * `blog_categories` predates the generated `database.types.ts`, so the table
 * name + insert payload use the same `as never` escape hatch as the rest of
 * this file's blog code.
 */
export async function createBlogCategory(input: { slug: string; name: string; sort: number }): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const slug = input.slug.trim().toLowerCase();
  const v = validateBlogCategory({ slug, name: input.name, sort: input.sort }, { requireSlug: true });
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { data: existing } = await db.from("blog_categories" as never).select("slug").eq("slug", slug).maybeSingle();
  if (existing) return { ok: false, error: `"${slug}" already exists.` };
  const { error } = await db.from("blog_categories" as never).insert({ slug, name: input.name.trim(), sort: input.sort } as never);
  if (error) return { ok: false, error: error.message };
  revalidateBlogTaxonomy();
  return { ok: true };
}

/**
 * Update a blog category's name/sort. Server Action — re-checks admin; never
 * writes `slug` (it's immutable once created, and is used here only to
 * locate the row).
 */
export async function updateBlogCategory(
  slug: string, patch: { name: string; sort: number },
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const v = validateBlogCategory({ name: patch.name, sort: patch.sort }, { requireSlug: false });
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { data, error } = await db.from("blog_categories" as never)
    .update({ name: patch.name.trim(), sort: patch.sort } as never)
    .eq("slug", slug).select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "This category no longer exists." };
  revalidateBlogTaxonomy();
  return { ok: true };
}

/**
 * Delete a blog category. Server Action — re-checks admin, then blocks the
 * delete if any blog post still references this slug (surfacing a clean
 * "reassign first" error rather than a raw FK violation from the DB) —
 * mirrors `deleteTaxonomy`'s referenced-count guard, but queries
 * `blog_posts.category` instead of `products`.
 */
export async function deleteBlogCategory(slug: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { count, error: cErr } = await db
    .from("blog_posts" as never).select("slug", { count: "exact", head: true }).eq("category", slug);
  if (cErr) return { ok: false, error: cErr.message };
  if ((count ?? 0) > 0) {
    return { ok: false, error: `${count} post(s) use this — reassign first.` };
  }
  const { error } = await db.from("blog_categories" as never).delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateBlogTaxonomy();
  return { ok: true };
}

/**
 * Persist a new display order for blog categories. Server Action —
 * re-checks admin; guards that `slugs` is exactly a permutation of the
 * current row set (never trusts client-supplied order blindly) before
 * writing `sort = index` for each row.
 */
export async function reorderBlogCategories(slugs: string[]): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error: rErr } = await db.from("blog_categories" as never).select("slug")
    .overrideTypes<{ slug: string }[], { merge: false }>();
  if (rErr) return { ok: false, error: rErr.message };
  const current = (data ?? []).map((r) => r.slug);
  if (!isPermutation(slugs, current)) return { ok: false, error: "Order does not match the current set." };
  for (let i = 0; i < slugs.length; i += 1) {
    const { error } = await db.from("blog_categories" as never).update({ sort: i } as never).eq("slug", slugs[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidateBlogTaxonomy();
  return { ok: true };
}

/** Statuses a `form_submissions` row may be set to (migration 0015's check
 *  constraint). */
const INBOX_STATUSES = ["new", "read", "archived"] as const;

/** Refresh the admin inbox list + the admin layout (whose sidebar re-reads
 *  `getInboxUnreadCount` on every admin page) after an inbox write. */
function revalidateInbox(): void {
  revalidatePath("/admin/inbox");
  revalidatePath("/admin", "layout");
}

/** Move a submission through new → read → archived (or back). Server Action
 *  — admin re-check + service-role; validates `status` against the DB's own
 *  check constraint so a bad value is a clean error, not a raw Postgres one. */
export async function setSubmissionStatus(id: string, status: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!(INBOX_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Invalid status." };
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("form_submissions" as never)
    .update({ status } as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidateInbox();
  return { ok: true };
}

/** Permanently delete a contact/bulk-order submission. Server Action — admin
 *  re-check + service-role. */
export async function deleteSubmission(id: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("form_submissions" as never)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidateInbox();
  return { ok: true };
}

/** Permanently delete a newsletter subscriber. Server Action — admin re-check
 *  + service-role. Doesn't affect the unread-submission badge, so this only
 *  revalidates the inbox list (not the admin layout). */
export async function deleteSubscriber(id: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("newsletter_subscribers" as never)
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Not found." };
  revalidatePath("/admin/inbox");
  return { ok: true };
}

/** The two roles `admin_users.role` accepts (mirrors the DB check constraint
 *  in migration 0016). */
const ADMIN_ROLES = ["super_admin", "admin"] as const;
type AdminRoleValue = (typeof ADMIN_ROLES)[number];

function isAdminRoleValue(value: string): value is AdminRoleValue {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

type AdminUserRow = { id: string; email: string; role: string };

/** Look up a team row's id+email+role by id, for the guard chain shared by
 *  `setAdminRole`/`removeAdminUser` — null if the row doesn't exist. */
async function findAdminUser(db: AdminDb, id: string): Promise<AdminUserRow | null> {
  const { data } = await db
    .from("admin_users" as never)
    .select("id, email, role")
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<AdminUserRow, { merge: false }>();
  return data ?? null;
}

/** Emails of every `admin_users` row currently `super_admin` (lowercased) —
 *  the DB side of the "at least one super admin must remain" guard. */
async function dbSuperEmails(db: AdminDb): Promise<string[]> {
  const { data } = await db
    .from("admin_users" as never)
    .select("email")
    .eq("role", "super_admin")
    .overrideTypes<{ email: string }[], { merge: false }>();
  return (data ?? []).map((r) => r.email.toLowerCase());
}

/** Message shown when an operation would remove the last super admin. */
const LAST_SUPER_ERROR =
  "At least one super admin must remain. Promote another member to super admin first.";

/** Refresh the team page after a write. */
function revalidateTeam(): void {
  revalidatePath("/admin/team");
}

/**
 * Add a new dashboard-managed admin. Server Action — super-gated; validates
 * the email (regex + trim/lowercase) and role (enum — a Super may create
 * other Supers, peer management by decision). No target row exists yet, so
 * this skips the "row exists"/env/self guards that gate `setAdminRole` and
 * `removeAdminUser`; it instead rejects adding an email that's already in the
 * env bootstrap allowlist (that email is already a permanent super — adding
 * it here would just be a misleading duplicate). A 23505 (unique violation on
 * `email`) from a genuine DB-row duplicate becomes a clean message too.
 */
export async function addAdminUser(email: string, role: string): Promise<ActionResult> {
  if (!(await getIsSuperAdmin())) throw new Error("unauthorized");

  const trimmed = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(trimmed)) return { ok: false, error: "Enter a valid email address." };
  if (!isAdminRoleValue(role)) return { ok: false, error: "Invalid role." };
  if (adminEnvEmails().includes(trimmed)) return { ok: false, error: "Already a permanent admin." };

  const callerEmail = (await getSessionUser())?.email ?? null;
  const db = createAdminSupabase();
  const { error } = await db
    .from("admin_users" as never)
    .insert({ email: trimmed, role, added_by: callerEmail } as never);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Already an admin." };
    return { ok: false, error: error.message };
  }
  revalidateTeam();
  return { ok: true };
}

/**
 * Change a dashboard-managed admin's role. Server Action — super-gated, then:
 * the target row must exist and a row whose email is in the env bootstrap
 * allowlist is managed via server config, not this table. A Super MAY change
 * their own role and another Super's role (peer + self management, by
 * decision) — the one hard rule is that the store must never be left with
 * zero super admins, so a demotion (super → admin) that would remove the last
 * super admin is blocked (promote someone else first, then step down).
 */
export async function setAdminRole(id: string, role: string): Promise<ActionResult> {
  if (!(await getIsSuperAdmin())) throw new Error("unauthorized");
  if (!isAdminRoleValue(role)) return { ok: false, error: "Invalid role." };

  const db = createAdminSupabase();
  const target = await findAdminUser(db, id);
  if (!target) return { ok: false, error: "Member not found." };
  if (adminEnvEmails().includes(target.email.toLowerCase())) {
    return { ok: false, error: "This member is managed via server config." };
  }
  // Demoting a super to admin must not orphan the store (env supers count too).
  if (target.role === "super_admin" && role === "admin") {
    if (wouldOrphanSupers(adminEnvEmails(), await dbSuperEmails(db), target.email)) {
      return { ok: false, error: LAST_SUPER_ERROR };
    }
  }

  const { error } = await db.from("admin_users" as never).update({ role } as never).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTeam();
  return { ok: true };
}

/**
 * Remove a dashboard-managed admin. Server Action — super-gated; env-managed
 * rows are blocked (server config), and a Super MAY remove another Super or
 * themselves (peer + self management) — as long as at least one super admin
 * remains. Removing the last super admin is blocked (promote a replacement
 * first, then leave). Env supers count toward "at least one remains".
 */
export async function removeAdminUser(id: string): Promise<ActionResult> {
  if (!(await getIsSuperAdmin())) throw new Error("unauthorized");

  const db = createAdminSupabase();
  const target = await findAdminUser(db, id);
  if (!target) return { ok: false, error: "Member not found." };
  if (adminEnvEmails().includes(target.email.toLowerCase())) {
    return { ok: false, error: "This member is managed via server config." };
  }
  if (target.role === "super_admin"
    && wouldOrphanSupers(adminEnvEmails(), await dbSuperEmails(db), target.email)) {
    return { ok: false, error: LAST_SUPER_ERROR };
  }

  const { error } = await db.from("admin_users" as never).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTeam();
  return { ok: true };
}
