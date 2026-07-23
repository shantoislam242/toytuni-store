/** The coupon fields the validator needs (a plain shape, DB-agnostic). */
export type CouponRow = {
  discount_pct: number;
  active: boolean;
  min_subtotal: number;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
};

export type CouponReason =
  | "not_found"
  | "inactive"
  | "expired"
  | "below_min"
  | "usage_exhausted";

export type CouponValidation =
  | { ok: true; discountPct: number }
  | { ok: false; reason: CouponReason };

/** A user-facing message for each rejection reason. */
export const COUPON_REASON_MESSAGE: Record<CouponReason, string> = {
  not_found: "This coupon code is not valid.",
  inactive: "This coupon is no longer active.",
  expired: "This coupon has expired.",
  below_min: "Your order doesn't meet this coupon's minimum.",
  usage_exhausted: "This coupon has reached its usage limit.",
};

/**
 * Validate a coupon against the current subtotal and time. Pure — reused by the
 * checkout apply action and by `createOrder`'s authoritative re-check. Checks in
 * order: exists → active → not expired → minimum met → usage left.
 */
export function validateCoupon(
  coupon: CouponRow | null,
  subtotal: number,
  now: Date,
): CouponValidation {
  if (!coupon) return { ok: false, reason: "not_found" };
  if (!coupon.active) return { ok: false, reason: "inactive" };
  if (coupon.expires_at) {
    const expiry = new Date(coupon.expires_at);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
      return { ok: false, reason: "expired" };
    }
  }
  if (subtotal < coupon.min_subtotal) return { ok: false, reason: "below_min" };
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    return { ok: false, reason: "usage_exhausted" };
  }
  return { ok: true, discountPct: coupon.discount_pct };
}
