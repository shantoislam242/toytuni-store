import type { CustomerTier } from "@/lib/admin/customer-tier";

/** Loyalty points earned per Taka spent. 1 point per ৳10 (so ৳1,000 → 100 pts).
 *  Points are DERIVED from lifetime spend (no separate ledger) — a real,
 *  always-consistent number the customer dashboard can show. */
export const POINTS_PER_TAKA = 0.1;

/** Whole loyalty points for a lifetime spend (non-cancelled orders total). */
export function pointsFromSpend(totalSpent: number): number {
  if (totalSpent <= 0) return 0;
  return Math.floor(totalSpent * POINTS_PER_TAKA);
}

/** Display metadata (label + badge classes) for each spend-derived tier. */
export const TIER_META: Record<CustomerTier, { label: string; badge: string }> = {
  bronze: { label: "Bronze", badge: "bg-[#cd7f32]/15 text-[#96601f]" },
  silver: { label: "Silver", badge: "bg-slate-200 text-slate-600" },
  gold: { label: "Gold", badge: "bg-mustard/25 text-[#8a6d1a]" },
};
