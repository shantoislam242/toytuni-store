import type { AgeTier } from "@/lib/types";

export const ageTiers: AgeTier[] = [
  { slug: "0-6m", labelBn: "0–6 months", href: "/collections/0-6m", tone: "blush" },
  { slug: "6-12m", labelBn: "6–12 months", href: "/collections/6-12m", tone: "mustard" },
  { slug: "1-2y", labelBn: "1–2 years", href: "/collections/1-2y", tone: "neem-soft" },
  { slug: "2-3y-plus", labelBn: "2–3 years+", href: "/collections/2-3y-plus", tone: "dusty-blue" },
];

export const ageTierBySlug = (slug: string) =>
  ageTiers.find((t) => t.slug === slug);
