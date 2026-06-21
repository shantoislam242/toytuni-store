/** Format a BDT price with the Taka sign and thousands separators. */
export const formatTk = (amount: number): string =>
  `৳${amount.toLocaleString("en-US")}`;
