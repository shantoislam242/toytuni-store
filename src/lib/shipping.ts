/**
 * Two-zone flat delivery. The zone LABELS live here; the fees + which districts
 * count as "inside Dhaka" are admin-set (see `settings.shipping`) and passed in
 * as a `ShippingConfig`, so the same lookup drives the checkout preview, the
 * address modal, and `createOrder` — they never disagree.
 */

export type ShippingZoneId = "inside_dhaka" | "outside_dhaka";

export type ShippingZone = {
  id: ShippingZoneId;
  label: string; // "Inside Dhaka"
  fee: number; // indicative flat BDT (the real fee comes from ShippingConfig)
};

export const SHIPPING_ZONES: Record<ShippingZoneId, ShippingZone> = {
  inside_dhaka: { id: "inside_dhaka", label: "Inside Dhaka", fee: 80 },
  outside_dhaka: { id: "outside_dhaka", label: "Outside Dhaka", fee: 150 },
};

/** Admin-set delivery config (a subset of `settings.shipping`). */
export type ShippingConfig = {
  insideDhakaFee: number;
  outsideDhakaFee: number;
  freeShippingThreshold: number;
  /** Districts that get the inside-Dhaka (local) rate; everything else is outside. */
  insideDistricts: string[];
};

/** Resolve a district to its zone using the admin's inside-district list.
 *  Unknown / unlisted districts fall through to outside Dhaka. */
export function zoneForDistrict(district: string, insideDistricts: string[]): ShippingZone {
  const inside = new Set(insideDistricts.map((d) => d.trim()));
  return inside.has(district.trim()) ? SHIPPING_ZONES.inside_dhaka : SHIPPING_ZONES.outside_dhaka;
}

/** Whether a district gets the inside-Dhaka rate (also gates express delivery). */
export function isInsideDhaka(district: string, insideDistricts: string[]): boolean {
  return zoneForDistrict(district, insideDistricts).id === "inside_dhaka";
}

/** Flat standard delivery fee (BDT) for a district, from the admin config. */
export function shippingFeeFor(district: string, cfg: ShippingConfig): number {
  return isInsideDhaka(district, cfg.insideDistricts) ? cfg.insideDhakaFee : cfg.outsideDhakaFee;
}

/** Express delivery premium (BDT) — mirrors the mock shippingOptions express price. */
export const EXPRESS_FEE = 120;

/** Authoritative delivery fee for a chosen method — used by BOTH the checkout
 *  display and `createOrder` so they never disagree. An ineligible free/express
 *  selection falls back to standard. Standard = the district zone fee; express =
 *  the premium; free = 0. */
export function priceDelivery(
  methodId: string,
  subtotal: number,
  district: string,
  cfg: ShippingConfig,
): number {
  const freeUnlocked = subtotal >= cfg.freeShippingThreshold;
  const insideDhaka = isInsideDhaka(district, cfg.insideDistricts);
  let eff = methodId;
  if ((methodId === "free" && !freeUnlocked) || (methodId === "express" && !insideDhaka)) {
    eff = "standard";
  }
  if (eff === "express") return EXPRESS_FEE;
  if (eff === "free") return 0;
  return shippingFeeFor(district, cfg); // standard (and any unknown method)
}
