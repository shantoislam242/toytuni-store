"use server";

import { revalidatePath } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";

/** Mirrors the `orders.status` check constraint (`supabase/migrations/0001_init.sql`). */
const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Update an order's status. Server Action — reachable directly (not just via
 * the admin UI), so it re-checks admin itself rather than trusting the
 * `src/proxy.ts` gate or the admin layout's re-check.
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");

  if (!isOrderStatus(status)) {
    return { ok: false, error: `Invalid status: ${status}` };
  }

  const db = createAdminSupabase();
  const { error } = await db.from("orders").update({ status }).eq("id", orderId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return { ok: true };
}
