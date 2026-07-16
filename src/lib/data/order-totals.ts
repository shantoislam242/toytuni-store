// Plain (non-server-action) helper. Kept out of orders.ts because that file has
// a file-level "use server" directive — required so createOrder can be called
// from the client checkout view — and Next.js requires every export of such a
// file to be an async Server Function. This sync helper can't live there.
export function computeOrderTotals(
  lines: { unitPrice: number; qty: number }[],
  deliveryFee: number,
): { subtotal: number; total: number; lineTotals: number[] } {
  const lineTotals = lines.map((l) => l.unitPrice * l.qty);
  const subtotal = lineTotals.reduce((s, n) => s + n, 0);
  return { subtotal, total: subtotal + deliveryFee, lineTotals };
}
