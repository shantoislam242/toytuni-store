import { findVerifiedOrder } from "@/lib/orders/track-actions";
import { isRateLimited } from "@/lib/orders/track-throttle";
import { getSettings } from "@/lib/data/settings";
import { buildInvoiceData } from "@/lib/invoice/build-invoice-data";
import { generateInvoicePdf } from "@/lib/invoice/generate-invoice-pdf";
import { BRAND_NAME } from "@/lib/config";

export const runtime = "nodejs";

/**
 * Public track-order invoice PDF. Mirrors the OP-1 admin invoice route, but it
 * is POST + phone-verified: the order#+phone pair travels in the JSON body and
 * `findVerifiedOrder` RE-VERIFIES ownership on every request — the client is
 * never trusted, and a wrong phone / unknown order both 404 identically (no
 * enumeration). The invoice itself may show the real customer name: whoever
 * proved the phone is the customer.
 */
export async function POST(req: Request) {
  if (await isRateLimited()) {
    return new Response("Too many attempts", { status: 429 });
  }

  let body: { orderNumber?: unknown; phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const orderNumber =
    typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!orderNumber || !phone) return new Response("Not found", { status: 404 });

  const order = await findVerifiedOrder(orderNumber, phone);
  if (!order) return new Response("Not found", { status: 404 });

  const settings = await getSettings();
  const data = buildInvoiceData(
    {
      orderNumber: order.order_number,
      createdAt: order.created_at,
      status: order.status,
      paymentStatus: order.payment_status,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: order.customer_email,
      division: order.division,
      district: order.district,
      area: order.area,
      addressLine: order.address_line,
      landmark: order.landmark,
      items: (order.order_items ?? []).map((i) => ({
        title: i.title,
        qty: i.qty,
        unitPrice: i.unit_price,
        lineTotal: i.line_total,
      })),
      subtotal: order.subtotal,
      deliveryFee: order.delivery_fee,
      advanceTotal: order.advance_total,
      total: order.total,
    },
    settings,
    BRAND_NAME,
  );
  const pdf = await generateInvoicePdf(data);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.order_number}.pdf"`,
    },
  });
}
