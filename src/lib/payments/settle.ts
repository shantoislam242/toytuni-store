import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/data/settings";
import { buildInvoiceData } from "@/lib/invoice/build-invoice-data";
import { generateInvoicePdf } from "@/lib/invoice/generate-invoice-pdf";
import { sendOrderEmail } from "@/lib/email/send-order-email";
import { BRAND_NAME } from "@/lib/config";

/**
 * Gateway-side order settlement. These run ONLY from the SSLCommerz callback
 * routes (success / ipn / fail / cancel), after `validatePayment` has confirmed
 * the transaction server-to-server — they are NOT server actions and are not
 * client-invocable. `import "server-only"` keeps them off the client.
 */

type SettleOrderRow = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  division: string;
  district: string;
  area: string;
  address_line: string;
  landmark: string | null;
  subtotal: number;
  delivery_fee: number;
  advance_total: number | null;
  discount_total: number | null;
  total: number;
  coupon_code: string | null;
};

type SettleItemRow = { title: string; qty: number; unit_price: number; line_total: number };

export type SettleResult =
  | { ok: true; orderNumber: string; alreadyPaid: boolean }
  | { ok: false; error: string };

/**
 * Mark an online order paid — IDEMPOTENT. Re-firing (success_url AND ipn both
 * arrive) is safe: an already-paid order short-circuits without double-emailing
 * or double-crediting. Sends the order-confirmation email (with invoice) once,
 * on the first settle.
 */
export async function settleOnlineOrder(
  orderNumber: string,
  paymentRef: string | null,
  paidAmount: number | null,
): Promise<SettleResult> {
  const db = createAdminSupabase();

  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, created_at, status, payment_status, payment_method, customer_name, customer_phone, customer_email, division, district, area, address_line, landmark, subtotal, delivery_fee, advance_total, discount_total, total, coupon_code",
    )
    .eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes<SettleOrderRow, { merge: false }>();

  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "cancelled") return { ok: false, error: "Order is cancelled." };
  if (order.payment_status === "paid") {
    return { ok: true, orderNumber, alreadyPaid: true };
  }

  // Tamper guard: the amount the gateway actually settled must match the
  // order total (BDT, ±1 for gateway float rounding). A mismatch never marks
  // the order paid.
  if (paidAmount == null || Math.abs(Math.round(paidAmount) - order.total) > 1) {
    console.error(
      `settle amount mismatch for ${orderNumber}: paid ${paidAmount} vs total ${order.total}`,
    );
    return { ok: false, error: "Payment amount mismatch." };
  }

  const { error: updErr } = await db
    .from("orders")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      payment_ref: paymentRef,
      payment_gateway: "sslcommerz",
    } as never)
    .eq("id", order.id);
  if (updErr) return { ok: false, error: updErr.message };

  await db.from("order_status_history" as never).insert({
    order_id: order.id,
    status: order.status,
    note: "Payment received via SSLCommerz",
    changed_by: "payment-gateway",
  } as never);

  // Fail-soft confirmation email + invoice — never let a broken render undo a
  // settled payment.
  if (order.customer_email) {
    try {
      const settings = await getSettings();
      const { data: itemRows } = await db
        .from("order_items")
        .select("title, qty, unit_price, line_total")
        .eq("order_id", order.id)
        .overrideTypes<SettleItemRow[], { merge: false }>();
      const items = (itemRows ?? []).map((i) => ({
        title: i.title, qty: i.qty, unitPrice: i.unit_price, lineTotal: i.line_total,
      }));
      const invoiceData = buildInvoiceData(
        {
          orderNumber: order.order_number, createdAt: order.created_at,
          status: order.status, paymentStatus: "paid",
          customerName: order.customer_name, customerPhone: order.customer_phone,
          customerEmail: order.customer_email,
          division: order.division, district: order.district, area: order.area,
          addressLine: order.address_line, landmark: order.landmark,
          items, subtotal: order.subtotal, deliveryFee: order.delivery_fee,
          advanceTotal: order.advance_total ?? 0, discountTotal: order.discount_total ?? 0,
          total: order.total,
        },
        settings, BRAND_NAME,
      );
      const pdf = await generateInvoicePdf(invoiceData);
      await sendOrderEmail(
        "placed",
        {
          orderNumber: order.order_number, customerName: order.customer_name,
          customerEmail: order.customer_email, status: "paid",
          items: items.map((i) => ({ title: i.title, qty: i.qty, lineTotal: i.lineTotal })),
          subtotal: order.subtotal, deliveryFee: order.delivery_fee,
          advanceTotal: order.advance_total ?? 0, discountTotal: order.discount_total ?? 0,
          total: order.total,
        },
        { filename: `invoice-${order.order_number}.pdf`, content: pdf },
      );
    } catch (err) {
      console.error("settle confirmation email failed:", err);
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  return { ok: true, orderNumber, alreadyPaid: false };
}

/**
 * Void a pending online order whose payment failed or was cancelled: cancels it
 * and restores stock atomically via the existing `cancel_order` RPC. Safe to
 * call on an already-cancelled order (the RPC's `cannot_cancel_from` guard is
 * treated as a no-op success).
 */
export async function voidOnlineOrder(orderNumber: string, reason: string): Promise<void> {
  const db = createAdminSupabase();
  const { data: order } = await db
    .from("orders")
    .select("id, payment_status")
    .eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes<{ id: string; payment_status: string }, { merge: false }>();
  if (!order) return;
  // Never void an order that already settled (e.g. a late cancel after a
  // successful IPN).
  if (order.payment_status === "paid") return;

  const { error } = await db.rpc("cancel_order" as never, {
    p_order_id: order.id, p_reason: reason, p_changed_by: "payment-gateway",
  } as never);
  if (error && !error.message.includes("cannot_cancel_from")) {
    console.error("voidOnlineOrder cancel_order failed:", error);
  }
  revalidatePath("/admin/orders");
}
