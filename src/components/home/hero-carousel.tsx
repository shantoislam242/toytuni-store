"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, Heart } from "lucide-react";

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
export function HeroCarousel() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* CONTENT — absolute overlay at every size, vertically centred over the
          image (which sits in flow underneath: the tall 4:3 crop on mobile, the
          76vh wide box on desktop). */}
      <div className="absolute inset-0 z-10 flex items-start px-4 pt-5 sm:px-6 lg:items-center lg:pt-0">
          <motion.div
            className="mx-auto w-full max-w-6xl lg:max-w-[90rem] lg:-translate-y-8 lg:px-8"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div className="max-w-xl lg:translate-y-7" variants={stagger}>
              <motion.h2
                className="font-[family-name:var(--font-fraunces)] text-2xl font-bold leading-[1.05] tracking-tight text-neem-deep sm:text-5xl lg:text-6xl"
                variants={rise}
              >
                Learning Begins
                <br />
                with Play
              </motion.h2>

              <motion.div className="mt-4 flex items-center gap-3" aria-hidden variants={rise}>
                <span className="h-px w-16 bg-[#c9a877] sm:w-20" />
                <Heart className="size-4 fill-[#c9a877] text-[#c9a877]" />
                <span className="h-px w-16 bg-[#c9a877] sm:w-20" />
              </motion.div>

              <motion.p
                className="mt-3 hidden max-w-md text-xs leading-5 text-[#8a765c] sm:mt-4 sm:text-[15px] sm:leading-6 lg:block"
                variants={rise}
              >
                Thoughtfully crafted Montessori toys that nurture creativity,
                confidence, and independent learning.
              </motion.p>
            </motion.div>

            {/* CTA cluster — enters as one item, then keeps its gentle float + shine. */}
            <motion.div
              className="mt-16 flex flex-col items-start gap-2.5 lg:mt-20 lg:gap-3.5"
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
                  href="/collections/by-age"
                  className="group relative inline-flex w-32 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-white/60 bg-paper/80 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-neem-deep shadow-[0_10px_28px_rgba(31,41,20,0.14)] backdrop-blur-md transition-colors duration-300 ease-out hover:border-neem hover:bg-paper sm:w-44 sm:px-5 sm:py-3 sm:text-sm"
                >
                  <motion.span
                    className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.85)_50%,transparent_100%)] blur-[2px]"
                    animate={{ x: ["0%", "460%"] }}
                    transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2.4, ease: "linear" }}
                  />
                  <span className="relative z-10 inline-flex items-center">
                    <ArrowRight className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-x-8 -translate-y-1/2 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                    <span className="transition-transform duration-300 ease-out group-hover:translate-x-6">
                      Explore by Age
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
                  href="/collections/all"
                  className="group relative inline-flex w-32 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-white/20 bg-[linear-gradient(135deg,#8fb466_0%,#5f7e3d_100%)] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-paper shadow-[0_14px_34px_rgba(83,117,57,0.24)] transition-all duration-300 ease-out hover:bg-[linear-gradient(135deg,#9cc56f_0%,#6d8f45_100%)] sm:w-44 sm:px-5 sm:py-3 sm:text-sm"
                >
                  <motion.span
                    className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.35)_45%,transparent_100%)]"
                    animate={{ x: ["-140%", "140%"] }}
                    transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2.4, ease: "linear" }}
                  />
                  <span className="relative z-10 inline-flex items-center">
                    <ArrowRight className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-x-8 -translate-y-1/2 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
                    <span className="transition-transform duration-300 ease-out group-hover:translate-x-6">
                      Shop Now
                    </span>
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
      </div>

      {/* DESKTOP image — the sized 76vh box the content overlays. Hidden below lg. */}
      <div className="relative hidden w-full overflow-hidden lg:block lg:h-[76vh]">
        <Image
          src="/images/hero/hero-v2.webp"
          alt="Handmade neem-wood Montessori stacking tower, shape sorter, pull-along duck and rattle on a linen tabletop"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* cream scrim — fades left→right so the left-side copy stays legible */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-paper/85 via-paper/25 to-transparent" />
      </div>

      {/* MOBILE/TABLET image — a taller 4:3 crop of the scene (focused on the
          toys) so it shows fuller at phone width without any container crop.
          Sits in flow and defines the section height; the content above overlays
          it, with a cream scrim on the left for legibility. */}
      <div className="relative lg:hidden">
        <Image
          src="/images/hero/hero-mobile-sq.webp"
          alt="Handmade neem-wood Montessori stacking tower, shape sorter, pull-along duck and rattle on a linen tabletop"
          width={821}
          height={821}
          priority
          sizes="100vw"
          className="block h-auto w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-paper/90 via-paper/40 to-transparent" />
      </div>
    </section>
  );
}
