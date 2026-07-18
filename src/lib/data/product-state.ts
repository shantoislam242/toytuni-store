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

/** Derive availability from stock + an optional future ship date. For a
 *  pre-order, also surface the expected-delivery date and the advance-payment
 *  split (pct + computed amount from the unit price). */
export function getProductState(input: {
  stockQty: number;
  preorderShipDate: string | null;
  preorderDeliveryDate?: string | null;
  preorderAdvancePct?: number | null;
  price?: number;
  now?: Date;
}): ProductAvailability {
  const {
    stockQty,
    preorderShipDate,
    preorderDeliveryDate = null,
    preorderAdvancePct = null,
    price = 0,
    now = new Date(),
  } = input;
  if (stockQty > 0) return { state: "in_stock", stockQty };
  if (preorderShipDate) {
    const ship = new Date(`${preorderShipDate}T00:00:00Z`);
    if (ship.getTime() > now.getTime())
      return {
        state: "preorder",
        shipDate: preorderShipDate,
        deliveryDate: preorderDeliveryDate,
        advancePct: preorderAdvancePct,
        advanceAmount: computeAdvance(price, preorderAdvancePct),
      };
  }
  return { state: "sold_out" };
}
