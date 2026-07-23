import { computeAdvance } from "./advance";

export type ProductAvailability =
  | { state: "in_stock"; stockQty: number }
  | {
      state: "preorder";
      shipDate: string;
      deliveryDate: string | null;
      advancePct: number | null;
      advanceAmount: number;
    }
  | { state: "sold_out" };

/** `date + days` as a UTC `YYYY-MM-DD` string. Pure/deterministic given the
 *  base date, so a computed pre-order ship date renders identically on the
 *  server and (cached) storefront. */
function isoDateAfter(base: Date, days: number): string {
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Derive availability from stock, per-product pre-order fields, and an optional
 * store-wide pre-order policy.
 *
 * Rule (in order):
 *  1. `stockQty > threshold` → in_stock (normal "Add to Cart").
 *  2. Otherwise (stock LOW or zero) and pre-order enabled: resolve a ship date —
 *     a *future* per-product `preorderShipDate` wins, else `now + leadDays` when
 *     a global lead time is configured — and return `preorder` (advance % falls
 *     back from the per-product value to the global default).
 *  3. Fallback (pre-order disabled, or no ship date resolvable): in_stock if any
 *     stock remains, else sold_out.
 *
 * All the policy inputs are optional and default to the pre-policy behavior
 * (threshold 0, enabled, no lead time), so existing callers/tests are
 * unaffected.
 */
export function getProductState(input: {
  stockQty: number;
  preorderShipDate: string | null;
  preorderDeliveryDate?: string | null;
  preorderAdvancePct?: number | null;
  price?: number;
  now?: Date;
  // Store-wide pre-order policy (from Settings):
  preorderEnabled?: boolean;
  preorderThreshold?: number;
  preorderLeadDays?: number | null;
  preorderDefaultAdvancePct?: number | null;
}): ProductAvailability {
  const {
    stockQty,
    preorderShipDate,
    preorderDeliveryDate = null,
    preorderAdvancePct = null,
    price = 0,
    now = new Date(),
    preorderEnabled = true,
    preorderThreshold = 0,
    preorderLeadDays = null,
    preorderDefaultAdvancePct = null,
  } = input;

  if (stockQty > preorderThreshold) return { state: "in_stock", stockQty };

  // Resolve a ship date. An explicit *future* per-product date ALWAYS makes the
  // product a pre-order (a deliberate manual setup shouldn't read "Sold out"
  // just because the global auto-flip is off). The global lead-time fallback
  // only applies when pre-order is enabled — that switch governs the automatic
  // low-stock flip, not an explicit per-product date.
  let shipDate: string | null = null;
  if (preorderShipDate) {
    const ship = new Date(`${preorderShipDate}T00:00:00Z`);
    if (ship.getTime() > now.getTime()) shipDate = preorderShipDate;
  }
  if (!shipDate && preorderEnabled && preorderLeadDays != null) {
    shipDate = isoDateAfter(now, preorderLeadDays);
  }
  if (shipDate) {
    const advancePct = preorderAdvancePct ?? preorderDefaultAdvancePct ?? null;
    return {
      state: "preorder",
      shipDate,
      deliveryDate: preorderDeliveryDate,
      advancePct,
      advanceAmount: computeAdvance(price, advancePct),
    };
  }

  // No ship date resolvable: low stock still sells; zero stock is sold out.
  return stockQty > 0 ? { state: "in_stock", stockQty } : { state: "sold_out" };
}
