import type { Metadata } from "next";
import { LoyaltyView } from "@/components/loyalty/loyalty-view";
import { getLoyaltyContent } from "@/lib/data/loyalty";

export function generateMetadata(): Metadata {
  return {
    title: "Loyalty Rewards",
    alternates: { canonical: "/loyalty" },
    description:
      "Join our free loyalty program and earn points on every order — unlock member discounts, birthday rewards, early access, and VIP perks.",
  };
}

export default async function Page() {
  const content = await getLoyaltyContent();
  return <LoyaltyView content={content} />;
}
