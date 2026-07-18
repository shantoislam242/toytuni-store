"use server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getProductState } from "@/lib/data/product-state";
import { computeOrderTotals } from "@/lib/data/order-totals";
import { computeAdvance } from "@/lib/data/advance";
import { getSettings } from "@/lib/data/settings";
import { shippingFeeFor } from "@/lib/shipping";

export type CreateOrderInput = {
  customer: { name: string; phone: string; email?: string };
  address: { division: string; district: string; area: string; addressLine: string; landmark?: string };
  lines: { slug: string; qty: number }[];
  notes?: string;
  deliveryFee: number;
};
export type CreateOrderResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string };

/** Row shape for the products select below, supplied via `.overrideTypes()`
 *  rather than inferred from the `.select()` string — `preorder_advance_pct`
 *  (added by migration 0006) is absent from the generated types, which makes
 *  automatic `.select()` parsing resolve to a `SelectQueryError` for the
 *  whole row. See the note in `src/lib/data/products.ts` for the general
 *  pattern. */
type OrderProductRow = {
  id: string;
  slug: string;
  title: string;
  price: number;
  preorder_ship_date: string | null;
  preorder_advance_pct: number | null;
  inventory: { stock_qty: number } | { stock_qty: number }[] | null;
};

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.lines.length) return { ok: false, error: "Your cart is empty." };
  const db = createAdminSupabase();

  // Never trust a client-supplied fee: recompute the delivery charge (and the
  // COD fee) server-side from admin settings + the order's district. The
  // client-supplied `input.deliveryFee` is display-only and ignored here.
  const settings = await getSettings();
  const deliveryFee = shippingFeeFor(input.address.district, {
    insideDhakaFee: settings.shipping.insideDhakaFee,
    outsideDhakaFee: settings.shipping.outsideDhakaFee,
  });
  const codFee = settings.codFee; // all orders are COD today

  // Re-read price + stock server-side — never trust the client.
  const slugs = input.lines.map((l) => l.slug);
  const { data: rows, error: readErr } = await db
    .from("products")
    .select("id, slug, title, price, preorder_ship_date, preorder_advance_pct, inventory(stock_qty)")
    .in("slug", slugs)
    .eq("active", true)
    .overrideTypes<OrderProductRow[], { merge: false }>();
  if (readErr) return { ok: false, error: "Could not read products." };
  const bySlug = new Map((rows ?? []).map((r) => [r.slug, r]));

  const items: {
    product_id: string; title: string; unit_price: number; qty: number;
    line_total: number; fulfillment_type: "in_stock" | "preorder";
    preorder_ship_date: string | null;
    preorder_advance_pct: number | null;
  }[] = [];

  for (const line of input.lines) {
    if (line.qty <= 0) return { ok: false, error: "Invalid quantity." };
    const p = bySlug.get(line.slug);
    if (!p) return { ok: false, error: `Product unavailable: ${line.slug}` };
    const inv = p.inventory as { stock_qty: number }[] | { stock_qty: number } | null;
    const stockQty = Array.isArray(inv) ? (inv[0]?.stock_qty ?? 0) : (inv?.stock_qty ?? 0);
    const state = getProductState({ stockQty, preorderShipDate: p.preorder_ship_date });

    let fulfillment: "in_stock" | "preorder";
    if (state.state === "in_stock") {
      fulfillment = "in_stock";
    } else if (state.state === "preorder") {
      fulfillment = "preorder";
    } else {
      return { ok: false, error: `Sold out: ${p.title}` };
    }

    const advancePct = fulfillment === "preorder" ? (p.preorder_advance_pct ?? null) : null;

    items.push({
      product_id: p.id, title: p.title, unit_price: p.price, qty: line.qty,
      line_total: p.price * line.qty, fulfillment_type: fulfillment,
      preorder_ship_date: fulfillment === "preorder" ? p.preorder_ship_date : null,
      preorder_advance_pct: advancePct,
    });
  }

  const { subtotal } = computeOrderTotals(
    items.map((i) => ({ unitPrice: i.unit_price, qty: i.qty })), deliveryFee);
  const total = subtotal + deliveryFee + codFee;

  const advanceTotal = items.reduce(
    (sum, i) =>
      sum + (i.fulfillment_type === "preorder" ? computeAdvance(i.line_total, i.preorder_advance_pct) : 0),
    0,
  );

  const orderNumber = `TT-${Date.now().toString(36).toUpperCase()}`;
  const p_order = {
    order_number: orderNumber,
    customer_name: input.customer.name,
    customer_phone: input.customer.phone,
    customer_email: input.customer.email ?? null,
    division: input.address.division, district: input.address.district,
    area: input.address.area, address_line: input.address.addressLine,
    landmark: input.address.landmark ?? null,
    subtotal, delivery_fee: deliveryFee, total, notes: input.notes ?? null,
    advance_total: advanceTotal,
  };
  const p_items = items.map((i) => ({
    product_id: i.product_id, title: i.title, unit_price: i.unit_price, qty: i.qty,
    line_total: i.line_total, fulfillment_type: i.fulfillment_type,
    preorder_ship_date: i.preorder_ship_date,
    preorder_advance_pct: i.preorder_advance_pct,
  }));

  const { data: orderNumberResult, error } = await db.rpc("place_order", {
    p_order: p_order as never, p_items: p_items as never,
  });
  if (error) {
    if (error.message?.includes("insufficient_stock")) {
      return { ok: false, error: "Sorry, an item just went out of stock. Please try again." };
    }
    return { ok: false, error: "Could not place order." };
  }

  return { ok: true, orderNumber: orderNumberResult as string, total };
}
