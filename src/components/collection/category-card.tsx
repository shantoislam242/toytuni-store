"use client";

import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Bell,
  Bike,
  Blocks,
  Car,
  GraduationCap,
  Layers,
  Puzzle,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

// Soft tone wash for the card background. Tailwind v4 only detects literal class
// names, so this is a static map covering the whole Tone union.
const toneWash: Record<Tone, string> = {
  cream: "bg-cream-100",
  neem: "bg-neem/15",
  "neem-soft": "bg-neem-soft/40",
  wood: "bg-wood-light/50",
  terracotta: "bg-terracotta/20",
  mustard: "bg-mustard/25",
  "dusty-blue": "bg-dusty-blue/25",
  blush: "bg-blush/40",
};

// Category slug → representative icon. Falls back to a neutral glyph for any
// slug not listed, so a new category never renders an empty medallion.
const categoryIcon: Record<string, LucideIcon> = {
  teethers: Baby,
  rattles: Bell,
  stacking: Layers,
  blocks: Blocks,
  "push-pull": Bike,
  puzzles: Puzzle,
  montessori: GraduationCap,
  "ride-on": Car,
};

type CategoryCardProps = {
  slug: string;
  name: string;
  tagline?: string;
  href: string;
  tone: Tone;
  count: number;
  feature?: boolean;
  index: number;
};

/**
 * Premium category card for the "Shop by Category" hub: a tone-tinted panel with
 * a category icon medallion, name, tagline, and product count, linking to the
 * category collection page. Subtle motion — staggered scroll entrance + hover
 * lift — disabled under prefers-reduced-motion.
 */
export function CategoryCard({
  slug,
  name,
  tagline,
  href,
  tone,
  count,
  feature = false,
  index,
}: CategoryCardProps) {
  const reduce = useReducedMotion();
  const Icon = categoryIcon[slug] ?? Shapes;

  return (
    <motion.div
      className={cn("h-full", feature && "sm:col-span-2")}
      initial={reduce ? undefined : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: "easeOut" }}
      whileHover={reduce ? undefined : { y: -4 }}
    >
      <Link
        href={href}
        aria-label={`${name} — ${count > 0 ? `${count} toys` : "coming soon"}`}
        className={cn(
          "group flex h-full flex-col justify-between gap-6 rounded-3xl border border-cream-200/70 p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem sm:p-6",
          toneWash[tone],
        )}
      >
        {/* category icon medallion */}
        <span
          className={cn(
            "flex flex-none items-center justify-center rounded-2xl bg-paper/80 text-neem-deep shadow-sm ring-1 ring-black/[0.03] transition-transform duration-300 group-hover:scale-[1.04]",
            feature ? "size-20" : "size-14",
          )}
          aria-hidden
        >
          <Icon className={feature ? "size-9" : "size-6"} strokeWidth={1.75} />
        </span>

        {/* text + arrow */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className={cn("font-display font-bold text-ink", feature ? "text-2xl" : "text-lg")}>
              {name}
            </h3>
            {tagline ? <p className="mt-1 text-sm text-ink-muted">{tagline}</p> : null}
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
              {count > 0 ? `${count} toys` : "Coming soon"}
            </p>
          </div>
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-paper/80 text-neem-deep shadow-sm transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
