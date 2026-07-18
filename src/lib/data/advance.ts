/**
 * Advance amount (whole BDT) for a pre-order line/unit: `pct`% of `amount`,
 * rounded to the nearest Taka. A null / zero / negative pct (no advance
 * configured) yields 0. Pure — the single source of truth for the "advance now"
 * figure across the PDP, checkout, and `createOrder`.
 */
export function computeAdvance(amount: number, pct: number | null): number {
  if (pct === null || pct <= 0) return 0;
  return Math.round((amount * pct) / 100);
}
