import type { Tone } from "@/lib/types";
import {
  loyaltyBenefits, loyaltySteps, loyaltyTiers, loyaltyRewards, loyaltyTestimonials, loyaltyFaqs,
  type LoyaltyIcon, type LoyaltyBenefit, type LoyaltyStep, type LoyaltyTier, type LoyaltyReward,
  type LoyaltyTestimonial, type LoyaltyFaq,
} from "@/lib/mock/loyalty";

export type {
  LoyaltyIcon, LoyaltyBenefit, LoyaltyStep, LoyaltyTier, LoyaltyReward, LoyaltyTestimonial, LoyaltyFaq,
} from "@/lib/mock/loyalty";

/** Editable Loyalty-page content (`site_settings` key `loyalty`). The demo
 *  member dashboard stays static (illustrative, not owner copy). */
export type LoyaltyContent = {
  hero: { title: string; subtitle: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string };
  benefits: LoyaltyBenefit[];
  steps: LoyaltyStep[];
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  testimonials: LoyaltyTestimonial[];
  faqs: LoyaltyFaq[];
  cta: { heading: string; subtitle: string; buttonLabel: string; buttonHref: string };
};

export const LOYALTY_ICONS: LoyaltyIcon[] = [
  "coins", "percent", "cake", "rocket", "crown", "headphones", "user-plus",
  "shopping-bag", "gift", "star", "medal", "gem", "truck", "ticket",
];
export const LOYALTY_TONES: Tone[] = [
  "cream", "neem", "neem-soft", "wood", "terracotta", "mustard", "dusty-blue", "blush",
];

export const DEFAULT_LOYALTY: LoyaltyContent = {
  hero: {
    title: "Loyalty Rewards",
    subtitle:
      "Earn rewards every time you shop for the toys your little one loves — and unlock member-only perks that grow with you.",
    primaryLabel: "Join Free",
    primaryHref: "/signin",
    secondaryLabel: "View Rewards",
    secondaryHref: "#rewards",
  },
  benefits: loyaltyBenefits,
  steps: loyaltySteps,
  tiers: loyaltyTiers,
  rewards: loyaltyRewards,
  testimonials: loyaltyTestimonials,
  faqs: loyaltyFaqs,
  cta: {
    heading: "Become a member today",
    subtitle: "Start earning rewards from your very first purchase.",
    buttonLabel: "Join Now",
    buttonHref: "/signin",
  },
};

// ── normalizers ──────────────────────────────────────────────────────────────
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const str = (v: unknown, fb: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fb;
const bool = (v: unknown): boolean => v === true;
const icon = (v: unknown): LoyaltyIcon => (LOYALTY_ICONS.includes(v as LoyaltyIcon) ? (v as LoyaltyIcon) : "star");
const tone = (v: unknown): Tone => (LOYALTY_TONES.includes(v as Tone) ? (v as Tone) : "neem-soft");
const posInt = (v: unknown, fb: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : fb;
const strList = (v: unknown, fb: string[]): string[] => {
  if (!Array.isArray(v)) return fb;
  const out = v.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim());
  return out.length ? out : fb;
};
function list<T>(v: unknown, fb: T[], map: (r: Record<string, unknown>, i: number) => T): T[] {
  if (!Array.isArray(v) || v.length === 0) return fb;
  return v.map((item, i) => map(rec(item), i));
}
const iconTitleDesc = (r: Record<string, unknown>, i: number) => ({
  id: str(r.id, `i${i}`),
  icon: icon(r.icon),
  title: str(r.title, "Untitled"),
  desc: str(r.desc, ""),
});

/** Shape any stored jsonb into a full `LoyaltyContent`. Pure — never throws. */
export function rowToLoyalty(value: unknown): LoyaltyContent {
  const v = rec(value);
  const d = DEFAULT_LOYALTY;
  const h = rec(v.hero);
  const cta = rec(v.cta);
  return {
    hero: {
      title: str(h.title, d.hero.title),
      subtitle: str(h.subtitle, d.hero.subtitle),
      primaryLabel: str(h.primaryLabel, d.hero.primaryLabel),
      primaryHref: str(h.primaryHref, d.hero.primaryHref),
      secondaryLabel: str(h.secondaryLabel, d.hero.secondaryLabel),
      secondaryHref: str(h.secondaryHref, d.hero.secondaryHref),
    },
    benefits: list(v.benefits, d.benefits, iconTitleDesc),
    steps: list(v.steps, d.steps, iconTitleDesc),
    tiers: list(v.tiers, d.tiers, (r, i) => ({
      id: str(r.id, `tier${i}`),
      name: str(r.name, "Tier"),
      icon: icon(r.icon),
      price: str(r.price, ""),
      tagline: str(r.tagline, ""),
      perks: strList(r.perks, []),
      featured: bool(r.featured),
    })),
    rewards: list(v.rewards, d.rewards, (r, i) => ({
      id: str(r.id, `r${i}`),
      points: posInt(r.points, 0),
      title: str(r.title, ""),
      icon: icon(r.icon),
    })),
    testimonials: list(v.testimonials, d.testimonials, (r, i) => ({
      id: str(r.id, `t${i}`),
      name: str(r.name, "Anonymous"),
      tier: str(r.tier, ""),
      quote: str(r.quote, ""),
      tone: tone(r.tone),
    })),
    faqs: list(v.faqs, d.faqs, (r) => ({ q: str(r.q, "Question"), a: str(r.a, "") })),
    cta: {
      heading: str(cta.heading, d.cta.heading),
      subtitle: str(cta.subtitle, d.cta.subtitle),
      buttonLabel: str(cta.buttonLabel, d.cta.buttonLabel),
      buttonHref: str(cta.buttonHref, d.cta.buttonHref),
    },
  };
}
