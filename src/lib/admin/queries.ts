import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { computeDashboardStats, type DashboardStats } from "@/lib/admin/stats";

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
      "id, slug, sku, title, price, compare_at_price, rating, review_count, age_tier_slug, category_slug, badge, description, image_label, image_tones, image_url, preorder_ship_date, preorder_delivery_date, preorder_advance_pct, active, created_at, updated_at, inventory(stock_qty, low_stock_threshold), product_variants(id, name, tone)",
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
  };
}

/** All orders, newest first. */
export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select("id, order_number, created_at, customer_name, customer_phone, total, status, payment_method")
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
      "id, order_number, created_at, customer_name, customer_phone, customer_email, division, district, area, address_line, landmark, status, payment_method, subtotal, delivery_fee, total, advance_total, notes, order_items(id, product_id, title, unit_price, qty, line_total, fulfillment_type, preorder_ship_date, preorder_advance_pct)",
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
