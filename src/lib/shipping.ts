/**
 * Delivery-fee zones. Frontend only — swap the flat fees / district map for a
 * real rate API later. The public surface (`SHIPPING_ZONES`, `getShippingFee`)
 * is deliberately small so callers depend on the lookup, not the data shape.
 */

export type ShippingZoneId = "inside_dhaka" | "outside_dhaka";

export type ShippingZone = {
  id: ShippingZoneId;
  label: string; // "Inside Dhaka"
  fee: number; // flat BDT
};

export const SHIPPING_ZONES: Record<ShippingZoneId, ShippingZone> = {
  inside_dhaka: { id: "inside_dhaka", label: "Inside Dhaka", fee: 80 },
  outside_dhaka: { id: "outside_dhaka", label: "Outside Dhaka", fee: 150 },
};

// Districts served from the Dhaka metro zone. Everything else — including any
// unknown district — falls through to `outside_dhaka`.
// TODO: expand as more districts get local same-city rates.
const INSIDE_DHAKA_DISTRICTS = new Set<string>(["Dhaka"]);

/** Resolve a district name to its shipping zone (defaults to outside Dhaka). */
export function zoneForDistrict(district: string): ShippingZone {
  return INSIDE_DHAKA_DISTRICTS.has(district.trim())
    ? SHIPPING_ZONES.inside_dhaka
    : SHIPPING_ZONES.outside_dhaka;
}

/** Flat delivery fee (BDT) for a district. Unknown districts → outside Dhaka. */
export function getShippingFee(district: string): number {
  return zoneForDistrict(district).fee;
}

/** Delivery fee for a district using admin-set zone fees (settings-driven).
 *  Reuses the district→zone map; unknown districts → outside Dhaka. */
export function shippingFeeFor(
  district: string,
  fees: { insideDhakaFee: number; outsideDhakaFee: number },
): number {
  return zoneForDistrict(district).id === "inside_dhaka" ? fees.insideDhakaFee : fees.outsideDhakaFee;
}

/** Express delivery premium (BDT) — mirrors the mock shippingOptions express price. */
export const EXPRESS_FEE = 120;

/** Authoritative delivery fee for a chosen method — used by BOTH the checkout
 *  display and createOrder so they never disagree. Mirrors the checkout-view
 *  effective-method guards: an ineligible free/express selection falls back to
 *  standard. Standard = the district zone fee; express = the premium; free = 0. */
export function priceDelivery(
  methodId: string,
  subtotal: number,
  district: string,
  fees: { insideDhakaFee: number; outsideDhakaFee: number; freeShippingThreshold: number },
): number {
  const freeUnlocked = subtotal >= fees.freeShippingThreshold;
  const insideDhaka = zoneForDistrict(district).id === "inside_dhaka";
  let eff = methodId;
  if ((methodId === "free" && !freeUnlocked) || (methodId === "express" && !insideDhaka)) {
    eff = "standard";
  }
  if (eff === "express") return EXPRESS_FEE;
  if (eff === "free") return 0;
  return shippingFeeFor(district, fees); // standard (and any unknown method)
}
