export type StockStatus = "out" | "low" | "in_stock";

/** Derive a product's stock status. 0 (or less) → out; >0 and ≤ threshold → low;
 *  otherwise in_stock. A threshold of 0 means nothing is ever "low". Pure. */
export function stockStatus(stockQty: number, threshold: number): StockStatus {
  if (stockQty <= 0) return "out";
  if (threshold > 0 && stockQty <= threshold) return "low";
  return "in_stock";
}

/** New stock after applying `delta`, clamped to ≥ 0 (stock never goes negative). Pure. */
export function clampAdjust(current: number, delta: number): number {
  return Math.max(0, current + delta);
}
