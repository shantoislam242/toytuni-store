"use server";

import { revalidatePath } from "next/cache";
import { getIsAdmin } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeCode } from "@/lib/coupons/normalize";
import { computeCouponDiscount } from "@/lib/coupons/discount";
import { validateCoupon, COUPON_REASON_MESSAGE, type CouponRow } from "@/lib/coupons/validate";

export type CouponActionResult = { ok: true } | { ok: false; error: string };

/** Admin-supplied coupon fields. `expiresAt` is a `YYYY-MM-DD` day (or null);
 *  `usageLimit`/nulls mean "no limit". */
export type CouponInput = {
  code: string;
  discountPct: number;
  active: boolean;
  minSubtotal: number;
  expiresAt: string | null;
  usageLimit: number | null;
};

/** `coupons` postpends the generated types (migration 0017), so reads/writes use
 *  the `as never` escape hatch, same as `admin_users` / other post-generation
 *  tables in this repo. */
const COUPON_SELECT = "discount_pct, active, min_subtotal, expires_at, usage_limit, used_count";

/**
 * Validate a code against the current subtotal (checkout "Apply"). Server-side +
 * service-role — the storefront never reads `coupons` directly (RLS zero-policy).
 * Returns the normalized code, pct, and the computed discount, or a friendly
 * error. This is a PREVIEW; `createOrder` re-validates authoritatively before
 * the discount is actually applied.
 */
export async function applyCoupon(
  code: string,
  subtotal: number,
): Promise<{ ok: true; code: string; discountPct: number; discountAmount: number } | { ok: false; error: string }> {
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, error: "Enter a coupon code." };

  const db = createAdminSupabase();
  const { data } = await db
    .from("coupons" as never)
    .select(COUPON_SELECT)
    .eq("code", normalized)
    .maybeSingle()
    .overrideTypes<CouponRow, { merge: false }>();

  const v = validateCoupon(data ?? null, subtotal, new Date());
  if (!v.ok) return { ok: false, error: COUPON_REASON_MESSAGE[v.reason] };
  return {
    ok: true,
    code: normalized,
    discountPct: v.discountPct,
    discountAmount: computeCouponDiscount(subtotal, v.discountPct),
  };
}

/** Coupon codes: letters/numbers/dashes, must start alphanumeric. */
const CODE_RE = /^[A-Z0-9][A-Z0-9-]*$/;

type NormalizedCoupon = {
  code: string;
  discount_pct: number;
  active: boolean;
  min_subtotal: number;
  expires_at: string | null;
  usage_limit: number | null;
};

/** Validate + normalize admin input into a DB row (sans id/used_count). Expiry
 *  is stored as the END of the chosen day (UTC), so "expires 2026-08-01" stays
 *  valid through that whole day. */
function normalizeInput(input: CouponInput): { ok: true; row: NormalizedCoupon } | { ok: false; error: string } {
  const code = normalizeCode(input.code);
  if (!code) return { ok: false, error: "Coupon code is required." };
  if (!CODE_RE.test(code)) return { ok: false, error: "Code can use only letters, numbers and dashes." };
  if (!Number.isInteger(input.discountPct) || input.discountPct < 1 || input.discountPct > 100) {
    return { ok: false, error: "Discount must be a whole number from 1 to 100." };
  }
  if (!Number.isInteger(input.minSubtotal) || input.minSubtotal < 0) {
    return { ok: false, error: "Minimum order must be a non-negative whole number." };
  }
  if (input.usageLimit != null && (!Number.isInteger(input.usageLimit) || input.usageLimit < 1)) {
    return { ok: false, error: "Usage limit must be a whole number ≥ 1, or empty." };
  }
  let expires_at: string | null = null;
  if (input.expiresAt) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt) || Number.isNaN(new Date(input.expiresAt).getTime())) {
      return { ok: false, error: "Expiry must be a valid date, or empty." };
    }
    expires_at = `${input.expiresAt}T23:59:59Z`;
  }
  return {
    ok: true,
    row: {
      code,
      discount_pct: input.discountPct,
      active: input.active,
      min_subtotal: input.minSubtotal,
      expires_at,
      usage_limit: input.usageLimit,
    },
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Create a coupon. Admin-gated + service-role; 23505 (duplicate code) → clean message. */
export async function createCoupon(input: CouponInput): Promise<CouponActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const v = normalizeInput(input);
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { error } = await db.from("coupons" as never).insert(v.row as never);
  if (error) {
    if (error.code === "23505") return { ok: false, error: `A coupon with code "${v.row.code}" already exists.` };
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/coupons");
  return { ok: true };
}

/** Update a coupon's fields (code included — still unique-checked). Admin-gated. */
export async function updateCoupon(id: string, input: CouponInput): Promise<CouponActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!UUID_RE.test(id)) return { ok: false, error: "Coupon not found." };
  const v = normalizeInput(input);
  if (!v.ok) return v;
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("coupons" as never)
    .update({ ...v.row, updated_at: new Date().toISOString() } as never)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { ok: false, error: `A coupon with code "${v.row.code}" already exists.` };
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "Coupon not found." };
  revalidatePath("/admin/coupons");
  return { ok: true };
}

/** Delete a coupon. Admin-gated + service-role. */
export async function deleteCoupon(id: string): Promise<CouponActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!UUID_RE.test(id)) return { ok: false, error: "Coupon not found." };
  const db = createAdminSupabase();
  const { error } = await db.from("coupons" as never).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/coupons");
  return { ok: true };
}
