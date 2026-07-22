import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { computeDashboardStats, type DashboardStats } from "@/lib/admin/stats";
import { TAXONOMY_TABLES, type TaxonomyKind } from "@/lib/admin/taxonomy";
import { aggregateCustomers, type CustomerRow, type OrderAggRow, type CustomerListItem } from "@/lib/admin/customer-metrics";
import { customerTier, type CustomerTier } from "@/lib/admin/customer-tier";
import { getSettings } from "@/lib/data/settings";
import type { DetailContent } from "@/lib/types";

/** Row shapes supplied via `.overrideTypes()` — see the note in
 *  `src/lib/data/products.ts` on why `.select()` string inference resolves to
 *  `never` in this repo. Includes `products.image_url` (migration 0004,
 *  applied) so admins see their uploaded photo, not just the bundled one. */
type DashboardOrderRow = { total: number; status: string };
type DashboardInventoryRow = { stock_qty: number; low_stock_threshold: number };

type AdminProductRow = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  active: boolean;
  created_at: string;
  image_url: string | null;
  inventory: { stock_qty: number; low_stock_threshold: number } | { stock_qty: number; low_stock_threshold: number }[] | null;
};

type AdminProductDetailRow = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  rating: number;
  review_count: number;
  age_tier_slug: string | null;
  category_slug: string | null;
  badge: string | null;
  description: string | null;
  image_label: string | null;
  image_tones: string[];
  image_url: string | null;
  preorder_ship_date: string | null;
  preorder_delivery_date: string | null;
  preorder_advance_pct: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  detail_content: DetailContent | null;
  gallery_urls: string[] | null;
  inventory: { stock_qty: number; low_stock_threshold: number } | { stock_qty: number; low_stock_threshold: number }[] | null;
  product_variants: { id: string; name: string; tone: string }[] | null;
};

type AdminOrderRow = {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  tracking_number: string | null;
  carrier: string | null;
};

type AdminOrderDetailRow = {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  division: string;
  district: string;
  area: string;
  address_line: string;
  landmark: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  paid_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  updated_at: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  advance_total: number;
  order_items: {
    id: string;
    product_id: string | null;
    title: string;
    unit_price: number;
    qty: number;
    line_total: number;
    fulfillment_type: string;
    preorder_ship_date: string | null;
    preorder_advance_pct: number | null;
  }[] | null;
};

/** `inventory` is a 1:1 relation but PostgREST may embed it as an object or a
 *  single-element array depending on join shape — handle both defensively
 *  (mirrors the pattern in `src/lib/data/products.ts`). */
function oneInventory(
  inv: AdminProductRow["inventory"],
): { stock_qty: number; low_stock_threshold: number } | null {
  if (!inv) return null;
  return Array.isArray(inv) ? (inv[0] ?? null) : inv;
}

export type AdminProductListItem = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  active: boolean;
  stockQty: number;
  lowStockThreshold: number;
  createdAt: string;
  imageUrl: string | null;
};

export type AdminProductDetail = {
  id: string;
  slug: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  rating: number;
  reviewCount: number;
  ageTierSlug: string | null;
  categorySlug: string | null;
  badge: string | null;
  description: string | null;
  imageLabel: string | null;
  imageTones: string[];
  imageUrl: string | null;
  preorderShipDate: string | null;
  preorderDeliveryDate: string | null;
  preorderAdvancePct: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  stockQty: number;
  lowStockThreshold: number;
  variants: { id: string; name: string; tone: string }[];
  detailContent: DetailContent | null;
  galleryUrls: string[];
};

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber: string | null;
  carrier: string | null;
};

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  landmark: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paidAt: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  updatedAt: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  advanceTotal: number;
  notes: string | null;
  items: {
    id: string;
    productId: string | null;
    title: string;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    fulfillmentType: string;
    preorderShipDate: string | null;
    preorderAdvancePct: number | null;
  }[];
};

/** Dashboard KPIs (orders/revenue/pending/low-stock), over ALL rows —
 *  service-role, not scoped by RLS. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const db = createAdminSupabase();

  const [ordersRes, inventoryRes] = await Promise.all([
    db.from("orders").select("total, status").overrideTypes<DashboardOrderRow[], { merge: false }>(),
    db.from("inventory").select("stock_qty, low_stock_threshold")
      .overrideTypes<DashboardInventoryRow[], { merge: false }>(),
  ]);
  if (ordersRes.error) throw new Error(`getDashboardStats: orders read failed: ${ordersRes.error.message}`);
  if (inventoryRes.error) throw new Error(`getDashboardStats: inventory read failed: ${inventoryRes.error.message}`);

  return computeDashboardStats({
    orders: ordersRes.data ?? [],
    inventory: inventoryRes.data ?? [],
  });
}

/** All products (incl. inactive), newest first, with current stock. */
export async function getAdminProducts(): Promise<AdminProductListItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("products")
    .select("id, slug, sku, title, price, compare_at_price, active, created_at, image_url, inventory(stock_qty, low_stock_threshold)")
    .order("created_at", { ascending: false })
    .overrideTypes<AdminProductRow[], { merge: false }>();
  if (error) throw new Error(`getAdminProducts failed: ${error.message}`);

  return (data ?? []).map((p) => {
    const inv = oneInventory(p.inventory);
    return {
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      title: p.title,
      price: p.price,
      compareAtPrice: p.compare_at_price,
      active: p.active,
      stockQty: inv?.stock_qty ?? 0,
      lowStockThreshold: inv?.low_stock_threshold ?? 0,
      createdAt: p.created_at,
      imageUrl: p.image_url,
    };
  });
}

/** One product (active or not) by slug, with inventory + variants. */
export async function getAdminProductBySlug(slug: string): Promise<AdminProductDetail | null> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("products")
    .select(
      "id, slug, sku, title, price, compare_at_price, rating, review_count, age_tier_slug, category_slug, badge, description, image_label, image_tones, image_url, preorder_ship_date, preorder_delivery_date, preorder_advance_pct, active, created_at, updated_at, detail_content, gallery_urls, inventory(stock_qty, low_stock_threshold), product_variants(id, name, tone)",
    )
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<AdminProductDetailRow, { merge: false }>();
  if (error) throw new Error(`getAdminProductBySlug failed: ${error.message}`);
  if (!data) return null;

  const inv = oneInventory(data.inventory);
  return {
    id: data.id,
    slug: data.slug,
    sku: data.sku,
    title: data.title,
    price: data.price,
    compareAtPrice: data.compare_at_price,
    rating: data.rating,
    reviewCount: data.review_count,
    ageTierSlug: data.age_tier_slug,
    categorySlug: data.category_slug,
    badge: data.badge,
    description: data.description,
    imageLabel: data.image_label,
    imageTones: data.image_tones,
    imageUrl: data.image_url,
    preorderShipDate: data.preorder_ship_date,
    preorderDeliveryDate: data.preorder_delivery_date,
    preorderAdvancePct: data.preorder_advance_pct,
    active: data.active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    stockQty: inv?.stock_qty ?? 0,
    lowStockThreshold: inv?.low_stock_threshold ?? 0,
    variants: data.product_variants ?? [],
    detailContent: data.detail_content,
    galleryUrls: data.gallery_urls ?? [],
  };
}

/** All orders, newest first. */
export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select("id, order_number, created_at, customer_name, customer_phone, total, status, payment_method, payment_status, tracking_number, carrier")
    .order("created_at", { ascending: false })
    .overrideTypes<AdminOrderRow[], { merge: false }>();
  if (error) throw new Error(`getAdminOrders failed: ${error.message}`);

  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    createdAt: o.created_at,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    total: o.total,
    status: o.status,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    trackingNumber: o.tracking_number,
    carrier: o.carrier,
  }));
}

/** Most recent orders, newest first, capped at `limit`. Used by the admin
 *  dashboard's recent-activity list. */
export async function getRecentOrders(limit: number): Promise<AdminOrderListItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select("id, order_number, created_at, customer_name, customer_phone, total, status, payment_method, payment_status, tracking_number, carrier")
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<AdminOrderRow[], { merge: false }>();
  // Fail-soft: this only feeds the dashboard's Recent Orders card — a transient
  // read error should render an empty card, never 500 the overview.
  if (error) {
    console.error("getRecentOrders failed:", error.message);
    return [];
  }

  return (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    createdAt: o.created_at,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    total: o.total,
    status: o.status,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    trackingNumber: o.tracking_number,
    carrier: o.carrier,
  }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One order by id, with its line items. A malformed (non-UUID) `id` can
 *  never match a row — return `null` up front (the page 404s) instead of
 *  letting Postgres's `invalid input syntax for type uuid` error bubble up
 *  as a 500. */
export async function getAdminOrderById(id: string): Promise<AdminOrderDetail | null> {
  if (!UUID_RE.test(id)) return null;

  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select(
      "id, order_number, created_at, customer_name, customer_phone, customer_email, division, district, area, address_line, landmark, status, payment_method, payment_status, paid_at, carrier, tracking_number, tracking_url, confirmed_at, shipped_at, delivered_at, cancelled_at, cancel_reason, updated_at, subtotal, delivery_fee, total, advance_total, notes, order_items(id, product_id, title, unit_price, qty, line_total, fulfillment_type, preorder_ship_date, preorder_advance_pct)",
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<AdminOrderDetailRow, { merge: false }>();
  if (error) throw new Error(`getAdminOrderById failed: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    orderNumber: data.order_number,
    createdAt: data.created_at,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    division: data.division,
    district: data.district,
    area: data.area,
    addressLine: data.address_line,
    landmark: data.landmark,
    status: data.status,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    paidAt: data.paid_at,
    carrier: data.carrier,
    trackingNumber: data.tracking_number,
    trackingUrl: data.tracking_url,
    confirmedAt: data.confirmed_at,
    shippedAt: data.shipped_at,
    deliveredAt: data.delivered_at,
    cancelledAt: data.cancelled_at,
    cancelReason: data.cancel_reason,
    updatedAt: data.updated_at,
    subtotal: data.subtotal,
    deliveryFee: data.delivery_fee,
    total: data.total,
    advanceTotal: data.advance_total,
    notes: data.notes,
    items: (data.order_items ?? []).map((i) => ({
      id: i.id,
      productId: i.product_id,
      title: i.title,
      unitPrice: i.unit_price,
      qty: i.qty,
      lineTotal: i.line_total,
      fulfillmentType: i.fulfillment_type,
      preorderShipDate: i.preorder_ship_date,
      preorderAdvancePct: i.preorder_advance_pct,
    })),
  };
}

export type OrderHistoryItem = {
  id: string; status: string; note: string | null; changedBy: string | null; createdAt: string;
};

/** Status-history timeline for one order, oldest first. Service-role. */
export async function getOrderStatusHistory(orderId: string): Promise<OrderHistoryItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("order_status_history")
    .select("id, status, note, changed_by, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .overrideTypes<
      { id: string; status: string; note: string | null; changed_by: string | null; created_at: string }[],
      { merge: false }
    >();
  if (error) throw new Error(`getOrderStatusHistory failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id, status: r.status, note: r.note, changedBy: r.changed_by, createdAt: r.created_at,
  }));
}

export type AdminCustomerOrder = {
  id: string; orderNumber: string; createdAt: string; total: number; status: string;
};
export type AdminCustomerLastAddress = {
  addressLine: string; landmark: string | null; area: string; district: string; division: string;
};
export type AdminCustomerDetail = {
  id: string; name: string; phone: string; email: string | null; createdAt: string;
  orderCount: number; totalSpent: number; lastOrderAt: string | null;
  aov: number; firstOrderAt: string | null; cancelledCount: number;
  status: string; tags: string[]; notes: string | null; tier: CustomerTier;
  lastAddress: AdminCustomerLastAddress | null;
  orders: AdminCustomerOrder[];
};

/** List-item shape (metrics + tier) returned by `getAdminCustomers`. */
export type AdminCustomerListItem = CustomerListItem & { tier: CustomerTier };

/** All customers with per-customer order metrics + spend tier. Service-role. */
export async function getAdminCustomers(): Promise<AdminCustomerListItem[]> {
  const db = createAdminSupabase();
  const [custRes, ordRes] = await Promise.all([
    db.from("customers").select("id, name, phone, email, created_at, status, tags").overrideTypes<CustomerRow[], { merge: false }>(),
    db.from("orders").select("customer_id, total, status, created_at").overrideTypes<OrderAggRow[], { merge: false }>(),
  ]);
  if (custRes.error) throw new Error(`getAdminCustomers: customers read failed: ${custRes.error.message}`);
  if (ordRes.error) throw new Error(`getAdminCustomers: orders read failed: ${ordRes.error.message}`);
  const items = aggregateCustomers(custRes.data ?? [], ordRes.data ?? []);
  const settings = await getSettings();
  return items.map((item) => ({ ...item, tier: customerTier(item.totalSpent, settings.customerTiers) }));
}

/** Row shape for the single-customer read in `getAdminCustomerById` — adds
 *  `notes` (list read doesn't need it) to the `status`/`tags` already on
 *  `CustomerRow`. Absent from generated types, same as `status`/`tags`. */
type CustomerDetailRow = CustomerRow & { notes?: string | null };

/** Per-order fields needed to derive `lastAddress` for the detail view. */
type CustomerOrderRow = {
  id: string; order_number: string; created_at: string; total: number; status: string;
  division: string; district: string; area: string; address_line: string; landmark: string | null;
};

/** One customer + their order history (newest first). Non-UUID id → null (404). */
export async function getAdminCustomerById(id: string): Promise<AdminCustomerDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const db = createAdminSupabase();
  const { data: c, error } = await db
    .from("customers").select("id, name, phone, email, created_at, status, tags, notes").eq("id", id).maybeSingle()
    .overrideTypes<CustomerDetailRow, { merge: false }>();
  if (error) throw new Error(`getAdminCustomerById failed: ${error.message}`);
  if (!c) return null;

  const { data: ords, error: oErr } = await db
    .from("orders")
    .select("id, order_number, created_at, total, status, division, district, area, address_line, landmark")
    .eq("customer_id", id)
    .order("created_at", { ascending: false })
    .overrideTypes<CustomerOrderRow[], { merge: false }>();
  if (oErr) throw new Error(`getAdminCustomerById orders failed: ${oErr.message}`);

  const orders = ords ?? [];
  const [metrics] = aggregateCustomers(
    [c],
    orders.map((o) => ({ customer_id: c.id, total: o.total, status: o.status, created_at: o.created_at })),
  );
  const settings = await getSettings();
  const tier = customerTier(metrics.totalSpent, settings.customerTiers);
  // Newest order (first in the list, since `orders` is sorted newest-first) —
  // its shipping address is the customer's most recent known address.
  const newest = orders[0] ?? null;
  const lastAddress: AdminCustomerLastAddress | null = newest
    ? {
        addressLine: newest.address_line, landmark: newest.landmark,
        area: newest.area, district: newest.district, division: newest.division,
      }
    : null;

  return {
    ...metrics, // id, name, phone, email, createdAt, orderCount, totalSpent, lastOrderAt, aov, firstOrderAt, cancelledCount, status, tags
    notes: c.notes ?? null,
    tier,
    lastAddress,
    orders: orders.map((o) => ({
      id: o.id, orderNumber: o.order_number, createdAt: o.created_at, total: o.total, status: o.status,
    })),
  };
}

export type AdminInventoryItem = {
  slug: string; sku: string; title: string; imageUrl: string | null;
  stockQty: number; lowStockThreshold: number;
};

type InventoryProductRow = {
  slug: string; sku: string; title: string; image_url: string | null;
  inventory: { stock_qty: number; low_stock_threshold: number } | { stock_qty: number; low_stock_threshold: number }[] | null;
};

/** Every product with its current stock + threshold, ordered out-of-stock/low
 *  first (most actionable), then by title. Service-role. */
export async function getAdminInventory(): Promise<AdminInventoryItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("products")
    .select("slug, sku, title, image_url, inventory(stock_qty, low_stock_threshold)")
    .overrideTypes<InventoryProductRow[], { merge: false }>();
  if (error) throw new Error(`getAdminInventory failed: ${error.message}`);

  const items = (data ?? []).map((p) => {
    const inv = oneInventory(p.inventory);
    return {
      slug: p.slug, sku: p.sku, title: p.title, imageUrl: p.image_url ?? null,
      stockQty: inv?.stock_qty ?? 0, lowStockThreshold: inv?.low_stock_threshold ?? 0,
    };
  });
  const rank = (i: AdminInventoryItem) => (i.stockQty <= 0 ? 0 : i.stockQty <= i.lowStockThreshold ? 1 : 2);
  return items.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

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

export type AdminBlogListItem = {
  slug: string; title: string; category: string | null; author: string | null;
  dateISO: string | null; featured: boolean; published: boolean; scheduledAt: string | null;
};
export type AdminBlogPost = AdminBlogListItem & {
  excerpt: string; bodyMarkdown: string; coverImage: string | null;
  coverTone: string | null; coverLabel: string | null;
  seoTitle: string | null; metaDescription: string | null; ogImage: string | null;
  focusKeyword: string | null; tags: string[];
};

/** All blog posts (every status, incl. drafts/unpublished), newest first.
 *  Service-role. `blog_posts`'s current columns (migration 0008: `body` as
 *  text, `cover_tone`/`cover_label`) predate the generated types — same
 *  `as never` table-name cast used elsewhere in this file/the seed script. */
export async function getAdminBlogPosts(): Promise<AdminBlogListItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db.from("blog_posts" as never)
    .select("slug, title, category, author, date_iso, featured, published, scheduled_at")
    .order("date_iso", { ascending: false })
    .overrideTypes<{ slug: string; title: string; category: string | null; author: string | null; date_iso: string | null; featured: boolean; published: boolean; scheduled_at: string | null }[], { merge: false }>();
  if (error) throw new Error(`getAdminBlogPosts failed: ${error.message}`);
  return (data ?? []).map((r) => ({ slug: r.slug, title: r.title, category: r.category, author: r.author, dateISO: r.date_iso, featured: r.featured, published: r.published, scheduledAt: r.scheduled_at }));
}

/** One blog post (any status) by slug, full editable content. Service-role. */
export async function getAdminBlogPostBySlug(slug: string): Promise<AdminBlogPost | null> {
  const db = createAdminSupabase();
  const { data, error } = await db.from("blog_posts" as never)
    .select("slug, title, excerpt, body, author, cover_image, category, date_iso, featured, published, cover_tone, cover_label, focus_keyword, seo_title, meta_description, og_image, tags, scheduled_at")
    .eq("slug", slug).maybeSingle()
    .overrideTypes<{ slug: string; title: string; excerpt: string | null; body: string; author: string | null; cover_image: string | null; category: string | null; date_iso: string | null; featured: boolean; published: boolean; cover_tone: string | null; cover_label: string | null; focus_keyword: string | null; seo_title: string | null; meta_description: string | null; og_image: string | null; tags: string[] | null; scheduled_at: string | null }, { merge: false }>();
  if (error) throw new Error(`getAdminBlogPostBySlug failed: ${error.message}`);
  if (!data) return null;
  return {
    slug: data.slug, title: data.title, excerpt: data.excerpt ?? "", bodyMarkdown: data.body ?? "",
    author: data.author, category: data.category, dateISO: data.date_iso, featured: data.featured,
    published: data.published, coverImage: data.cover_image, coverTone: data.cover_tone, coverLabel: data.cover_label,
    seoTitle: data.seo_title, metaDescription: data.meta_description, ogImage: data.og_image,
    focusKeyword: data.focus_keyword, tags: data.tags ?? [], scheduledAt: data.scheduled_at,
  };
}

export type AdminReview = {
  id: string;
  productId: string;
  productTitle: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string | null;
  body: string;
  hidden: boolean;
  createdAt: string;
};

type AdminReviewRow = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string | null;
  body: string;
  hidden: boolean;
  created_at: string;
  products: { title: string } | { title: string }[] | null;
};

/** `products` is a 1:1 relation embedded via the `product_id` FK, but
 *  PostgREST may return it as an object or a single-element array depending
 *  on join shape — handle both defensively (mirrors `oneProductTitle` in
 *  `src/lib/admin/analytics.ts`). */
function oneProductTitle(products: AdminReviewRow["products"] | AdminQuestionRow["products"]): string {
  if (!products) return "—";
  const row = Array.isArray(products) ? products[0] : products;
  return row?.title ?? "—";
}

/** All reviews (incl. hidden), newest first, with the product's title.
 *  Service-role — admin moderation needs hidden rows too, which RLS's
 *  "read visible reviews" policy would otherwise exclude. */
export async function getAdminReviews(): Promise<AdminReview[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("product_reviews" as never)
    .select("id, product_id, customer_name, customer_email, rating, title, body, hidden, created_at, products(title)")
    .order("created_at", { ascending: false })
    .overrideTypes<AdminReviewRow[], { merge: false }>();
  if (error) throw new Error(`getAdminReviews failed: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    productTitle: oneProductTitle(r.products),
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    rating: r.rating,
    title: r.title,
    body: r.body,
    hidden: r.hidden,
    createdAt: r.created_at,
  }));
}

export type AdminQuestion = {
  id: string;
  productId: string;
  productTitle: string;
  customerName: string;
  customerEmail: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  hidden: boolean;
  createdAt: string;
};

type AdminQuestionRow = {
  id: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  hidden: boolean;
  created_at: string;
  products: { title: string } | { title: string }[] | null;
};

/** All questions (incl. hidden/unanswered), unanswered first then newest.
 *  Service-role — admin moderation needs hidden/unanswered rows too, which
 *  RLS's "read answered questions" policy would otherwise exclude. */
export async function getAdminQuestions(): Promise<AdminQuestion[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("product_questions" as never)
    .select("id, product_id, customer_name, customer_email, question, answer, answered_at, hidden, created_at, products(title)")
    .order("created_at", { ascending: false })
    .overrideTypes<AdminQuestionRow[], { merge: false }>();
  if (error) throw new Error(`getAdminQuestions failed: ${error.message}`);

  const items = (data ?? []).map((q) => ({
    id: q.id,
    productId: q.product_id,
    productTitle: oneProductTitle(q.products),
    customerName: q.customer_name,
    customerEmail: q.customer_email,
    question: q.question,
    answer: q.answer,
    answeredAt: q.answered_at,
    hidden: q.hidden,
    createdAt: q.created_at,
  }));
  return items.sort((a, b) => {
    const unansweredRank = (x: AdminQuestion) => (x.answer === null ? 0 : 1);
    const rankDiff = unansweredRank(a) - unansweredRank(b);
    if (rankDiff !== 0) return rankDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export type AdminBlogCategory = { slug: string; name: string; sort: number; postCount: number };

type BlogCategoryRow = { slug: string; name: string; sort: number };

/** All blog categories ordered by sort, each with its referencing-post count
 *  (drives the delete-block UX). Service-role. `blog_categories` predates
 *  the generated types — same `as never` table-name cast used elsewhere in
 *  this file's blog code. */
export async function getAdminBlogCategories(): Promise<AdminBlogCategory[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("blog_categories" as never)
    .select("slug, name, sort")
    .order("sort", { ascending: true })
    .overrideTypes<BlogCategoryRow[], { merge: false }>();
  if (error) throw new Error(`getAdminBlogCategories failed: ${error.message}`);
  const rows = data ?? [];
  // Per-row referencing-post count. N+1 but tiny (≤ a dozen rows) — mirrors getAdminTaxonomy.
  const counts = await Promise.all(
    rows.map(async (r) => {
      const { count } = await db
        .from("blog_posts" as never).select("slug", { count: "exact", head: true }).eq("category", r.slug);
      return [r.slug, count ?? 0] as const;
    }),
  );
  const bySlug = new Map(counts);
  return rows.map((r) => ({ ...r, postCount: bySlug.get(r.slug) ?? 0 }));
}
