// Shared domain types for the storefront. All data is mock/static (Phase: homepage).

/** Brand color tokens usable as a placeholder/swatch tone. */
export type Tone =
  | "cream"
  | "neem"
  | "neem-soft"
  | "wood"
  | "terracotta"
  | "mustard"
  | "dusty-blue"
  | "blush";

/** Age-tier used for "Browse by Age" and product tagging. */
export type AgeTier = {
  slug: string; // "0-6m" | "6-12m" | "1-2y" | "2-3y-plus"
  labelBn: string; // "0–6 months"
  href: string; // stub collection route
  tone: Tone;
};

/** Product category used for "Browse by Category" and nav drawer. */
export type Category = {
  slug: string;
  nameBn: string;
  href: string;
  tone: Tone;
};

/** Visual-only variant swatch. */
export type Variant = {
  name: string; // "Neem" | "Teak"
  tone: Tone;
};

/** A product as needed by ProductCard. */
export type Product = {
  slug: string;
  titleBn: string;
  price: number; // BDT
  compareAtPrice?: number; // struck-through original price
  rating: number; // 0–5
  reviewCount: number;
  ageTierSlug: string;
  badge?: "New" | "Best Seller" | "Limited";
  /** at least two tones → hover-swap "image" */
  imageTones: [Tone, Tone];
  imageLabelBn: string; // shown on the placeholder
  variants?: Variant[];
};

/** Hero banner slide. */
export type HeroSlide = {
  id: string;
  eyebrowBn: string;
  titleBn: string;
  subtitleBn: string;
  ctaBn: string;
  href: string;
  tone: Tone;
};

/** Trust-strip stat. */
export type TrustStat = {
  id: string;
  valueBn: string; // "300k+"
  labelBn: string; // "Trusted parents"
  icon: "users" | "shield-check" | "star";
};

/** Customer testimonial. */
export type Testimonial = {
  id: string;
  nameBn: string;
  locationBn: string;
  quoteBn: string;
  rating: number;
  tone: Tone; // avatar placeholder tone
};

/** B2B / bulk program card. */
export type BulkProgram = {
  id: string;
  titleBn: string;
  descBn: string;
  href: string;
  tone: Tone;
};
