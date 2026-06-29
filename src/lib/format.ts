/** Format a BDT price with the Taka sign and thousands separators. */
export const formatTk = (amount: number): string =>
  `৳${amount.toLocaleString("en-US")}`;

/** Format an ISO date (YYYY-MM-DD) as e.g. "May 12, 2026". */
export const formatDate = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
