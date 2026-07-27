"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, Heart } from "lucide-react";
import {
  DEFAULT_HERO_DESKTOP,
  DEFAULT_HERO_MOBILE,
  HERO_SLIDE_2_DESKTOP,
  HERO_SLIDE_2_MOBILE,
  type HeroContent,
} from "@/lib/data/content-shape";
import { cn } from "@/lib/utils";

const HERO_ALT =
  "Handmade neem-wood Montessori stacking tower, shape sorter, pull-along duck and rattle on a linen tabletop";
const HERO_ALT_2 =
  "Smiling baby learning to walk with a neem-wood push walker among wooden rattles and teethers in a cosy playroom";

// Entrance choreography — a calm, staggered fade-up with a gentle defocus→focus
// blur. Slow easeOut curve (no bounce/overshoot) so it reads elegant, not flashy.
// Only orchestrates timing on the wrappers; the actual opacity/blur/lift lives on
// the leaf items so it never conflicts with Tailwind `translate` positioning.
const ENTER_EASE = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const rise = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: ENTER_EASE },
  },
};

/**
 * Single static hero banner (matches the reference): a full-width lifestyle
 * image with the editorial copy + animated CTAs on the left, over the image's
 * light, uncluttered area. A soft cream scrim (blends with the image's own cream
 * background) keeps the copy readable on every screen. The copy itself is plain
 * markup (never gated by JS), so the hero always paints; only the CTA float /
 * shine / hover-arrow are animated.
 */
export function HeroCarousel({ hero }: { hero: HeroContent }) {
  // Two-slide auto-rotating hero. Slide 1 is the (CMS-editable) primary image;
  // slide 2 is a bundled second scene. The copy overlay stays fixed — only the
  // background image cross-fades every 6s (paused under reduced-motion).
  const slides = [
    {
      desktop: hero.imageDesktop ?? DEFAULT_HERO_DESKTOP,
      mobile: hero.imageMobile ?? DEFAULT_HERO_MOBILE,
      alt: HERO_ALT,
    },
    {
      desktop: HERO_SLIDE_2_DESKTOP,
      mobile: HERO_SLIDE_2_MOBILE,
      alt: HERO_ALT_2,
    },
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      6000,
    );
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <section className="relative w-full overflow-hidden">
      {/* CONTENT — absolute overlay at every size, vertically centred over the
          image (which sits in flow underneath: the tall 4:3 crop on mobile, the
          76vh wide box on desktop). */}
      <div className="absolute inset-0 z-10 flex items-start px-4 pt-5 sm:px-6 lg:items-center lg:px-0 lg:pt-0">
          <motion.div
            className="mx-auto w-full max-w-6xl lg:max-w-[90rem] lg:-translate-y-8 lg:px-8"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div className="max-w-xl lg:translate-y-7" variants={stagger}>
              <motion.h2
                className="whitespace-pre-line font-[family-name:var(--font-fraunces)] text-2xl font-bold leading-[1.05] tracking-tight text-neem-deep sm:text-4xl lg:text-6xl"
                variants={rise}
              >
                {hero.heading}
              </motion.h2>

              <motion.div className="mt-1.5 flex items-center gap-3 sm:mt-3" aria-hidden variants={rise}>
                <span className="h-px w-9 bg-[#c9a877] sm:w-12 lg:w-28" />
                <Heart className="size-4 fill-[#c9a877] text-[#c9a877]" />
                <span className="h-px w-9 bg-[#c9a877] sm:w-12 lg:w-28" />
              </motion.div>

              <motion.p
                className="mt-3 hidden max-w-md text-xs leading-5 text-[#8a765c] sm:mt-4 sm:text-[15px] sm:leading-6 lg:block"
                variants={rise}
              >
                {hero.subheading}
              </motion.p>
            </motion.div>

            {/* CTA cluster — enters as one item, then keeps its gentle float + shine. */}
            <motion.div
              className="mt-20 flex flex-col items-start gap-2.5 md:gap-4 lg:mt-24 lg:gap-3.5"
              variants={rise}
            >
              {/* secondary — Explore by Age (frosted outline) */}
              <motion.div
                className="relative"
                animate={{ y: [0, -4, 0], rotate: [0, 0.2, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                whileHover={{ scale: 1.05, y: -5, boxShadow: "0 20px 45px rgba(31, 41, 20, 0.18)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-x-3 -bottom-2 h-3 rounded-full bg-ink/15 blur-xl" />
                <Link
                  href={hero.secondaryHref}
                  className="group relative inline-flex w-32 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-white/60 bg-paper/80 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-neem-deep shadow-[0_10px_28px_rgba(31,41,20,0.14)] backdrop-blur-md transition-colors duration-300 ease-out hover:border-neem hover:bg-paper sm:w-44 sm:px-5 sm:py-3 sm:text-sm"
                >
                  <motion.span
                    className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.85)_50%,transparent_100%)] blur-[2px]"
                    animate={{ x: ["0%", "460%"] }}
                    transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2.4, ease: "linear" }}
                  />
                  <span className="relative z-10 inline-flex items-center">
                    <ArrowRight className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-x-8 -translate-y-1/2 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                    <span className="transition-transform duration-300 ease-out group-hover:translate-x-4">
                      {hero.secondaryLabel}
                    </span>
                  </span>
                </Link>
              </motion.div>

              {/* primary — Shop Now (gradient pill) */}
              <motion.div
                className="relative"
                animate={{ y: [0, -4, 0], rotate: [0, 0.2, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                whileHover={{ scale: 1.05, y: -5, boxShadow: "0 20px 45px rgba(83, 117, 57, 0.26)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-x-3 -bottom-2 h-3 rounded-full bg-neem/25 blur-xl" />
                <Link
                  href={hero.primaryHref}
                  className="group relative inline-flex w-32 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-white/20 bg-[linear-gradient(135deg,#8fb466_0%,#5f7e3d_100%)] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-paper shadow-[0_14px_34px_rgba(83,117,57,0.24)] transition-all duration-300 ease-out hover:bg-[linear-gradient(135deg,#9cc56f_0%,#6d8f45_100%)] sm:w-44 sm:px-5 sm:py-3 sm:text-sm"
                >
                  <motion.span
                    className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.35)_45%,transparent_100%)]"
                    animate={{ x: ["-140%", "140%"] }}
                    transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2.4, ease: "linear" }}
                  />
                  <span className="relative z-10 inline-flex items-center">
                    <ArrowRight className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-x-8 -translate-y-1/2 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                    <span className="transition-transform duration-300 ease-out group-hover:translate-x-4">
                      {hero.primaryLabel}
                    </span>
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
      </div>

      {/* DESKTOP image — content overlays it. Hidden below lg. */}
      {/* Laptops (lg, < 1536px) keep the original min(76vh,43vw). Large desktops
          (2xl, ≥ 1536px) go taller — min(90vh,43vw) — so on those wide screens
          the box reaches the photo's full-width height (43vw, no side-crop) and
          the stats strip below drops fully under the fold instead of half-
          peeking. The 43vw cap on both means the image is never side-cropped;
          90vh only caps ultrawide/short viewports (top/bottom crop). */}
      <div className="relative hidden w-full overflow-hidden lg:block lg:h-[min(76vh,43vw)] 2xl:h-[min(90vh,43vw)]">
        {slides.map((sl, i) => (
          <Image
            key={sl.desktop}
            src={sl.desktop}
            alt={sl.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover object-center transition-opacity duration-[1200ms] ease-out",
              i === active ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {/* cream scrim — fades left→right so the left-side copy stays legible */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-paper/85 via-paper/25 to-transparent" />
      </div>

      {/* MOBILE/TABLET image — a taller 4:3 crop of the scene (focused on the
          toys) so it shows fuller at phone width without any container crop.
          Sits in flow and defines the section height; the content above overlays
          it, with a cream scrim on the left for legibility. */}
      <div className="relative aspect-[1095/821] w-full overflow-hidden lg:hidden">
        {slides.map((sl, i) => (
          <Image
            key={sl.mobile}
            src={sl.mobile}
            alt={sl.alt}
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover object-center transition-opacity duration-[1200ms] ease-out",
              i === active ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-paper/90 via-paper/40 to-transparent" />
      </div>

      {/* slide indicators — also let the visitor switch manually */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 lg:bottom-6">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === active}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === active ? "w-6 bg-neem" : "w-2 bg-ink/30 hover:bg-ink/50",
            )}
          />
        ))}
      </div>
    </section>
  );
}
