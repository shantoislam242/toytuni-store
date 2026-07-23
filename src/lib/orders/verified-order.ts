import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { phoneMatches } from "@/lib/orders/phone-match";

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
  discount_total: number;
  coupon_code: string | null;
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
  "id, order_number, created_at, status, payment_status, customer_name, customer_phone, customer_email, division, district, area, address_line, landmark, carrier, tracking_number, tracking_url, subtotal, delivery_fee, advance_total, discount_total, coupon_code, total, order_items(title, qty, unit_price, line_total, fulfillment_type)";

/**
 * The single authorization gate for the public tracking surface. Fetches an
 * order by `order_number` with the service-role client (bypasses RLS —
 * SERVER-ONLY), then verifies the supplied phone against the stored
 * `customer_phone`. Returns the row ONLY on a phone match; a missing order and
 * a wrong phone both resolve to `null`, indistinguishable to the caller (no
 * enumeration). Shared by `trackOrder` and the track-invoice route so the
 * invoice re-verifies ownership on every download and never trusts the client.
 *
 * NOTE: this lives in a plain `server-only` module (NOT a `"use server"` file)
 * on purpose — it returns the FULL unmasked order row, so it must never become
 * a client-invocable server-action endpoint. Only `trackOrder` (which masks the
 * name + throttles) is exposed as an action.
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
