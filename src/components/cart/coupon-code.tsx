"use client";

import { useState, useTransition } from "react";
import { Check, Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCheckout } from "@/lib/checkout/checkout-context";
import { applyCoupon } from "@/lib/coupons/actions";
import { formatTk } from "@/lib/format";

/**
 * Coupon-code entry for the Order Summary. Validates against the REAL coupons
 * (the `applyCoupon` server action) and stores the result in checkout context so
 * it carries through to checkout + the placed order. The applied coupon shows as
 * a chip with Remove; if the subtotal later drops below the coupon's minimum the
 * discount is withheld with a hint (the cart total reads the coupon from context
 * and applies the same rule). `createOrder` re-validates authoritatively.
 */
export function CouponCode({ subtotal }: { subtotal: number }) {
  const { appliedCoupon, setAppliedCoupon } = useCheckout();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = code.trim();
    if (!entered) return;
    start(async () => {
      const r = await applyCoupon(entered, subtotal);
      if (r.ok) {
        setAppliedCoupon({ code: r.code, discountPct: r.discountPct, minSubtotal: r.minSubtotal });
        setError("");
        setCode("");
      } else {
        setAppliedCoupon(null);
        setError(r.error);
      }
    });
  };

  const belowMin = appliedCoupon != null && subtotal < appliedCoupon.minSubtotal;

  return (
    <div>
      <div className="flex items-center gap-1.5 text-ink-muted">
        <Ticket className="size-4 text-neem-deep" />
        <span className="text-sm font-medium">Coupon Code</span>
      </div>

      {appliedCoupon ? (
        <div className="mt-2 rounded-lg border border-neem/30 bg-neem/5 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-neem-deep">
              <Check className="size-4" /> {appliedCoupon.code} · {appliedCoupon.discountPct}% off
            </span>
            <button
              type="button"
              onClick={() => setAppliedCoupon(null)}
              className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-danger"
              aria-label="Remove coupon"
            >
              <X className="size-3.5" /> Remove
            </button>
          </div>
          {belowMin ? (
            <p className="mt-1 text-xs text-terracotta">
              Add {formatTk(appliedCoupon.minSubtotal - subtotal)} more to use this coupon.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <form onSubmit={apply} className="mt-2 flex items-center gap-2">
            <Input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); if (error) setError(""); }}
              placeholder="Enter coupon code"
              aria-label="Coupon code"
              className="h-10 flex-1 font-mono uppercase"
            />
            <Button type="submit" className="h-10 shrink-0" disabled={pending || !code.trim()}>
              {pending ? "…" : "Apply"}
            </Button>
          </form>
          {error ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
              <X className="size-3.5" /> {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
