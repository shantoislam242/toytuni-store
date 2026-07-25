import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { Reveal } from "@/components/policy/reveal";
import type { AboutTeaserContent } from "@/lib/data/content-shape";

/**
 * Home-page About teaser (admin-editable). A centered section header sits at
 * the top; below it, the supporting copy + two CTAs. Content comes from the
 * editable site content (`getSiteContent().about`), passed down by the page.
 */
export function AboutTeaser({ about }: { about: AboutTeaserContent }) {
  return (
    <section className="relative overflow-hidden bg-cream-50/40">
      {/* soft decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-16 top-0 size-64 rounded-full bg-neem/10 blur-3xl" />
        <div className="absolute -right-10 bottom-0 size-56 rounded-full bg-mustard/10 blur-3xl" />
        <Leaf className="absolute right-[8%] top-10 size-8 rotate-12 text-neem/15" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:max-w-[90rem] lg:px-8 lg:py-20">
        {/* centered section header */}
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {about.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl font-display text-lg font-semibold text-ink sm:text-xl">
            {about.subheading}
          </p>
        </Reveal>

        {/* description + buttons */}
        <Reveal className="mt-6 text-center">
          <p className="mx-auto max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-ink-muted">
            {about.body}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={about.primaryHref}
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-all duration-300 hover:-translate-y-0.5 hover:bg-neem-deep"
            >
              {about.primaryLabel}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href={about.secondaryHref}
              className="inline-flex h-11 items-center justify-center rounded-md border border-cream-300 bg-paper px-6 text-sm font-bold text-ink transition-colors hover:border-neem"
            >
              {about.secondaryLabel}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
