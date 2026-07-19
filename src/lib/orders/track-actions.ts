"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { buildTrackingSteps, type TrackStep } from "@/lib/orders/tracking-steps";
import { isRateLimited } from "@/lib/orders/track-throttle";
import { findVerifiedOrder } from "@/lib/orders/verified-order";

/** Mask a customer name for public display: first name + first initial of the
 *  last word, e.g. "Rima Islam" → "Rima I.", "Rima" → "Rima". */
function maskName(full: string): string {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first} ${last[0]!.toUpperCase()}.` : first;
}

/** The public, non-sensitive view of an order shown on `/track-order`. The
 *  customer name is MASKED here; the invoice (proven by the phone) may show the
 *  full name. */
export type PublicOrderView = {
  orderNumber: string;
  /** Full ISO timestamp. */
  createdAt: string;
  status: string;
  steps: TrackStep[];
  /** Masked — first name + last initial. */
  customerName: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: { title: string; qty: number; unitPrice: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  advanceTotal: number;
  total: number;
};

export type TrackOrderResult =
  | { ok: true; order: PublicOrderView }
  | { ok: false; error: string };

/**
 * Public order lookup: order#+phone in, a masked `PublicOrderView` out. Applies
 * the best-effort per-IP throttle, verifies via `findVerifiedOrder`, and on a
 * hit builds the tracking timeline from `order_status_history`. A miss returns
 * the SAME generic message as a wrong phone — never reveals whether the order
 * exists.
 */
export async function trackOrder({
  orderNumber,
  phone,
}: {
  orderNumber: string;
  phone: string;
}): Promise<TrackOrderResult> {
  if (await isRateLimited()) {
    return { ok: false, error: "Too many attempts. Please try again shortly." };
  }

  const row = await findVerifiedOrder(orderNumber.trim(), phone.trim());
  if (!row) {
    return { ok: false, error: "We couldn't find an order with those details." };
  }

  // Timeline: `order_status_history` isn't a selectable relation of `orders`
  // from this side, so it's a separate service-role read by `order_id`. A
  // failure is fail-soft (empty timeline) — the order itself was found.
  const db = createAdminSupabase();
  const { data: hist, error: histError } = await db
    .from("order_status_history")
    .select("status")
    .eq("order_id", row.id)
    .order("created_at", { ascending: true })
    .overrideTypes<{ status: string }[], { merge: false }>();
  if (histError) console.error("trackOrder history read failed:", histError);
  const historyStatuses = (hist ?? []).map((h) => h.status);

  const order: PublicOrderView = {
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    steps: buildTrackingSteps(row.status, historyStatuses),
    customerName: maskName(row.customer_name),
    carrier: row.carrier,
    trackingNumber: row.tracking_number,
    trackingUrl: row.tracking_url,
    items: (row.order_items ?? []).map((i) => ({
      title: i.title,
      qty: i.qty,
      unitPrice: i.unit_price,
      lineTotal: i.line_total,
    })),
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    advanceTotal: row.advance_total,
    total: row.total,
  };
  return { ok: true, order };
}
