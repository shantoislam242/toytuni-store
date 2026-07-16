import {
  Award,
  Droplets,
  Leaf,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  TreePine,
  Users,
} from "lucide-react";
import {
  CollectionPage,
  type CollectionPageConfig,
} from "@/components/collection/generic/collection-page";
import { getNeemWood } from "@/lib/data/catalog";
import type { FaqEntry } from "@/lib/mock/product-faqs";

const faqs: FaqEntry[] = [
  {
    id: "what",
    question: "What is neem wood?",
    answer:
      "Neem is a naturally durable, fast-renewing hardwood native to the region. It's prized for being antibacterial and long-lasting, which makes it a time-honoured, sustainable choice for baby-safe toys.",
  },
  {
    id: "safe",
    question: "Is neem wood safe for babies?",
    answer:
      "Yes. Our neem toys are smooth-sanded with food-grade, non-toxic finishes and no small detachable parts — safe for teething, tasting, and everyday play. Adult supervision is always recommended.",
  },
  {
    id: "antibacterial",
    question: "Is neem wood really antibacterial?",
    answer:
      "Neem is naturally antibacterial, which is one reason it has been used for generations. It's still good practice to wipe toys clean and let them air-dry.",
  },
  {
    id: "clean",
    question: "How do I care for neem wood toys?",
    answer:
      "Wipe gently with a slightly damp cloth and let them air-dry fully. Avoid soaking or dishwashers — a light coat of food-safe oil now and then keeps the wood looking new.",
  },
  {
    id: "sustainable",
    question: "Is it sustainable?",
    answer:
      "Very. Neem grows quickly and regenerates faster than traditional hardwoods, and we source only from responsibly managed, renewable trees — never old-growth forests.",
  },
];

const baseConfig: Omit<CollectionPageConfig, "products" | "stats"> = {
  breadcrumb: [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/collections/all" },
    { label: "Neem Wood" },
  ],
  hero: {
    badge: "Crafted From Pure Neem",
    title: "Neem Wood Collection",
    subtitle:
      "Toys carved from naturally durable, antibacterial neem wood — safe for little hands, gentle on the planet, and made to be treasured.",
    primary: { label: "Shop All Toys", href: "/collections/all" },
    secondary: { label: "Browse by Age", href: "/collections/by-age" },
  },
  badgeLabel: "Neem Wood",
  searchPlaceholder: "Search neem wood toys…",
  whyTitle: "Why neem wood?",
  whySubtitle: "The qualities that make neem the perfect wood for children's toys.",
  features: [
    {
      id: "pure",
      icon: TreePine,
      title: "Pure Neem Wood",
      desc: "Solid, single-piece neem — no plywood, no fillers, no plastic.",
    },
    {
      id: "antibacterial",
      icon: Sparkles,
      title: "Naturally Antibacterial",
      desc: "Neem's natural properties make it a safe, hygienic choice for babies.",
    },
    {
      id: "nontoxic",
      icon: Droplets,
      title: "Non-Toxic Finish",
      desc: "Water-based, food-grade oils — safe for teething and tasting.",
    },
    {
      id: "sustainable",
      icon: Leaf,
      title: "Sustainably Sourced",
      desc: "Fast-renewing and responsibly harvested — kind to the planet.",
    },
    {
      id: "safe",
      icon: ShieldCheck,
      title: "Smooth & Child Safe",
      desc: "Hand-sanded edges with no small detachable parts.",
    },
    {
      id: "durable",
      icon: Award,
      title: "Built to Last",
      desc: "Naturally durable and splinter-free — made to be passed down.",
    },
  ],
  testimonialsTitle: "Loved by families",
  testimonialsSubtitle: "Why parents choose our neem wood toys.",
  testimonials: [
    {
      id: "t1",
      name: "Sumaiya R.",
      location: "Dhaka",
      rating: 5,
      text: "You can feel the quality of the neem wood — smooth, solid, and warm. My baby loves chewing on it and I feel completely safe.",
      product: "Neem Wood Rattle Set",
      tone: "neem-soft",
    },
    {
      id: "t2",
      name: "Imran H.",
      location: "Chattogram",
      rating: 5,
      text: "Beautiful, natural, and clearly made with care. It's lovely to give my child a toy with no plastic at all.",
      product: "Neem Teether Ring",
      tone: "mustard",
    },
    {
      id: "t3",
      name: "Nadia A.",
      location: "Sylhet",
      rating: 5,
      text: "The wood is gorgeous and the finish is flawless. These feel like heirloom toys we'll pass down.",
      product: "Stacking Ring Tower",
      tone: "blush",
    },
    {
      id: "t4",
      name: "Farhana K.",
      location: "Dhaka",
      rating: 4,
      text: "Sturdy and safe, exactly what I wanted. The natural wood look is beautiful in the nursery too.",
      product: "Building Block Set",
      tone: "dusty-blue",
    },
    {
      id: "t5",
      name: "Tanvir S.",
      location: "Khulna",
      rating: 5,
      text: "Knowing it's antibacterial neem wood gives me real peace of mind. Excellent craftsmanship.",
      product: "Montessori Object Permanence Box",
      tone: "terracotta",
    },
  ],
  faqs,
  cta: {
    heading: "Give Your Child the Gift of Natural Play",
    text: "Explore our full range of handcrafted, non-toxic neem wood toys made to grow with your little one.",
    primary: { label: "Shop Collection", href: "/collections/all" },
    secondary: { label: "Contact Us", href: "/contact" },
  },
};

/** "Neem Wood" collection page — built on the reusable CollectionPage. */
export async function NeemWoodView() {
  const products = await getNeemWood();
  const total = products.length;
  const avgRating = (products.reduce((s, p) => s + p.rating, 0) / total).toFixed(1);
  const totalReviews = products.reduce((s, p) => s + p.reviewCount, 0);

  const config: CollectionPageConfig = {
    ...baseConfig,
    stats: [
      { icon: Package, value: `${total}`, label: "Neem Wood Toys" },
      { icon: Star, value: `${avgRating}★`, label: "Average Rating" },
      { icon: Users, value: `${(totalReviews / 1000).toFixed(1)}k+`, label: "Happy Families" },
      { icon: Leaf, value: "100%", label: "Natural Neem Wood" },
    ],
    products,
  };

  return <CollectionPage config={config} />;
}
