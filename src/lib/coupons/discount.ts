/** How a coupon discounts. `percent` uses a 1–100 %; `fixed` takes a whole-Taka
 *  amount off the subtotal; `free_shipping` waives the delivery fee (no subtotal
 *  discount). */
export type CouponType = "percent" | "fixed" | "free_shipping";

export type CouponKind =
  | { type: "percent"; pct: number }
  | { type: "fixed"; amount: number }
  | { type: "free_shipping" };

/** Build a `CouponKind` from the stored/applied fields (type + both numbers).
 *  Shared by the checkout preview, the cart, and `createOrder` so the math has
 *  one source of truth. */
export function couponKind(input: {
  type: CouponType;
  discountPct: number;
  discountAmount: number;
}): CouponKind {
  if (input.type === "free_shipping") return { type: "free_shipping" };
  return input.type === "fixed"
    ? { type: "fixed", amount: input.discountAmount }
    : { type: "percent", pct: input.discountPct };
}

/** Whole-Taka SUBTOTAL discount for a coupon, capped at the subtotal (a discount
 *  can never exceed what's being paid). Free-shipping gives no subtotal discount
 *  — it waives delivery instead (see `couponIsFreeShipping`). Pure — the single
 *  source of truth for the checkout preview AND `createOrder`'s authoritative
 *  figure. */
export function computeCouponDiscount(kind: CouponKind, subtotal: number): number {
  if (subtotal <= 0) return 0;
  if (kind.type === "free_shipping") return 0;
  if (kind.type === "fixed") {
    return Math.min(subtotal, Math.max(0, Math.round(kind.amount)));
  }
  if (kind.pct <= 0) return 0;
  return Math.min(subtotal, Math.round((subtotal * kind.pct) / 100));
}

/** Whether a coupon waives the delivery fee. */
export function couponIsFreeShipping(input: { type: CouponType }): boolean {
  return input.type === "free_shipping";
}

/** Short human label for an applied coupon, e.g. "15% off", "৳100 off", or
 *  "Free shipping". */
export function couponLabel(input: {
  type: CouponType;
  discountPct: number;
  discountAmount: number;
}): string {
  if (input.type === "free_shipping") return "Free shipping";
  return input.type === "fixed"
    ? `৳${input.discountAmount.toLocaleString("en-US")} off`
    : `${input.discountPct}% off`;
}
