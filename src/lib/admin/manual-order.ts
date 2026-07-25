"use server";

import { revalidatePath } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createOrder, type CreateOrderInput, type CreateOrderResult } from "@/lib/data/orders";

/**
 * Place an order on a customer's behalf (admin phone/in-store order). A thin,
 * admin-gated wrapper around the same `createOrder` the storefront checkout
 * uses — so prices, stock, pre-order rules, delivery fee, and coupons are all
 * re-validated server-side exactly as for a self-service order. Delivery is
 * priced from the district via the `standard` method (the client-supplied
 * `deliveryFee` is display-only and ignored by `createOrder`).
 */
export async function createManualOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const res = await createOrder(input);
  if (res.ok) revalidatePath("/admin/orders");
  return res;
}
