"use server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getProductState } from "@/lib/data/product-state";
import { computeOrderTotals } from "@/lib/data/order-totals";
import { computeAdvance } from "@/lib/data/advance";
import { getSettings } from "@/lib/data/settings";
import { normalizeCode } from "@/lib/coupons/normalize";
import { computeCouponDiscount } from "@/lib/coupons/discount";
import { validateCoupon, COUPON_REASON_MESSAGE, type CouponRow } from "@/lib/coupons/validate";
import { priceDelivery } from "@/lib/shipping";
import { sendOrderEmail } from "@/lib/email/send-order-email";
import { buildInvoiceData } from "@/lib/invoice/build-invoice-data";
import { generateInvoicePdf } from "@/lib/invoice/generate-invoice-pdf";
import { BRAND_NAME } from "@/lib/config";

export type CreateOrderInput = {
  customer: { name: string; phone: string; email?: string };
  address: { division: string; district: string; area: string; addressLine: string; landmark?: string };
  lines: { slug: string; qty: number }[];
  notes?: string;
  deliveryFee: number;
  shippingMethodId: string;
  couponCode?: string;
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
    // Same store-wide pre-order policy the storefront showed the shopper, so a
    // low-stock line is recorded as `preorder` (bypassing place_order's stock
    // guard) and snapshots the RESOLVED ship date / advance (per-product value
    // or the global default), not the raw columns.
    const state = getProductState({
      stockQty,
      preorderShipDate: p.preorder_ship_date,
      preorderAdvancePct: p.preorder_advance_pct,
      price: p.price,
      preorderEnabled: settings.preorder.enabled,
      preorderThreshold: settings.preorder.thresholdQty,
      preorderLeadDays: settings.preorder.leadDays,
      preorderDefaultAdvancePct: settings.preorder.advancePct,
    });

    let fulfillment: "in_stock" | "preorder";
    let preorderShipDate: string | null = null;
    let advancePct: number | null = null;
    if (state.state === "in_stock") {
      fulfillment = "in_stock";
    } else if (state.state === "preorder") {
      fulfillment = "preorder";
      preorderShipDate = state.shipDate;
      advancePct = state.advancePct;
    } else {
      return { ok: false, error: `Sold out: ${p.title}` };
    }

    items.push({
      product_id: p.id, title: p.title, unit_price: p.price, qty: line.qty,
      line_total: p.price * line.qty, fulfillment_type: fulfillment,
      preorder_ship_date: preorderShipDate,
      preorder_advance_pct: advancePct,
    });
  }

  const { subtotal } = computeOrderTotals(
    items.map((i) => ({ unitPrice: i.unit_price, qty: i.qty })), 0);
  // Delivery fee depends on the chosen shipping method (not just the district),
  // so it must be priced AFTER subtotal is known — see `priceDelivery`.
  const deliveryFee = priceDelivery(input.shippingMethodId, subtotal, input.address.district, settings.shipping);

  // Re-validate the coupon server-side against the authoritative subtotal (never
  // trust the client's applied discount). A supplied-but-invalid code fails the
  // order rather than silently overcharging. `place_order` re-checks + consumes
  // the coupon in-transaction, so the count can't be over-redeemed in a race.
  let discountTotal = 0;
  let couponCode: string | null = null;
  if (input.couponCode && input.couponCode.trim() !== "") {
    const normalized = normalizeCode(input.couponCode);
    const { data: coupon } = await db
      .from("coupons" as never)
      .select("discount_pct, active, min_subtotal, expires_at, usage_limit, used_count")
      .eq("code", normalized)
      .maybeSingle()
      .overrideTypes<CouponRow, { merge: false }>();
    const v = validateCoupon(coupon ?? null, subtotal, new Date());
    if (!v.ok) return { ok: false, error: COUPON_REASON_MESSAGE[v.reason] };
    discountTotal = computeCouponDiscount(subtotal, v.discountPct);
    couponCode = normalized;
  }

  const total = subtotal + deliveryFee + codFee - discountTotal;

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
    discount_total: discountTotal, coupon_code: couponCode,
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
    if (error.message?.includes("coupon_unavailable")) {
      return { ok: false, error: "This coupon is no longer available. Please remove it and try again." };
    }
    return { ok: false, error: "Could not place order." };
  }

  // Fail-soft placed-confirmation email (with invoice PDF attached). Wrapped
  // in its own try/catch — on top of `sendOrderEmail`'s internal fail-soft —
  // so a broken invoice render or email send can never fail the order itself,
  // which has already been placed by this point.
  if (input.customer.email) {
    const emailData = {
      orderNumber, customerName: input.customer.name, customerEmail: input.customer.email,
      status: "pending",
      items: p_items.map((i) => ({ title: i.title, qty: i.qty, lineTotal: i.line_total })),
      subtotal, deliveryFee, advanceTotal, discountTotal, total,
    };
    try {
      const invoiceData = buildInvoiceData(
        {
          orderNumber, createdAt: new Date().toISOString(), status: "pending", paymentStatus: "pending",
          customerName: input.customer.name, customerPhone: input.customer.phone, customerEmail: input.customer.email,
          division: input.address.division, district: input.address.district, area: input.address.area,
          addressLine: input.address.addressLine, landmark: input.address.landmark ?? null,
          items: p_items.map((i) => ({ title: i.title, qty: i.qty, unitPrice: i.unit_price, lineTotal: i.line_total })),
          subtotal, deliveryFee, advanceTotal, discountTotal, total,
        },
        settings, BRAND_NAME,
      );
      const pdf = await generateInvoicePdf(invoiceData);
      await sendOrderEmail("placed", emailData, { filename: `invoice-${orderNumber}.pdf`, content: pdf });
    } catch (err) {
      console.error("placed-email failed:", err);
    }
  }

  return { ok: true, orderNumber: orderNumberResult as string, total };
}
