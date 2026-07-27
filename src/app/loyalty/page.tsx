import type { Metadata } from "next";
import { LoyaltyView, type LoyaltyMemberView } from "@/components/loyalty/loyalty-view";
import { getLoyaltyContent } from "@/lib/data/loyalty";
import { getSessionUser } from "@/lib/auth/session";
import { getCustomerDashboard } from "@/lib/data/account";
import { getSettings } from "@/lib/data/settings";
import { customerTier } from "@/lib/admin/customer-tier";
import { pointsFromSpend, TIER_META } from "@/lib/account/loyalty";
import { formatDate } from "@/lib/format";

export function generateMetadata(): Metadata {
  return {
    title: "Loyalty Rewards",
    alternates: { canonical: "/loyalty" },
    description:
      "Join our free loyalty program and earn points on every order — unlock member discounts, birthday rewards, early access, and VIP perks.",
  };
}

/** Progress (0–100, rounded) with a safe denominator. */
const pct = (num: number, den: number): number =>
  den <= 0 ? 100 : Math.round(Math.min(100, Math.max(0, (num / den) * 100)));

/**
 * Build the signed-in member's live rewards snapshot from lifetime spend
 * (points + spend-based tier, matching `/account`). Returns null for guests so
 * the dashboard stays locked. Reading the session makes this route dynamic —
 * fine for a per-member page; the marketing copy itself is still a cached read.
 */
async function loadMember(): Promise<LoyaltyMemberView> {
  const user = await getSessionUser();
  if (!user?.email) return null;

  const [dashboard, settings] = await Promise.all([
    getCustomerDashboard(user.email),
    getSettings(),
  ]);
  const spent = dashboard.totalSpent;
  const tier = customerTier(spent, settings.customerTiers);
  const points = pointsFromSpend(spent);
  const { silver, gold } = settings.customerTiers;

  let nextTierLabel: string | null;
  let progress: number;
  let pointsToNext: number;
  if (tier === "gold") {
    nextTierLabel = null;
    progress = 100;
    pointsToNext = 0;
  } else if (tier === "silver") {
    nextTierLabel = TIER_META.gold.label;
    progress = pct(spent - silver, gold - silver);
    pointsToNext = Math.max(0, pointsFromSpend(gold) - points);
  } else {
    nextTierLabel = TIER_META.silver.label;
    progress = pct(spent, silver);
    pointsToNext = Math.max(0, pointsFromSpend(silver) - points);
  }

  return {
    firstName: (user.user_metadata?.full_name ?? user.email).split(/[\s@]/)[0],
    tierLabel: TIER_META[tier].label,
    tierBadge: TIER_META[tier].badge,
    points,
    progress,
    nextTierLabel,
    pointsToNext,
    activity: dashboard.recentOrders.map((o) => ({
      id: o.orderNumber,
      label: `Order ${o.orderNumber}`,
      date: formatDate(o.createdAt),
      points: `+${pointsFromSpend(o.total).toLocaleString("en-US")}`,
    })),
  };
}

export default async function Page() {
  const [content, member] = await Promise.all([getLoyaltyContent(), loadMember()]);
  return <LoyaltyView content={content} member={member} />;
}
