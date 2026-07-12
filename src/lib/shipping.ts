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
