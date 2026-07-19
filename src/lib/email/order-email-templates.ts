import { BRAND_NAME } from "@/lib/config";

export type OrderEmailKind = "placed" | "shipped" | "delivered" | "cancelled";
export type OrderEmailData = {
  orderNumber: string; customerName: string; customerEmail: string; status: string;
  items: { title: string; qty: number; lineTotal: number }[];
  subtotal: number; deliveryFee: number; advanceTotal: number; total: number;
  carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null;
};

// Email clients (esp. Outlook) frequently fail to render the Bengali Taka
// glyph (৳ U+09F3) — same reason invoices use the ASCII "Tk" prefix — so
// order emails format amounts with "Tk" instead of the @/lib/format glyph.
function formatTk(amount: number): string {
  return `Tk ${amount.toLocaleString("en-US")}`;
}

const HEADING: Record<OrderEmailKind, string> = {
  placed: "Thank you for your order!",
  shipped: "Your order is on the way",
  delivered: "Your order was delivered",
  cancelled: "Your order was cancelled",
};
const SUBJECT: Record<OrderEmailKind, (o: OrderEmailData) => string> = {
  placed: (o) => `${BRAND_NAME} — order ${o.orderNumber} confirmed`,
  shipped: (o) => `${BRAND_NAME} — order ${o.orderNumber} shipped`,
  delivered: (o) => `${BRAND_NAME} — order ${o.orderNumber} delivered`,
  cancelled: (o) => `${BRAND_NAME} — order ${o.orderNumber} cancelled`,
};

function itemsRows(o: OrderEmailData): string {
  return o.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.title} × ${i.qty}</td><td align="right" style="padding:4px 0">${formatTk(i.lineTotal)}</td></tr>`,
    )
    .join("");
}

function trackingBlock(o: OrderEmailData): string {
  if (!o.trackingNumber) return "";
  const carrier = o.carrier ?? "Courier";
  const line = `${carrier} · ${o.trackingNumber}`;
  const linked = o.trackingUrl
    ? `<a href="${o.trackingUrl}">${line}</a>`
    : line;
  return `<p><strong>Tracking:</strong> ${linked}</p>`;
}

export function renderOrderEmail(
  kind: OrderEmailKind,
  o: OrderEmailData,
): { subject: string; html: string } {
  const totals = `
    <table width="100%" style="border-collapse:collapse">
      <tr><td>Subtotal</td><td align="right">${formatTk(o.subtotal)}</td></tr>
      <tr><td>Delivery</td><td align="right">${formatTk(o.deliveryFee)}</td></tr>
      ${o.advanceTotal > 0 ? `<tr><td>Advance paid</td><td align="right">${formatTk(o.advanceTotal)}</td></tr>` : ""}
      <tr><td><strong>Total</strong></td><td align="right"><strong>${formatTk(o.total)}</strong></td></tr>
    </table>`;

  const html = `<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#111111">
    <h2 style="margin-bottom:0">${BRAND_NAME}</h2>
    <h3 style="margin-top:4px">${HEADING[kind]}</h3>
    <p>Hi ${o.customerName}, this is an update on your order <strong>${o.orderNumber}</strong>.</p>
    ${kind === "shipped" ? trackingBlock(o) : ""}
    <table width="100%" style="border-collapse:collapse;margin:16px 0">${itemsRows(o)}</table>
    ${totals}
    <p style="color:#888888;font-size:12px;margin-top:24px">This is a Cash-on-Delivery order. Please keep the amount ready at the time of delivery.</p>
  </div>`;

  return { subject: SUBJECT[kind](o), html };
}
