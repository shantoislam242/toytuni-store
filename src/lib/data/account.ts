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
  total: number;
  items: AccountOrderItem[];
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
      "order_number, created_at, status, total, order_items(title, qty, unit_price, line_total, fulfillment_type)",
    )
    .eq("customer_email", email)
    .order("created_at", { ascending: false });

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
