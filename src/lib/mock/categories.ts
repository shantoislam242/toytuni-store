import type { Category } from "@/lib/types";

export const categories: Category[] = [
  { slug: "teethers", nameBn: "Teethers", href: "/collections/teethers", tone: "blush", taglineBn: "Soothe sore gums, safely" },
  { slug: "rattles", nameBn: "Rattles & Grasping", href: "/collections/rattles", tone: "mustard", taglineBn: "First sounds & little grips" },
  { slug: "stacking", nameBn: "Stacking & Sorting", href: "/collections/stacking", tone: "neem-soft", taglineBn: "Build, nest & match" },
  { slug: "blocks", nameBn: "Blocks & Building", href: "/collections/blocks", tone: "terracotta", taglineBn: "Open-ended construction play" },
  { slug: "push-pull", nameBn: "Push & Pull Toys", href: "/collections/push-pull", tone: "dusty-blue", taglineBn: "Toys that get them moving" },
  { slug: "toddler-walking", nameBn: "Toddler Walking", href: "/collections/toddler-walking", tone: "neem-soft", taglineBn: "First steps, made steady" },
  { slug: "puzzles", nameBn: "Shape Sorters & Puzzles", href: "/collections/puzzles", tone: "wood", taglineBn: "Shapes, problems & focus" },
  { slug: "montessori", nameBn: "Montessori & Learning", href: "/collections/montessori", tone: "neem", taglineBn: "Purposeful, hands-on learning" },
  { slug: "ride-on", nameBn: "Ride-on & Large Toys", href: "/collections/ride-on", tone: "cream", taglineBn: "Big-kid balance & adventure" },
];

export const categoryBySlug = (slug: string) =>
  categories.find((c) => c.slug === slug);
