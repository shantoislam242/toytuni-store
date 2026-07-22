"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getReviewEligibility } from "@/lib/reviews/eligibility";
import { validateReviewInput, validateQuestion } from "@/lib/reviews/validation";

/** Display name for public review/question rows: metadata full name, else the
 *  email local part. The email itself is NEVER rendered publicly. */
function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> }): string {
  const meta = (user.user_metadata?.full_name as string | undefined)?.trim();
  return meta || (user.email ?? "Customer").split("@")[0];
}

export async function checkReviewEligibility(slug: string) {
  const user = await getSessionUser();
  if (!user?.email) return { signedIn: false, eligible: false, alreadyReviewed: false };
  const e = await getReviewEligibility(user.email, slug);
  return { signedIn: true, eligible: e.eligible, alreadyReviewed: e.alreadyReviewed };
}

export async function submitReview(
  slug: string, input: { rating: number; title?: string; body: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Please sign in to review." };
  const v = validateReviewInput(input);
  if (!v.ok) return v;
  // Server-side re-verification — the SESSION email, never client input.
  const e = await getReviewEligibility(user.email, slug);
  if (e.alreadyReviewed) return { ok: false, error: "You already reviewed this product." };
  if (!e.eligible || !e.productId) return { ok: false, error: "Reviews unlock once your order is delivered." };
  const db = createAdminSupabase();
  const { error } = await db.from("product_reviews" as never).insert({
    product_id: e.productId, order_id: e.orderId,
    customer_email: user.email, customer_name: displayName(user),
    rating: v.value.rating, title: v.value.title, body: v.value.body,
  } as never);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "You already reviewed this product." };
    console.error("submitReview failed:", error.message);
    return { ok: false, error: "Could not save your review. Please try again." };
  }
  revalidateTag("reviews", "max");
  revalidateTag("catalog", "max"); // aggregate rating changed (DB trigger)
  revalidatePath(`/products/${slug}`);
  return { ok: true };
}

export async function askQuestion(
  slug: string, question: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user?.email) return { ok: false, error: "Please sign in to ask a question." };
  const v = validateQuestion(question);
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { data: prod } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
  if (!prod) return { ok: false, error: "Product not found." };
  const { error } = await db.from("product_questions" as never).insert({
    product_id: prod.id, customer_email: user.email, customer_name: displayName(user), question: v.value,
  } as never);
  if (error) {
    console.error("askQuestion failed:", error.message);
    return { ok: false, error: "Could not send your question. Please try again." };
  }
  revalidatePath("/admin/reviews"); // the admin inbox; invisible publicly until answered
  return { ok: true };
}
