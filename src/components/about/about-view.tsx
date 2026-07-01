import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  BookOpen,
  Compass,
  GraduationCap,
  Hand,
  Heart,
  Leaf,
  Palette,
  PersonStanding,
  Puzzle,
  Recycle,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { AboutImage } from "@/components/about/about-image";
import { Counter } from "@/components/about/counter";
import { Reveal } from "@/components/policy/reveal";
import { BRAND_NAME } from "@/lib/config";
import {
  aboutGallery,
  aboutJourney,
  aboutMissionVision,
  aboutPhilosophy,
  aboutStats,
  aboutStory,
  aboutTestimonials,
  aboutValues,
  aboutWhyChooseUs,
  type AboutIcon,
} from "@/lib/mock/about";
import type { Tone } from "@/lib/types";

const aboutIcon: Record<AboutIcon, LucideIcon> = {
  target: Target,
  compass: Compass,
  "shield-check": ShieldCheck,
  "graduation-cap": GraduationCap,
  leaf: Leaf,
  "badge-check": BadgeCheck,
  "book-open": BookOpen,
  heart: Heart,
  blocks: Blocks,
  shield: Shield,
  palette: Palette,
  recycle: Recycle,
  "person-standing": PersonStanding,
  puzzle: Puzzle,
  hand: Hand,
};

const toneSoft: Record<Tone, string> = {
  cream: "bg-cream-200 text-ink",
  neem: "bg-neem/15 text-neem-deep",
  "neem-soft": "bg-neem-soft/50 text-neem-deep",
  wood: "bg-wood-light/50 text-ink",
  terracotta: "bg-terracotta/20 text-ink",
  mustard: "bg-mustard/25 text-ink",
  "dusty-blue": "bg-dusty-blue/25 text-ink",
  blush: "bg-blush/40 text-ink",
};

const SECTION = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="text-center">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
        {eyebrow}
      </span>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {sub ? <p className="mx-auto mt-3 max-w-xl text-ink-muted">{sub}</p> : null}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: AboutIcon; title: string; desc: string }) {
  const Icon = aboutIcon[icon];
  return (
    <div className="group h-full rounded-3xl border border-cream-200 bg-paper p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-neem/10 text-neem transition-transform duration-300 group-hover:scale-105">
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{desc}</p>
    </div>
  );
}

/** Premium storytelling About page. Server component — only Reveal, AboutImage,
 *  and Counter are client islands. */
export function AboutView() {
  return (
    <main className="flex-1 bg-paper">
      {/* hero */}
      <section className={`relative ${SECTION} pt-6 pb-10 text-center`}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-neem/10 blur-3xl" />
          <div className="absolute top-8 right-8 size-40 rounded-full bg-mustard/10 blur-3xl" />
          <div className="absolute top-16 left-8 size-40 rounded-full bg-blush/20 blur-3xl" />
          <Leaf className="absolute left-[12%] top-24 size-8 -rotate-12 text-neem/20" />
          <Leaf className="absolute right-[14%] top-16 size-6 rotate-[18deg] text-neem/20" />
        </div>
        <div className="relative">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About Us" }]} />
          <Reveal className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-neem/20 bg-neem/10 px-4 py-1.5 text-sm font-semibold text-neem-deep">
              <Sparkles className="size-4" />
              About Us
            </span>
            <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Creating meaningful play experiences for every child.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">
              We design and handcraft natural, Montessori-inspired wooden toys that help
              children learn, grow, and imagine — one joyful moment of play at a time.
            </p>
          </Reveal>
        </div>

        <Reveal className="mt-8">
          <AboutImage
            src="/images/about/hero.png"
            alt="Handmade Montessori wooden toys"
            tone="neem-soft"
            label="Handmade Montessori toys"
            priority
            width={2172}
            height={900}
            className="h-[240px] w-full rounded-3xl border border-cream-200 sm:h-[340px] lg:h-[440px]"
          />
        </Reveal>
      </section>

      {/* our story */}
      <section className={`${SECTION} py-10`}>
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <Reveal>
            <AboutImage
              src="/images/about/story.png"
              alt="Crafting wooden toys by hand"
              tone="wood"
              label="Crafted by hand"
              width={1000}
              height={1000}
              className="aspect-[4/3] w-full rounded-3xl border border-cream-200 lg:aspect-[5/6]"
            />
          </Reveal>
          <Reveal>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
              Our story
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              It began with a search for better play
            </h2>
            <div className="mt-4 space-y-4">
              {aboutStory.map((p) => (
                <p key={p} className="text-[15px] leading-relaxed text-ink-muted">
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* mission & vision */}
      <section className={`${SECTION} py-10`}>
        <div className="grid gap-5 sm:grid-cols-2">
          {aboutMissionVision.map((m, i) => {
            const Icon = aboutIcon[m.icon];
            return (
              <Reveal key={m.id} delay={i * 0.08} className="h-full">
                <div className="flex h-full flex-col rounded-3xl border border-cream-200 bg-cream-50/50 p-7 shadow-sm sm:p-8">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-neem/10 text-neem">
                    <Icon className="size-7" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-ink">{m.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{m.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* why choose us */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Why choose us" title="Thoughtful in every detail" sub="The care we put into each toy is the reason families keep coming back." />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aboutWhyChooseUs.map((f, i) => (
            <Reveal key={f.id} delay={Math.min(i * 0.05, 0.25)}>
              <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* our values */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="What we stand for" title="Our values" />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {aboutValues.map((v, i) => {
            const Icon = aboutIcon[v.icon];
            return (
              <Reveal key={v.id} delay={Math.min(i * 0.06, 0.24)} className="h-full">
                <div className="group flex h-full flex-col items-center rounded-3xl border border-cream-200 bg-paper p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-neem/10 text-neem transition-transform duration-300 group-hover:scale-105">
                    <Icon className="size-7" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-ink">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{v.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* montessori philosophy */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="The Montessori way" title="How our toys help children grow" sub="Simple, purposeful play that builds real skills — naturally." />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aboutPhilosophy.map((p, i) => {
            const Icon = aboutIcon[p.icon];
            return (
              <Reveal key={p.id} delay={Math.min(i * 0.05, 0.25)}>
                <div className="flex h-full items-start gap-4 rounded-3xl border border-cream-200 bg-paper p-5 shadow-sm">
                  <span className="flex size-11 flex-none items-center justify-center rounded-2xl bg-neem/10 text-neem">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* our journey */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Our journey" title="A story still being written" />
        </Reveal>
        <Reveal>
          <div className="relative mt-10">
            <div className="absolute inset-x-[12%] top-6 hidden h-0.5 bg-cream-300 sm:block" aria-hidden />
            <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-4">
              {aboutJourney.map((m) => (
                <li key={m.year} className="flex flex-col items-center text-center">
                  <span className="relative z-10 flex size-12 items-center justify-center rounded-full bg-neem font-display text-sm font-bold text-paper ring-4 ring-paper">
                    {m.year.slice(2)}
                  </span>
                  <p className="mt-3 font-display text-lg font-bold text-neem-deep">{m.year}</p>
                  <h3 className="mt-0.5 font-display text-base font-bold text-ink">{m.title}</h3>
                  <p className="mt-1 max-w-[14rem] text-sm text-ink-muted">{m.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* statistics */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-cream-200 bg-cream-50/50 p-6 sm:p-8 lg:grid-cols-4">
            {aboutStats.map((s) => (
              <div key={s.id} className="text-center">
                <Counter
                  target={s.target}
                  prefix={s.prefix}
                  suffix={s.suffix}
                  className="font-display text-3xl font-bold text-neem-deep sm:text-4xl"
                />
                <p className="mt-1 text-sm text-ink-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* gallery */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="A peek inside" title="Play, beautifully made" />
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {aboutGallery.map((g, i) => (
            <Reveal key={g.id} delay={Math.min(i * 0.05, 0.25)}>
              <div className="group overflow-hidden rounded-2xl border border-cream-200">
                <div className="transition-transform duration-500 ease-out group-hover:scale-105">
                  <AboutImage
                    alt={g.label}
                    tone={g.tone}
                    label={g.label}
                    className="aspect-[4/3] w-full"
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* testimonials */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Loved by families" title="What parents say" />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {aboutTestimonials.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i * 0.06, 0.2)} className="h-full">
              <figure className="flex h-full flex-col rounded-3xl border border-cream-200 bg-paper p-6 shadow-sm">
                <div className="flex items-center gap-0.5 text-mustard" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="size-4 fill-mustard" aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className={`flex size-10 items-center justify-center rounded-full font-display text-sm font-bold ${toneSoft[t.tone]}`}>
                    {t.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{t.name}</p>
                    <p className="text-xs text-ink-soft">{t.location}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={`${SECTION} pb-16 pt-6`}>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-neem/20 bg-neem/5 px-6 py-14 text-center sm:px-10">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="absolute -bottom-16 left-1/2 size-64 -translate-x-1/2 rounded-full bg-neem/10 blur-3xl" />
              <Leaf className="absolute left-[10%] top-8 size-7 -rotate-12 text-neem/20" />
            </div>
            <div className="relative">
              <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                Start your child&apos;s learning journey today
              </h2>
              <p className="mx-auto mt-3 max-w-md text-ink-muted">
                Discover handmade toys made to spark curiosity, from {BRAND_NAME}.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/collections/all"
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-all duration-300 hover:-translate-y-0.5 hover:bg-neem-deep"
                >
                  Shop Collection
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-cream-300 bg-paper px-6 text-sm font-bold text-ink transition-colors hover:border-neem"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
