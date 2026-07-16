"use server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getProductState } from "@/lib/data/product-state";

export function computeOrderTotals(
  lines: { unitPrice: number; qty: number }[],
  deliveryFee: number,
): { subtotal: number; total: number; lineTotals: number[] } {
  const lineTotals = lines.map((l) => l.unitPrice * l.qty);
  const subtotal = lineTotals.reduce((s, n) => s + n, 0);
  return { subtotal, total: subtotal + deliveryFee, lineTotals };
}

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

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.lines.length) return { ok: false, error: "Your cart is empty." };
  const db = createAdminSupabase();

  // Re-read price + stock server-side — never trust the client.
  const slugs = input.lines.map((l) => l.slug);
  const { data: rows, error: readErr } = await db
    .from("products")
    .select("id, slug, title, price, preorder_ship_date, inventory(stock_qty)")
    .in("slug", slugs)
    .eq("active", true);
  if (readErr) return { ok: false, error: "Could not read products." };
  const bySlug = new Map((rows ?? []).map((r) => [r.slug, r]));

  const items: {
    product_id: string; title: string; unit_price: number; qty: number;
    line_total: number; fulfillment_type: "in_stock" | "preorder";
    preorder_ship_date: string | null;
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
      const { data: remaining } = await db.rpc("decrement_stock", {
        p_product_id: p.id, p_qty: line.qty,
      });
      if (remaining === -1) {
        // Couldn't reserve stock: fall back to pre-order if allowed, else fail.
        if (p.preorder_ship_date) fulfillment = "preorder";
        else return { ok: false, error: `Out of stock: ${p.title}` };
      } else {
        fulfillment = "in_stock";
      }
    } else if (state.state === "preorder") {
      fulfillment = "preorder";
    } else {
      return { ok: false, error: `Sold out: ${p.title}` };
    }

    items.push({
      product_id: p.id, title: p.title, unit_price: p.price, qty: line.qty,
      line_total: p.price * line.qty, fulfillment_type: fulfillment,
      preorder_ship_date: fulfillment === "preorder" ? p.preorder_ship_date : null,
    });
  }

  const { subtotal, total } = computeOrderTotals(
    items.map((i) => ({ unitPrice: i.unit_price, qty: i.qty })), input.deliveryFee);

  // Upsert customer by phone (groups repeat buyers).
  const { data: customer } = await db
    .from("customers")
    .upsert({ phone: input.customer.phone, name: input.customer.name,
      email: input.customer.email ?? null }, { onConflict: "phone" })
    .select("id").single();

  const orderNumber = `TT-${Date.now().toString(36).toUpperCase()}`;
  const { data: order, error: orderErr } = await db.from("orders").insert({
    order_number: orderNumber, customer_id: customer?.id ?? null,
    customer_name: input.customer.name, customer_phone: input.customer.phone,
    customer_email: input.customer.email ?? null,
    division: input.address.division, district: input.address.district,
    area: input.address.area, address_line: input.address.addressLine,
    landmark: input.address.landmark ?? null,
    subtotal, delivery_fee: input.deliveryFee, total, notes: input.notes ?? null,
  }).select("id").single();
  if (orderErr || !order) return { ok: false, error: "Could not place order." };

  const { error: itemsErr } = await db.from("order_items")
    .insert(items.map((i) => ({ ...i, order_id: order.id })));
  if (itemsErr) return { ok: false, error: "Could not save order items." };

  return { ok: true, orderNumber, total };
}
