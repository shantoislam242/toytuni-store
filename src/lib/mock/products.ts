import type { Product, ProductDetail, Review } from "@/lib/types";
import { giftKits, giftCards } from "./gifts";

const neemTeak = [
  { name: "Neem", tone: "neem-soft" as const },
  { name: "Teak", tone: "wood" as const },
];

export const products: Product[] = [
  {
    slug: "neem-rattle-set",
    sku: "NWR-0001",
    titleBn: "Neem Wood Rattle Set",
    price: 850,
    compareAtPrice: 1000,
    rating: 4.8,
    reviewCount: 124,
    ageTierSlug: "0-6m",
    badge: "Best Seller",
    imageTones: ["mustard", "cream"],
    categorySlug: "rattles",
    imageLabelBn: "Rattle",
    variants: neemTeak,
  },
  {
    slug: "stacking-ring-tower",
    sku: "NWR-0002",
    titleBn: "Stacking Ring Tower",
    price: 1150,
    rating: 4.9,
    reviewCount: 98,
    ageTierSlug: "1-2y",
    badge: "Best Seller",
    imageTones: ["neem-soft", "cream"],
    categorySlug: "stacking",
    imageLabelBn: "Stacking Ring",
    variants: neemTeak,
  },
  {
    slug: "wooden-shape-sorter",
    sku: "NWR-0003",
    titleBn: "Wooden Shape Sorter",
    price: 980,
    rating: 4.7,
    reviewCount: 76,
    ageTierSlug: "1-2y",
    imageTones: ["terracotta", "cream"],
    categorySlug: "puzzles",
    imageLabelBn: "Shape Sorter",
  },
  {
    slug: "pull-along-duck",
    sku: "NWR-0004",
    titleBn: "Pull-along Duck",
    price: 1290,
    rating: 4.6,
    reviewCount: 54,
    ageTierSlug: "1-2y",
    badge: "New",
    imageTones: ["mustard", "cream"],
    categorySlug: "push-pull",
    imageLabelBn: "Pull Duck",
  },
  {
    slug: "neem-teether-ring",
    sku: "NWR-0005",
    titleBn: "Neem Teether Ring",
    price: 420,
    rating: 4.9,
    reviewCount: 211,
    ageTierSlug: "0-6m",
    badge: "Best Seller",
    imageTones: ["blush", "cream"],
    categorySlug: "teethers",
    imageLabelBn: "Teether Ring",
  },
  {
    slug: "building-block-set",
    sku: "NWR-0006",
    titleBn: "Building Block Set (24 pcs)",
    price: 1650,
    compareAtPrice: 1900,
    rating: 4.8,
    reviewCount: 142,
    ageTierSlug: "2-3y-plus",
    imageTones: ["dusty-blue", "cream"],
    categorySlug: "blocks",
    imageLabelBn: "Block Set",
    variants: neemTeak,
  },
  {
    slug: "object-permanence-box",
    sku: "NWR-0007",
    titleBn: "Montessori Object Permanence Box",
    price: 1100,
    rating: 4.9,
    reviewCount: 67,
    ageTierSlug: "6-12m",
    badge: "New",
    imageTones: ["neem", "cream"],
    categorySlug: "montessori",
    imageLabelBn: "Permanence Box",
  },
  {
    slug: "rocker-ride-horse",
    sku: "NWR-0008",
    titleBn: "Rocker Ride-on Horse",
    price: 3200,
    compareAtPrice: 3600,
    rating: 4.7,
    reviewCount: 39,
    ageTierSlug: "2-3y-plus",
    badge: "Limited",
    imageTones: ["wood", "cream"],
    categorySlug: "ride-on",
    imageLabelBn: "Rocker Horse",
  },
  {
    slug: "sensory-ball-set",
    sku: "NWR-0009",
    titleBn: "Sensory Ball Set",
    price: 760,
    rating: 4.6,
    reviewCount: 88,
    ageTierSlug: "6-12m",
    badge: "New",
    imageTones: ["blush", "cream"],
    categorySlug: "rattles",
    imageLabelBn: "Sensory Balls",
  },
  {
    slug: "animal-puzzle",
    sku: "NWR-0010",
    titleBn: "Wooden Puzzle — Animals",
    price: 640,
    rating: 4.8,
    reviewCount: 103,
    ageTierSlug: "2-3y-plus",
    imageTones: ["terracotta", "cream"],
    categorySlug: "puzzles",
    imageLabelBn: "Animal Puzzle",
  },
  {
    slug: "soft-cloth-book",
    sku: "NWR-0011",
    titleBn: "Soft Cloth Crinkle Book",
    price: 380,
    rating: 4.7,
    reviewCount: 156,
    ageTierSlug: "0-6m",
    badge: "New",
    imageTones: ["dusty-blue", "cream"],
    categorySlug: "rattles",
    imageLabelBn: "Cloth Book",
  },
  {
    slug: "wooden-xylophone",
    sku: "NWR-0012",
    titleBn: "Wooden Xylophone",
    price: 1450,
    compareAtPrice: 1700,
    rating: 4.9,
    reviewCount: 87,
    ageTierSlug: "1-2y",
    badge: "Best Seller",
    imageTones: ["mustard", "cream"],
    categorySlug: "montessori",
    imageLabelBn: "Xylophone",
    variants: neemTeak,
  },
  {
    slug: "lacing-beads-set",
    sku: "NWR-0013",
    titleBn: "Lacing Beads Set",
    price: 890,
    rating: 4.6,
    reviewCount: 64,
    ageTierSlug: "2-3y-plus",
    imageTones: ["blush", "cream"],
    categorySlug: "stacking",
    imageLabelBn: "Lacing Beads",
  },
  {
    slug: "baby-gym-arch",
    sku: "NWR-0014",
    titleBn: "Wooden Baby Gym Arch",
    price: 2400,
    compareAtPrice: 2800,
    rating: 4.8,
    reviewCount: 49,
    ageTierSlug: "0-6m",
    badge: "Limited",
    imageTones: ["neem", "cream"],
    categorySlug: "rattles",
    imageLabelBn: "Baby Gym",
  },
  {
    slug: "counting-abacus",
    sku: "NWR-0015",
    titleBn: "Counting Abacus",
    price: 1320,
    rating: 4.7,
    reviewCount: 72,
    ageTierSlug: "2-3y-plus",
    badge: "New",
    imageTones: ["terracotta", "cream"],
    categorySlug: "montessori",
    imageLabelBn: "Abacus",
    variants: neemTeak,
  },
  {
    slug: "nesting-cups",
    sku: "NWR-0016",
    titleBn: "Stacking Nesting Cups",
    price: 720,
    rating: 4.8,
    reviewCount: 118,
    ageTierSlug: "6-12m",
    badge: "Best Seller",
    imageTones: ["dusty-blue", "cream"],
    categorySlug: "stacking",
    imageLabelBn: "Nesting Cups",
  },
  {
    slug: "traditional-push-wagon",
    sku: "NWR-0017",
    titleBn: "Traditional Push Wagon",
    price: 2850,
    compareAtPrice: 3200,
    rating: 4.8,
    reviewCount: 61,
    ageTierSlug: "1-2y",
    badge: "New",
    imageTones: ["wood", "cream"],
    categorySlug: "toddler-walking",
    imageLabelBn: "Push Wagon",
  },
];

export const bestSellers = products.filter((p) => p.badge === "Best Seller");

// The Traditional Push Wagon is our latest launch — lead New Arrivals with it so
// it's visible up-front, then the rest keep their catalogue order.
const FEATURED_NEW_SLUG = "traditional-push-wagon";
export const newLaunches = products
  .filter((p) => p.badge === "New")
  .sort((a, b) =>
    a.slug === FEATURED_NEW_SLUG ? -1 : b.slug === FEATURED_NEW_SLUG ? 1 : 0,
  );

/**
 * Related products for the PDP "You may also like" rail.
 * Prefers same category, then same age tier; excludes the current product.
 */
export function relatedProducts(slug: string, limit = 10): Product[] {
  const current = products.find((p) => p.slug === slug);
  if (!current) return products.filter((p) => p.slug !== slug).slice(0, limit);

  const sameCategory = products.filter(
    (p) => p.slug !== slug && p.categorySlug === current.categorySlug,
  );
  const sameAge = products.filter(
    (p) =>
      p.slug !== slug &&
      p.categorySlug !== current.categorySlug &&
      p.ageTierSlug === current.ageTierSlug,
  );
  const rest = products.filter(
    (p) =>
      p.slug !== slug &&
      p.categorySlug !== current.categorySlug &&
      p.ageTierSlug !== current.ageTierSlug,
  );

  return [...sameCategory, ...sameAge, ...rest].slice(0, limit);
}

// Curated tab selections for the homepage product module.
export const giftPicks = products.filter((p) => p.price >= 1000);
// Deterministic "random" discount from a slug seed, so the server and client
// render the same value (no hydration mismatch). UI-only — no pricing backend.
function seededDiscountPct(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const choices = [10, 15, 20, 25, 30, 35];
  return choices[h % choices.length];
}

// Deals tab — a spread of products shown at a discount. Items already marked
// down keep their real compareAtPrice; the rest get a deterministic mock
// discount so the whole rail reads as on-sale (UI demo, not backend pricing).
export const deals: Product[] = products.slice(0, 10).map((p) => {
  if (p.compareAtPrice != null && p.compareAtPrice > p.price) return p;
  const pct = seededDiscountPct(p.slug);
  return { ...p, compareAtPrice: Math.round(p.price / (1 - pct / 100)) };
});
export const neemWood = products.filter((p) =>
  [
    "neem-rattle-set",
    "neem-teether-ring",
    "stacking-ring-tower",
    "wooden-shape-sorter",
    "building-block-set",
    "object-permanence-box",
  ].includes(p.slug),
);

// Everything the cart can resolve: catalogue products + gift kits + gift cards.
const sellable: Product[] = [...products, ...giftKits, ...giftCards];

export const productBySlug = (slug: string) =>
  sellable.find((p) => p.slug === slug);

const productImageSrcs: Record<string, string[]> = {
  "neem-rattle-set": [
    "/images/products/neem-rattle-set/1.webp",
    "/images/products/neem-rattle-set/2.webp",
  ],
  "stacking-ring-tower": [
    "/images/products/stacking-ring-tower/1.jpg",
    "/images/products/stacking-ring-tower/2.jpg",
  ],
  "wooden-shape-sorter": [
    "/images/products/wooden-shape-sorter/1.jpg",
    "/images/products/wooden-shape-sorter/2.jpg",
  ],
  "pull-along-duck": [
    "/images/products/pull-along-duck/1.jpg",
    "/images/products/pull-along-duck/2.jpg",
  ],
  "neem-teether-ring": [
    "/images/products/neem-teether-ring/1.jpg",
    "/images/products/neem-teether-ring/2.jpg",
  ],
  "building-block-set": [
    "/images/products/building-block-set/1.webp",
    "/images/products/building-block-set/2.jpg",
  ],
  "object-permanence-box": [
    "/images/products/object-permanence-box/1.jpg",
    "/images/products/object-permanence-box/2.jpg",
  ],
  "rocker-ride-horse": [
    "/images/products/rocker-ride-horse/1.jpg",
    "/images/products/rocker-ride-horse/2.webp",
  ],
  "sensory-ball-set": [
    "/images/products/sensory-ball-set/1.webp",
    "/images/products/sensory-ball-set/2.jpg",
  ],
  "animal-puzzle": [
    "/images/products/animal-puzzle/1.webp",
    "/images/products/animal-puzzle/2.webp",
  ],
  "soft-cloth-book": [
    "/images/products/soft-cloth-book/1.jpg",
    "/images/products/soft-cloth-book/2.jpg",
  ],
  "wooden-xylophone": [
    "/images/products/wooden-xylophone/1.jpg",
    "/images/products/wooden-xylophone/2.jpg",
  ],
  "traditional-push-wagon": [
    "/images/products/traditional-push-wagon/1.webp",
    "/images/products/traditional-push-wagon/2.webp",
    "/images/products/traditional-push-wagon/3.webp",
  ],
  "lacing-beads-set": [
    "/images/products/lacing-beads-set/1.webp",
    "/images/products/lacing-beads-set/2.webp",
  ],
  "baby-gym-arch": [
    "/images/products/baby-gym-arch/1.webp",
    "/images/products/baby-gym-arch/2.jpg",
  ],
  "counting-abacus": [
    "/images/products/counting-abacus/1.webp",
    "/images/products/counting-abacus/2.jpg",
  ],
  "nesting-cups": [
    "/images/products/nesting-cups/1.jpg",
    "/images/products/nesting-cups/2.jpg",
  ],
};

const detailCopy: Record<string, Omit<ProductDetail, "slug" | "imageSrcs">> = {
  "neem-rattle-set": {
    description:
      "A smooth neem-wood rattle set made for first grips, soft sounds, and safe sensory play during the earliest months.",
    features: ["Lightweight pieces for tiny hands", "Naturally finished neem wood", "Soft sound profile for newborn play"],
    benefits: ["Encourages grasping", "Supports auditory tracking", "Gentle on gums and palms"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "1D 13H 57M 44S",
    videoUrl: "https://www.youtube.com/shorts/72S8XD2g7-8",
  },
  "stacking-ring-tower": {
    description:
      "A classic stacking tower that helps toddlers compare size, practice hand-eye coordination, and build early problem-solving confidence.",
    features: ["Graduated wooden rings", "Rounded child-safe edges", "Stable base for repeated stacking"],
    benefits: ["Builds fine motor control", "Introduces sequencing", "Rewards focused independent play"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "1D 09H 22M 18S",
    videoUrl: "https://www.youtube.com/watch?v=AdwKN_689cE",
  },
  "wooden-shape-sorter": {
    description:
      "A sturdy wooden sorter with familiar shapes that invites matching, trial-and-error learning, and patient little victories.",
    features: ["Multiple shape blocks", "Easy-open sorting box", "Smooth natural wood finish"],
    benefits: ["Strengthens shape recognition", "Improves pincer grip", "Supports cause-and-effect learning"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "2D 04H 11M 05S",
    videoUrl: "https://www.youtube.com/shorts/AR6pE__KYmM",
  },
  "pull-along-duck": {
    description:
      "A cheerful pull-along companion for early walkers, designed to make movement practice feel playful and steady.",
    features: ["Rolling wooden wheels", "Easy-grip pull cord", "Balanced duck body"],
    benefits: ["Encourages walking practice", "Builds coordination", "Adds motion-led imaginative play"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "1D 18H 06M 39S",
    videoUrl: "https://www.youtube.com/watch?v=SwdxTjSNfVw",
  },
  "neem-teether-ring": {
    description:
      "A simple neem teether ring with a smooth holdable shape for soothing sore gums and busy baby hands.",
    features: ["Single-piece ring design", "Naturally antibacterial neem wood", "No paint or plastic coating"],
    benefits: ["Soothes teething discomfort", "Easy for babies to hold", "Supports early sensory exploration"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "18H 45M 12S",
  },
  "building-block-set": {
    description:
      "An open-ended 24-piece block set for stacking, balancing, sorting, and building a new idea every time.",
    features: ["24 wooden blocks", "Mixed shapes for creative builds", "Reusable cotton storage pouch"],
    benefits: ["Develops spatial thinking", "Encourages creativity", "Supports collaborative play"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "2D 01H 33M 28S",
    videoUrl: "https://www.youtube.com/watch?v=A30kL1DGxxo",
  },
  "object-permanence-box": {
    description:
      "A Montessori favorite that lets babies drop, find, and repeat as they discover that hidden objects still exist.",
    features: ["Ball-drop box", "Smooth fitted tray", "Right-sized ball for baby hands"],
    benefits: ["Teaches object permanence", "Builds concentration", "Refines hand-eye coordination"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "1D 02H 19M 53S",
  },
  "rocker-ride-horse": {
    description:
      "A steady wooden rocker for bigger toddlers who are ready for balance practice, pretend play, and joyful movement.",
    features: ["Curved wooden rocker base", "Comfortable seat height", "Easy-hold front handles"],
    benefits: ["Supports balance", "Builds core strength", "Encourages active indoor play"],
    deliveryEstimate: "Dhaka: 2-3 days, outside Dhaka: 4-6 days",
    saleCountdown: "3D 05H 08M 17S",
  },
  "sensory-ball-set": {
    description:
      "A tactile ball set for rolling, squeezing, passing, and exploring texture through simple baby-safe play.",
    features: ["Multiple sensory textures", "Soft rounded forms", "Sized for assisted baby play"],
    benefits: ["Stimulates touch", "Encourages reaching", "Supports two-hand coordination"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "23H 12M 41S",
  },
  "animal-puzzle": {
    description:
      "A friendly wooden animal puzzle that turns matching pieces into a calm focus-building activity.",
    features: ["Animal-shaped puzzle pieces", "Inset wooden board", "Easy-lift chunky pieces"],
    benefits: ["Improves visual matching", "Builds vocabulary prompts", "Develops patience and focus"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "2D 07H 40M 02S",
  },
  "soft-cloth-book": {
    description:
      "A soft crinkle book for tummy time, stroller moments, and early page-turning practice.",
    features: ["Soft washable pages", "Crinkle sensory layer", "High-contrast baby-friendly details"],
    benefits: ["Introduces book handling", "Supports sensory play", "Encourages visual attention"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "20H 36M 50S",
  },
  "wooden-xylophone": {
    description:
      "A bright wooden xylophone for toddlers who love rhythm, color, and the satisfying sound of making music themselves.",
    features: ["Tuned metal bars", "Wooden mallet included", "Compact toddler-friendly frame"],
    benefits: ["Explores rhythm", "Builds hand control", "Introduces musical confidence"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "1D 16H 24M 09S",
  },
  "lacing-beads-set": {
    description:
      "A threading bead set that makes fine-motor practice colorful, repeatable, and satisfying for preschool hands.",
    features: ["Large wooden beads", "Flexible lacing cord", "Mixed colors and shapes"],
    benefits: ["Strengthens finger control", "Practices pattern making", "Builds calm concentration"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "2D 12H 03M 26S",
  },
  "baby-gym-arch": {
    description:
      "A wooden baby gym arch for reaching, batting, and curious floor play in the earliest months.",
    features: ["Stable wooden frame", "Hanging sensory toys", "Easy assembly design"],
    benefits: ["Encourages reaching", "Supports tummy-time engagement", "Builds early visual tracking"],
    deliveryEstimate: "Dhaka: 2-3 days, outside Dhaka: 4-6 days",
    saleCountdown: "3D 00H 14M 11S",
  },
  "counting-abacus": {
    description:
      "A hands-on counting abacus for early number talk, color sorting, and quiet learning through movement.",
    features: ["Sliding wooden beads", "Stable counting frame", "Color-grouped rows"],
    benefits: ["Introduces counting", "Supports color recognition", "Builds early math confidence"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "1D 21H 58M 34S",
  },
  "nesting-cups": {
    description:
      "Stacking nesting cups that invite babies to build, knock down, hide, discover, and try again.",
    features: ["Graduated cup sizes", "Stack-and-nest design", "Smooth rounded rims"],
    benefits: ["Teaches size comparison", "Encourages repeated practice", "Supports problem-solving play"],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "19H 27M 43S",
  },
  "traditional-push-wagon": {
    description:
      "A hand-crafted wooden push wagon built to steady first steps. Little ones grip the handle and push — the sturdy beech-wood frame and controlled, smooth-rolling wheels give the balance and confidence that lead to independent walking.",
    features: [
      "Sturdy beech-wood build with rubber-rimmed wheels",
      "Controlled, smooth-rolling wheels for steady first steps",
      "Hand-crafted and finished with child-safe, water-based polish",
      "Holds up to 25 kg — roomy cart for toys and blocks",
    ],
    benefits: [
      "Aids independent walking and confidence",
      "Strengthens gross-motor skills and balance",
      "Encourages active, imaginative play",
    ],
    deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
    saleCountdown: "2D 06H 30M 00S",
    videoUrl: "https://www.youtube.com/watch?v=sIqrEWO1TmY",
    specs: {
      materials: "Sturdy rubber and beech wood",
      safety:
        "Hand-crafted with a child-safe, water-based polish; smooth-sanded edges and a stable, tip-resistant base",
      weight: "2.2 kg (supports up to 25 kg)",
      dimensions: "52 × 47 × 43 cm (L × W × H)",
      ageRange: "1–2 years (adult supervision recommended)",
    },
  },
};

export const productDetailBySlug = (slug: string): ProductDetail | undefined => {
  const copy = detailCopy[slug];
  if (!copy) return undefined;

  return {
    slug,
    imageSrcs: productImageSrcs[slug] ?? [],
    ...defaultDetail,
    ...copy,
  };
};

// Shared review pool so the reviews section is populated for every product.
const defaultReviews: Review[] = [
  {
    id: "r1",
    nameBn: "Sumaiya R.",
    locationBn: "Dhaka",
    rating: 5,
    dateBn: "2 weeks ago",
    titleBn: "Beautifully made",
    bodyBn:
      "The finish is so smooth and the wood feels solid. My little one loves it and I feel safe letting it be chewed on.",
    verifiedPurchase: true,
    helpfulCount: 14,
  },
  {
    id: "r2",
    nameBn: "Imran H.",
    locationBn: "Chattogram",
    rating: 4,
    dateBn: "1 month ago",
    titleBn: "Great quality, fast delivery",
    bodyBn:
      "Arrived in 2 days. Quality is genuinely good for the price. Would have liked a storage bag but otherwise happy.",
    verifiedPurchase: true,
    helpfulCount: 6,
  },
  {
    id: "r3",
    nameBn: "Nadia A.",
    locationBn: "Sylhet",
    rating: 5,
    dateBn: "1 month ago",
    titleBn: "Perfect gift",
    bodyBn:
      "Gifted this at a baby shower and the parents loved it. Feels premium and handmade.",
    verifiedPurchase: true,
    helpfulCount: 3,
  },
];

// Shared fallbacks so every product renders the full tab set even without
// bespoke copy. Per-product entries in `detailCopy` override these.
const defaultDetail: Omit<ProductDetail, "slug" | "imageSrcs"> = {
  description: "",
  features: [],
  benefits: [],
  deliveryEstimate: "Dhaka: 1-2 days, outside Dhaka: 3-5 days",
  saleCountdown: "1D 12H 00M 00S",
  whyPlay: [
    "Encourages open-ended, screen-free play",
    "Supports fine motor and sensory development",
    "Built to be passed down between siblings",
  ],
  howPlay: [
    "Introduce on a soft mat for younger babies",
    "Demonstrate once, then let the child lead",
    "Rotate with other toys to keep interest high",
  ],
  returnPolicy:
    "7-day exchange on unused items in original packaging. Report any defect within 48 hours of delivery with photos for a free replacement.",
  specs: {
    materials: "Natural neem wood with a non-toxic, food-grade finish",
    safety: "Smooth-sanded, no small detachable parts, lab-tested for lead and heavy metals",
    weight: "~0.4 kg",
    dimensions: "Approx. 12 × 8 × 6 cm",
    ageRange: "0–3 years (adult supervision recommended)",
  },
  reviews: defaultReviews,
};

