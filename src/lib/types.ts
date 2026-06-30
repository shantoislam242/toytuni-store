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
  /** developmental focus shown on the "Shop by Age" cards (optional). */
  taglineBn?: string; // "Grasp, soothe & sense"
};

/** Product category used for "Browse by Category" and nav drawer. */
export type Category = {
  slug: string;
  nameBn: string;
  href: string;
  tone: Tone;
  /** short descriptor shown on the category PLP heading (optional). */
  taglineBn?: string;
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
  categorySlug: string; // Category.slug
  badge?: "New" | "Best Seller" | "Limited";
  /** at least two tones → hover-swap "image" */
  imageTones: [Tone, Tone];
  imageLabelBn: string; // shown on the placeholder
  /** "What's inside" — shown on gift-kit cards only (optional). */
  kitContents?: string[];
  variants?: Variant[];
};

/** Technical / spec table shown in the Details tab. */
export type ProductSpecs = {
  materials?: string;
  safety?: string;
  weight?: string;
  dimensions?: string;
  ageRange?: string;
};

/** A single customer review. */
export type Review = {
  id: string;
  nameBn: string;
  locationBn?: string;
  rating: number; // 1–5
  dateBn: string; // "2 weeks ago"
  titleBn?: string;
  bodyBn: string;
  verifiedPurchase?: boolean;
  helpfulCount?: number;
  images?: string[]; // paths under /public
};

/** Product detail content used by the product detail page. */
export type ProductDetail = {
  slug: string;
  description: string;
  features: string[];
  benefits: string[];
  imageSrcs: string[];
  deliveryEstimate: string;
  saleCountdown: string;
  /** tab content */
  whyPlay?: string[];
  howPlay?: string[];
  returnPolicy?: string;
  specs?: ProductSpecs;
  reviews?: Review[];
};

/** Hero banner slide. */
export type HeroSlide = {
  id: string;
  eyebrowBn: string;
  titleBn: string;
  subtitleBn: string;
  ctaBn: string;
  href: string;
  tone: Tone; // used for the text-legibility gradient over the image
  image: string; // background image path under /public
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

/** Safety / quality certification badge shown in the trust strip. */
export type Certification = {
  id: string;
  labelBn: string;
  /** lucide icon name handled in the component. */
  icon: "shield-check" | "leaf" | "baby" | "recycle" | "badge-check" | "flask-conical";
};

/** Live video-call / shop-via-call banner. */
export type VideoCallBanner = {
  titleBn: string;
  descBn: string;
  ctaBn: string;
  href: string;
};

/** A content block inside a blog post body. */
export type BlogBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

/** Blog category for the hub filter chips. */
export type BlogCategory = { slug: string; name: string };

/** A blog post (mock). Clean English field names (no legacy `Bn` suffix). */
export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string; // BlogCategory.slug
  dateISO: string; // "2026-05-12"
  readMins: number;
  coverTone: Tone; // PlaceholderImage tone
  coverLabel: string; // PlaceholderImage label
  body: BlogBlock[];
};
