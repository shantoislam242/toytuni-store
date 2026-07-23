"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getShippingFee } from "@/lib/shipping";
import type { Address } from "@/lib/types";

/** A coupon the shopper applied — its normalized code + the resolved percentage
 *  and minimum. The discount is recomputed live from the current subtotal (the
 *  % is stable; `createOrder` re-validates authoritatively at order time). Lives
 *  in checkout context so it survives the cart → checkout navigation. */
export type AppliedCoupon = { code: string; discountPct: number; minSubtotal: number };

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
  /** Store the confirmed address; fee is derived from its district. */
  setDeliveryAddress: (address: Address) => void;
  clearDeliveryAddress: () => void;
  /** The applied coupon (shared by cart + checkout), or null. */
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const setDeliveryAddress = useCallback((next: Address) => {
    setAddress(next);
  }, []);

  const clearDeliveryAddress = useCallback(() => setAddress(null), []);

  const shippingFee = address ? getShippingFee(address.district) : 0;

  const value = useMemo<CheckoutContextValue>(
    () => ({
      address, shippingFee, setDeliveryAddress, clearDeliveryAddress,
      appliedCoupon, setAppliedCoupon,
    }),
    [address, shippingFee, setDeliveryAddress, clearDeliveryAddress, appliedCoupon],
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within a CheckoutProvider");
  return ctx;
}
