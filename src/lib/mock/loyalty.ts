/**
 * Loyalty Rewards program content. Placeholder points/tiers/copy — edit here in
 * one place. Consumed by the reusable Loyalty page components. Icon keys map to
 * lucide components in the view (keeps JSX out of the data file).
 */

import type { Tone } from "@/lib/types";

export type LoyaltyIcon =
  | "coins"
  | "percent"
  | "cake"
  | "rocket"
  | "crown"
  | "headphones"
  | "user-plus"
  | "shopping-bag"
  | "gift"
  | "star"
  | "medal"
  | "gem"
  | "truck"
  | "ticket";

export type LoyaltyBenefit = { id: string; icon: LoyaltyIcon; title: string; desc: string };
export type LoyaltyStep = { id: string; icon: LoyaltyIcon; title: string; desc: string };
export type LoyaltyTier = {
  id: string;
  name: string;
  icon: LoyaltyIcon;
  price: string;
  tagline: string;
  perks: string[];
  featured?: boolean;
};
export type LoyaltyReward = { id: string; points: number; title: string; icon: LoyaltyIcon };
export type LoyaltyFaq = { q: string; a: string };
export type LoyaltyTestimonial = {
  id: string;
  name: string;
  tier: string;
  quote: string;
  tone: Tone;
};

export const loyaltyBenefits: LoyaltyBenefit[] = [
  { id: "earn", icon: "coins", title: "Earn Points", desc: "Collect points on every purchase you make." },
  { id: "discounts", icon: "percent", title: "Exclusive Discounts", desc: "Members unlock special member-only pricing." },
  { id: "birthday", icon: "cake", title: "Birthday Rewards", desc: "Celebrate your day with a little gift from us." },
  { id: "early", icon: "rocket", title: "Early Access", desc: "Shop new collections before everyone else." },
  { id: "vip", icon: "crown", title: "VIP Offers", desc: "Special campaigns just for our loyal members." },
  { id: "support", icon: "headphones", title: "Priority Support", desc: "Get faster, friendlier help whenever you need it." },
];

export const loyaltySteps: LoyaltyStep[] = [
  { id: "join", icon: "user-plus", title: "Join", desc: "Create your free account in seconds." },
  { id: "shop", icon: "shopping-bag", title: "Shop", desc: "Pick the handmade toys your little one will love." },
  { id: "earn", icon: "coins", title: "Earn Points", desc: "Collect points automatically on every order." },
  { id: "redeem", icon: "gift", title: "Redeem Rewards", desc: "Turn points into discounts, shipping, and gifts." },
];

export const loyaltyTiers: LoyaltyTier[] = [
  {
    id: "starter",
    name: "Starter",
    icon: "star",
    price: "Free",
    tagline: "Perfect for getting started",
    perks: [
      "Earn 1 point per ৳100 spent",
      "Member-only offers",
      "Points stay valid while active",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    icon: "medal",
    price: "Unlock at ৳10,000 spent",
    tagline: "Our most popular tier",
    perks: [
      "Everything in Starter",
      "Bonus points on every order",
      "Early access to new collections",
      "Birthday rewards",
    ],
    featured: true,
  },
  {
    id: "platinum",
    name: "Platinum",
    icon: "gem",
    price: "Unlock at ৳30,000 spent",
    tagline: "The full VIP experience",
    perks: [
      "Everything in Gold",
      "Highest points earn rate",
      "Exclusive member discounts",
      "Priority VIP support",
    ],
  },
];

export const loyaltyRewards: LoyaltyReward[] = [
  { id: "r1", points: 500, title: "5% Discount", icon: "percent" },
  { id: "r2", points: 1000, title: "Free Shipping", icon: "truck" },
  { id: "r3", points: 2000, title: "৳500 Voucher", icon: "ticket" },
  { id: "r4", points: 5000, title: "Exclusive Gift Box", icon: "gift" },
];

/** Mock member dashboard shown as a preview (not wired to real accounts yet). */
export const loyaltyDashboard = {
  tier: "Gold",
  points: 1250,
  nextTier: "Platinum",
  pointsToNext: 750,
  /** Progress toward the next tier, 0–100. */
  progress: 62,
  activity: [
    { id: "a1", label: "Neem Wood Rattle Set", points: "+85", date: "2 days ago" },
    { id: "a2", label: "Birthday reward", points: "+200", date: "1 week ago" },
    { id: "a3", label: "Redeemed free shipping", points: "−1,000", date: "3 weeks ago" },
  ],
};

export const loyaltyTestimonials: LoyaltyTestimonial[] = [
  {
    id: "t1",
    name: "Nadia R.",
    tier: "Gold member",
    quote: "The points add up faster than I expected — I got a free gift box for my daughter's birthday!",
    tone: "neem-soft",
  },
  {
    id: "t2",
    name: "Tanvir A.",
    tier: "Platinum member",
    quote: "Early access and VIP support make it feel genuinely special, not just another points card.",
    tone: "mustard",
  },
  {
    id: "t3",
    name: "Sadia K.",
    tier: "Gold member",
    quote: "I love that my points stay valid. It's the only loyalty program I actually keep using.",
    tone: "blush",
  },
];

export const loyaltyFaqs: LoyaltyFaq[] = [
  {
    q: "How do I earn points?",
    a: "You earn points automatically on every purchase — 1 point for every ৳100 you spend. Higher tiers and special campaigns earn bonus points.",
  },
  {
    q: "Do my points expire?",
    a: "Your points stay valid as long as your account stays active. We'll always let you know well in advance if anything changes.",
  },
  {
    q: "How do I redeem rewards?",
    a: "Once you've collected enough points, redeem them at checkout for discounts, free shipping, vouchers, or exclusive gifts.",
  },
  {
    q: "How do membership levels work?",
    a: "Everyone starts at Starter and moves up to Gold and Platinum as they shop. Each tier unlocks bigger rewards and more perks.",
  },
  {
    q: "What happens to points if I return an item?",
    a: "If you return an order, the points earned on it are simply adjusted from your balance — nothing to worry about.",
  },
];
