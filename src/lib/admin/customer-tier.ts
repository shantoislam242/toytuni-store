export type CustomerTier = "bronze" | "silver" | "gold";
export type TierThresholds = { silver: number; gold: number };
export function customerTier(totalSpent: number, thresholds: TierThresholds): CustomerTier {
  if (totalSpent >= thresholds.gold) return "gold";
  if (totalSpent >= thresholds.silver) return "silver";
  return "bronze";
}
