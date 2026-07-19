"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { phoneMatches } from "@/lib/orders/phone-match";
import { buildTrackingSteps, type TrackStep } from "@/lib/orders/tracking-steps";
import { isRateLimited } from "@/lib/orders/track-throttle";

/**
 * Row returned by `findVerifiedOrder` — carries everything both the public
 * tracking view AND the invoice PDF need. `payment_status`, `tracking_*`,
 * `carrier` (migration 0011) post-date the hand-authored `database.types.ts`,
 * so the select can't be inferred and the shape is supplied via
 * `.overrideTypes()` (the pattern used across `src/lib/data/account.ts` and
 * `src/lib/admin/queries.ts`). `id` is included so the status-history follow-up
 * can filter by `order_id`.
 */
export type VerifiedOrderRow = {
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
      }[]
    | null;
};

const ORDER_SELECT =
  "id, order_number, created_at, status, payment_status, customer_name, customer_phone, customer_email, division, district, area, address_line, landmark, carrier, tracking_number, tracking_url, subtotal, delivery_fee, advance_total, total, order_items(title, qty, unit_price, line_total, fulfillment_type)";

/**
 * The single authorization gate for the public tracking surface. Fetches an
 * order by `order_number` with the service-role client (bypasses RLS —
 * SERVER-ONLY), then verifies the supplied phone against the stored
 * `customer_phone`. Returns the row ONLY on a phone match; a missing order and
 * a wrong phone both resolve to `null`, indistinguishable to the caller (no
 * enumeration). Shared by `trackOrder` and the track-invoice route so the
 * invoice re-verifies ownership on every download and never trusts the client.
 */
export async function findVerifiedOrder(
  orderNumber: string,
  phone: string,
): Promise<VerifiedOrderRow | null> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes<VerifiedOrderRow, { merge: false }>();

  if (error || !data) {
    if (error) console.error("findVerifiedOrder failed:", error);
    return null;
  }
  // The ONLY authorization: the order#+phone pair must match.
  if (!phoneMatches(data.customer_phone, phone)) return null;
  return data;
}

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
