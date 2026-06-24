import type { Product } from "@/lib/types";

/**
 * Curated gift bundles. These live ONLY here (not in the main `products`
 * array), so they appear only on /gift — never in other PLPs or home rails.
 */
export const giftKits: Product[] = [
  {
    slug: "newborn-welcome-box",
    titleBn: "Newborn Welcome Box",
    price: 2400,
    compareAtPrice: 2800,
    rating: 4.9,
    reviewCount: 86,
    ageTierSlug: "0-6m",
    categorySlug: "gift-kit",
    badge: "Best Seller",
    imageTones: ["blush", "cream"],
    imageLabelBn: "Welcome Box",
    kitContents: ["Neem rattle", "Teether ring", "Cloth book", "Gift card"],
  },
  {
    slug: "neem-teether-duo-gift",
    titleBn: "Neem Teether Duo Gift",
    price: 1500,
    rating: 4.7,
    reviewCount: 54,
    ageTierSlug: "0-6m",
    categorySlug: "gift-kit",
    imageTones: ["mustard", "cream"],
    imageLabelBn: "Teether Duo",
    kitContents: ["2 neem teethers", "Muslin wrap", "Gift card"],
  },
  {
    slug: "sensory-play-bundle",
    titleBn: "Sensory Play Bundle",
    price: 1900,
    rating: 4.8,
    reviewCount: 63,
    ageTierSlug: "6-12m",
    categorySlug: "gift-kit",
    badge: "New",
    imageTones: ["dusty-blue", "cream"],
    imageLabelBn: "Sensory Bundle",
    kitContents: ["Sensory balls", "Nesting cups", "Gift card"],
  },
  {
    slug: "montessori-starter-set",
    titleBn: "Montessori Starter Set",
    price: 2800,
    compareAtPrice: 3200,
    rating: 4.9,
    reviewCount: 78,
    ageTierSlug: "1-2y",
    categorySlug: "gift-kit",
    badge: "Best Seller",
    imageTones: ["neem-soft", "cream"],
    imageLabelBn: "Montessori Set",
    kitContents: ["Object box", "Stacking ring", "Shape sorter", "Gift card"],
  },
  {
    slug: "first-birthday-kit",
    titleBn: "First Birthday Kit",
    price: 3200,
    rating: 4.8,
    reviewCount: 41,
    ageTierSlug: "1-2y",
    categorySlug: "gift-kit",
    badge: "Limited",
    imageTones: ["terracotta", "cream"],
    imageLabelBn: "Birthday Kit",
    kitContents: ["Pull-along toy", "Xylophone", "Greeting card", "Gift wrap"],
  },
  {
    slug: "big-kid-builder-box",
    titleBn: "Big-Kid Builder Box",
    price: 3600,
    rating: 4.7,
    reviewCount: 37,
    ageTierSlug: "2-3y-plus",
    categorySlug: "gift-kit",
    imageTones: ["wood", "cream"],
    imageLabelBn: "Builder Box",
    kitContents: ["Building blocks", "Animal puzzle", "Gift card"],
  },
];

/** Preset gift-card denominations (BDT). */
export const giftCardAmounts = [500, 1000, 2000, 3000] as const;

/**
 * Each denomination is a real Product so "Add to cart" creates a real cart
 * line. Not shown via ProductCard (the Gift Card block renders its own UI);
 * only the cart reads titleBn / price / imageTones for these.
 */
export const giftCards: Product[] = giftCardAmounts.map((amount) => ({
  slug: `gift-card-${amount}`,
  titleBn: `Gift Card — ৳${amount}`,
  price: amount,
  rating: 5,
  reviewCount: 0,
  ageTierSlug: "",
  categorySlug: "gift-card",
  imageTones: ["neem-soft", "cream"],
  imageLabelBn: "Gift Card",
}));
