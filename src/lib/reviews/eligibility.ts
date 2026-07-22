import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

export type ReviewEligibility = {
  eligible: boolean;
  orderId: string | null;
  alreadyReviewed: boolean;
  productId: string | null;
};

/** Can `email` review the product at `slug`? True iff a DELIVERED order with
 *  that customer_email contains the product, and no review by that email
 *  exists yet. Callers pass a SESSION-verified email — never client input. */
export async function getReviewEligibility(email: string, slug: string): Promise<ReviewEligibility> {
  const none: ReviewEligibility = { eligible: false, orderId: null, alreadyReviewed: false, productId: null };
  try {
    const db = createAdminSupabase();
    const { data: prod } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
    if (!prod) return none;
    // A delivered order for this email containing this product (newest first).
    const { data: items } = await db
      .from("order_items")
      .select("order_id, orders!inner(id, status, customer_email, created_at)")
      .eq("product_id", prod.id)
      .eq("orders.customer_email", email)
      .eq("orders.status", "delivered")
      .order("created_at", { ascending: false, referencedTable: "orders" })
      .limit(1)
      .overrideTypes<{ order_id: string }[], { merge: false }>();
    const orderId = items?.[0]?.order_id ?? null;
    const { data: existing } = await db
      .from("product_reviews" as never)
      .select("id")
      .eq("product_id", prod.id)
      .eq("customer_email", email)
      .maybeSingle();
    const alreadyReviewed = Boolean(existing);
    return { eligible: Boolean(orderId) && !alreadyReviewed, orderId, alreadyReviewed, productId: prod.id };
  } catch (err) {
    console.error("getReviewEligibility failed:", err);
    return none;
  }
}
