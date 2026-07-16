export type ProductAvailability =
  | { state: "in_stock"; stockQty: number }
  | { state: "preorder"; shipDate: string }
  | { state: "sold_out" };

/** Derive availability from stock + an optional future ship date. */
export function getProductState(input: {
  stockQty: number;
  preorderShipDate: string | null;
  now?: Date;
}): ProductAvailability {
  const { stockQty, preorderShipDate, now = new Date() } = input;
  if (stockQty > 0) return { state: "in_stock", stockQty };
  if (preorderShipDate) {
    const ship = new Date(`${preorderShipDate}T00:00:00Z`);
    if (ship.getTime() > now.getTime())
      return { state: "preorder", shipDate: preorderShipDate };
  }
  return { state: "sold_out" };
}
