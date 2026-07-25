"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { shippingFeeFor, type ShippingConfig } from "@/lib/shipping";
import type { CouponType } from "@/lib/coupons/discount";
import type { Address } from "@/lib/types";

/** A coupon the shopper applied — its normalized code, type, and the numbers the
 *  discount math needs (percent uses `discountPct`, fixed uses `discountAmount`)
 *  plus the minimum. The discount is recomputed live from the current subtotal
 *  (the coupon shape is stable; `createOrder` re-validates authoritatively at
 *  order time). Lives in checkout context so it survives cart → checkout. */
export type AppliedCoupon = {
  code: string;
  type: CouponType;
  discountPct: number;
  discountAmount: number;
  minSubtotal: number;
};

/**
 * Shared checkout state — the delivery address chosen in the address modal and
 * its computed shipping fee. Lives above the cart and checkout pages so the
 * selection survives navigation (cart → checkout) and the payment step can read
 * it. Frontend only; nothing is persisted or submitted.
 */
type CheckoutContextValue = {
  address: Address | null;
  /** Flat delivery fee (BDT) for the chosen address's district; 0 if unset. */
  shippingFee: number;
  /** Admin-set delivery config (fees + inside-Dhaka districts), from settings. */
  shipping: ShippingConfig;
  /** Store the confirmed address; fee is derived from its district. */
  setDeliveryAddress: (address: Address) => void;
  clearDeliveryAddress: () => void;
  /** The applied coupon (shared by cart + checkout), or null. */
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({
  children,
  shipping,
}: {
  children: React.ReactNode;
  shipping: ShippingConfig;
}) {
  const [address, setAddress] = useState<Address | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const setDeliveryAddress = useCallback((next: Address) => {
    setAddress(next);
  }, []);

  const clearDeliveryAddress = useCallback(() => setAddress(null), []);

  const shippingFee = address ? shippingFeeFor(address.district, shipping) : 0;

  const value = useMemo<CheckoutContextValue>(
    () => ({
      address, shippingFee, shipping, setDeliveryAddress, clearDeliveryAddress,
      appliedCoupon, setAppliedCoupon,
    }),
    [address, shippingFee, shipping, setDeliveryAddress, clearDeliveryAddress, appliedCoupon],
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within a CheckoutProvider");
  return ctx;
}
