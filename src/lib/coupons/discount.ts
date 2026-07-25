/** How a coupon discounts. `percent` uses a 1–100 %; `fixed` takes a whole-Taka
 *  amount off the subtotal. (A future `free_shipping` type will waive delivery
 *  rather than discount the subtotal.) */
export type CouponType = "percent" | "fixed";

export type CouponKind =
  | { type: "percent"; pct: number }
  | { type: "fixed"; amount: number };

/** Build a `CouponKind` from the stored/applied fields (type + both numbers).
 *  Shared by the checkout preview, the cart, and `createOrder` so the math has
 *  one source of truth. */
export function couponKind(input: {
  type: CouponType;
  discountPct: number;
  discountAmount: number;
}): CouponKind {
  return input.type === "fixed"
    ? { type: "fixed", amount: input.discountAmount }
    : { type: "percent", pct: input.discountPct };
}

/** Whole-Taka discount for a coupon, capped at the subtotal (a discount can
 *  never exceed what's being paid). Pure — the single source of truth for the
 *  checkout preview AND `createOrder`'s authoritative figure. */
export function computeCouponDiscount(kind: CouponKind, subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (kind.type === "fixed") {
    return Math.min(subtotal, Math.max(0, Math.round(kind.amount)));
  }
  if (kind.pct <= 0) return 0;
  return Math.min(subtotal, Math.round((subtotal * kind.pct) / 100));
}

/** Short human label for an applied coupon, e.g. "15% off" or "৳100 off". */
export function couponLabel(input: {
  type: CouponType;
  discountPct: number;
  discountAmount: number;
}): string {
  return input.type === "fixed"
    ? `৳${input.discountAmount.toLocaleString("en-US")} off`
    : `${input.discountPct}% off`;
}
