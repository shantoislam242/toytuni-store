/** Whole-Taka discount for a percentage coupon, capped at the subtotal (a
 *  discount can never exceed what's being paid). Pure — the single source of
 *  truth for the checkout preview AND `createOrder`'s authoritative figure. */
export function computeCouponDiscount(subtotal: number, pct: number): number {
  if (subtotal <= 0 || pct <= 0) return 0;
  return Math.min(subtotal, Math.round((subtotal * pct) / 100));
}
