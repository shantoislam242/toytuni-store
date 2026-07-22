import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type AccountOrderItem = {
  title: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  fulfillmentType: string;
};

export type AccountOrder = {
  orderNumber: string;
  /** ISO date (YYYY-MM-DD) — ready for `formatDate`. */
  createdAt: string;
  status: string;
  paymentStatus: string;
  trackingNumber: string | null;
  carrier: string | null;
  total: number;
  items: AccountOrderItem[];
};

/** Row shape for the `getOrdersForEmail` select. `payment_status`,
 *  `tracking_number`, `carrier` (migration 0011) predate the hand-authored
 *  `database.types.ts` (see its header comment), so `.select()` string
 *  inference can't resolve the row — supplied explicitly via
 *  `.overrideTypes()`, the pattern used throughout `src/lib/admin/queries.ts`. */
type AccountOrderRow = {
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  tracking_number: string | null;
  carrier: string | null;
  total: number;
  order_items:
    | { title: string; qty: number; unit_price: number; line_total: number; fulfillment_type: string }[]
    | null;
};

/**
 * Order history for a signed-in customer, matched by the denormalized
 * `customer_email` (orders don't carry a customer link — see Phase 1). Reads
 * via the service-role client, which bypasses RLS, so this is SERVER-ONLY and
 * the caller's session IS the authorization: only ever pass the email of the
 * currently signed-in user (see `src/app/account/page.tsx`).
 */
export async function getOrdersForEmail(email: string): Promise<AccountOrder[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select(
      "order_number, created_at, status, payment_status, tracking_number, carrier, total, order_items(title, qty, unit_price, line_total, fulfillment_type)",
    )
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .overrideTypes<AccountOrderRow[], { merge: false }>();

  if (error) {
    // Fail soft: a Supabase blip must not 500 the account page — render an
    // empty history instead.
    console.error("getOrdersForEmail failed:", error);
    return [];
  }

  return (data ?? []).map((o) => ({
    orderNumber: o.order_number,
    // `created_at` is a full timestamp; `formatDate` wants YYYY-MM-DD.
    createdAt: o.created_at.slice(0, 10),
    status: o.status,
    paymentStatus: o.payment_status,
    trackingNumber: o.tracking_number,
    carrier: o.carrier,
    total: o.total,
    items: (o.order_items ?? []).map((it) => ({
      title: it.title,
      qty: it.qty,
      unitPrice: it.unit_price,
      lineTotal: it.line_total,
      fulfillmentType: it.fulfillment_type,
    })),
  }));
}

/**
 * Full order detail for the account order-detail page + its invoice route
 * (which reuses `buildInvoiceData` — every field it reads is present here).
 * `createdAt` here is the FULL ISO timestamp (unlike the list's
 * YYYY-MM-DD-sliced `AccountOrder.createdAt`); `buildInvoiceData` slices it
 * itself where needed.
 */
export type AccountOrderDetailItem = AccountOrderItem & {
  /** Product slug for the "Write a review →" link, `null` if the product
   *  embed couldn't be resolved (e.g. product later deleted). */
  slug: string | null;
};

export type AccountOrderDetail = Omit<AccountOrder, "items"> & {
  items: AccountOrderDetailItem[];
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  landmark: string | null;
  subtotal: number;
  deliveryFee: number;
  advanceTotal: number;
  trackingUrl: string | null;
  /** Status timeline from `order_status_history`, oldest first. */
  historyStatuses: string[];
};

/** Row shape for the `getOrderForEmail` select — see the note on
 *  `AccountOrderRow` above for why `.overrideTypes()` is required. Includes
 *  `id` (not exposed on `AccountOrderDetail`) so the status-history follow-up
 *  query can filter by `order_id`. */
type AccountOrderDetailRow = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  division: string;
  district: string;
  area: string;
  address_line: string;
  landmark: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  subtotal: number;
  delivery_fee: number;
  advance_total: number;
  total: number;
  order_items:
    | {
        title: string;
        qty: number;
        unit_price: number;
        line_total: number;
        fulfillment_type: string;
        product_id: string | null;
        // `products` is a 1:1 embed (FK `order_items.product_id ->
        // products.id`), but PostgREST may return it as an object or a
        // single-element array depending on join shape — handle both
        // (mirrors `oneProductTitle` in `src/lib/admin/analytics.ts`).
        products: { slug: string } | { slug: string }[] | null;
      }[]
    | null;
};

/** See the note on `AccountOrderDetailRow.order_items.products` above. */
function oneProductSlug(products: { slug: string } | { slug: string }[] | null): string | null {
  if (!products) return null;
  const row = Array.isArray(products) ? products[0] : products;
  return row?.slug ?? null;
}

/**
 * One order's full detail for a signed-in customer, scoped to BOTH the
 * session email AND the order number — a wrong owner (or a mistyped order
 * number) gets `null`, never another customer's order. Same SERVER-ONLY /
 * service-role caveat as `getOrdersForEmail`: the caller's session IS the
 * authorization, so only ever pass the email of the currently signed-in
 * user. Backs the account order-detail page and its invoice route (Task 5).
 */
export async function getOrderForEmail(
  email: string,
  orderNumber: string,
): Promise<AccountOrderDetail | null> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select(
      "id, order_number, created_at, status, payment_status, customer_name, customer_phone, customer_email, division, district, area, address_line, landmark, carrier, tracking_number, tracking_url, subtotal, delivery_fee, advance_total, total, order_items(title, qty, unit_price, line_total, fulfillment_type, product_id, products(slug))",
    )
    .eq("customer_email", email)
    .eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes<AccountOrderDetailRow, { merge: false }>();

  if (error || !data) {
    // Fail soft (and fail closed on ownership): a Supabase blip or a
    // non-matching email/order-number pair both resolve to `null` — the
    // caller 404s either way, never leaking another customer's order.
    if (error) console.error("getOrderForEmail failed:", error);
    return null;
  }

  // Separate query: `order_status_history` isn't a nested relation of
  // `orders` (no FK selectable from this side), so it's fetched by `id`
  // once the order is confirmed to belong to this email. A failure here is
  // fail-soft (empty timeline), not fatal — the order itself was found.
  const { data: hist, error: histError } = await db
    .from("order_status_history")
    .select("status")
    .eq("order_id", data.id)
    .order("created_at", { ascending: true })
    .overrideTypes<{ status: string }[], { merge: false }>();
  if (histError) console.error("getOrderForEmail history read failed:", histError);

  return {
    orderNumber: data.order_number,
    createdAt: data.created_at,
    status: data.status,
    paymentStatus: data.payment_status,
    trackingNumber: data.tracking_number,
    carrier: data.carrier,
    total: data.total,
    items: (data.order_items ?? []).map((it) => ({
      title: it.title,
      qty: it.qty,
      unitPrice: it.unit_price,
      lineTotal: it.line_total,
      fulfillmentType: it.fulfillment_type,
      slug: oneProductSlug(it.products),
    })),
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    division: data.division,
    district: data.district,
    area: data.area,
    addressLine: data.address_line,
    landmark: data.landmark,
    subtotal: data.subtotal,
    deliveryFee: data.delivery_fee,
    advanceTotal: data.advance_total,
    trackingUrl: data.tracking_url,
    historyStatuses: (hist ?? []).map((h) => h.status),
  };
}
