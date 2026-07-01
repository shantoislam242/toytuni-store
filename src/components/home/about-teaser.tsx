import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { AboutImage } from "@/components/about/about-image";
import { Reveal } from "@/components/policy/reveal";

/**
 * Home-page About teaser. A centered section header (matching the "Parents'
 * Love & Recommendations" section) sits at the top; below it, the brand image
 * and supporting copy share a two-column layout (image first on mobile). Links
 * to the full About page.
 */
export function AboutTeaser() {
  return (
    <section className="relative overflow-hidden bg-cream-50/40">
      {/* soft decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-16 top-0 size-64 rounded-full bg-neem/10 blur-3xl" />
        <div className="absolute -right-10 bottom-0 size-56 rounded-full bg-mustard/10 blur-3xl" />
        <Leaf className="absolute right-[8%] top-10 size-8 rotate-12 text-neem/15" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {/* centered section header */}
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            About Us
          </h2>
          <p className="mx-auto mt-3 max-w-2xl font-display text-lg font-semibold text-neem-deep sm:text-xl">
            Learning Through Play, Inspired by Montessori.
          </p>
        </Reveal>

        {/* hero image */}
        <Reveal className="mt-10 lg:mt-12">
          <AboutImage
            src="/images/about/teaser.png"
            alt="Handmade Montessori wooden toys"
            tone="neem-soft"
            label="Handmade Montessori toys"
            width={1600}
            height={900}
            className="mx-auto aspect-[16/9] w-full max-w-4xl rounded-3xl border border-cream-200 shadow-sm"
          />
        </Reveal>

        {/* description + buttons — under the hero */}
        <Reveal className="mt-8 text-center">
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            We craft natural, non-toxic wooden toys designed the Montessori way — to nurture
            creativity, independence, and a lifelong love of learning. Every piece is made by
            hand, and made to be treasured.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/about"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-all duration-300 hover:-translate-y-0.5 hover:bg-neem-deep"
            >
              Learn More
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/collections/all"
              className="inline-flex h-11 items-center justify-center rounded-md border border-cream-300 bg-paper px-6 text-sm font-bold text-ink transition-colors hover:border-neem"
            >
              Shop Collection
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
