import Link from "next/link";
import {
  ArrowRight,
  Cake,
  Check,
  Coins,
  Crown,
  Gem,
  Gift,
  Headphones,
  Leaf,
  Lock,
  Medal,
  Percent,
  Rocket,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  Truck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LoyaltyProgress } from "@/components/loyalty/loyalty-progress";
import { Reveal } from "@/components/policy/reveal";
import {
  loyaltyBenefits,
  loyaltyDashboard,
  loyaltyFaqs,
  loyaltyRewards,
  loyaltySteps,
  loyaltyTestimonials,
  loyaltyTiers,
  type LoyaltyIcon,
} from "@/lib/mock/loyalty";
import type { Tone } from "@/lib/types";

const loyaltyIcon: Record<LoyaltyIcon, LucideIcon> = {
  coins: Coins,
  percent: Percent,
  cake: Cake,
  rocket: Rocket,
  crown: Crown,
  headphones: Headphones,
  "user-plus": UserPlus,
  "shopping-bag": ShoppingBag,
  gift: Gift,
  star: Star,
  medal: Medal,
  gem: Gem,
  truck: Truck,
  ticket: Ticket,
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

/**
 * Premium Loyalty Rewards page. Server component — renders the program from the
 * loyalty config; the only client islands are the Reveal scroll animation, the
 * FAQ accordion, and the animated dashboard progress bar.
 */
export function LoyaltyView() {
  return (
    <main className="flex-1 bg-paper">
      {/* hero */}
      <section className={`relative ${SECTION} pt-6 pb-12 text-center`}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-neem/10 blur-3xl" />
          <div className="absolute top-8 right-8 size-40 rounded-full bg-mustard/10 blur-3xl" />
          <div className="absolute top-16 left-8 size-40 rounded-full bg-blush/20 blur-3xl" />
          <Leaf className="absolute left-[12%] top-24 size-8 -rotate-12 text-neem/20" />
          <Leaf className="absolute right-[14%] top-16 size-6 rotate-[18deg] text-neem/20" />
        </div>

        <div className="relative">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Loyalty Rewards" }]} />
          <Reveal className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-neem/20 bg-neem/10 px-4 py-1.5 text-sm font-semibold text-neem-deep">
              <Sparkles className="size-4" />
              Member Exclusive
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Loyalty Rewards
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">
              Earn rewards every time you shop for the toys your little one loves — and
              unlock member-only perks that grow with you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signin"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-all duration-300 hover:-translate-y-0.5 hover:bg-neem-deep"
              >
                Join Free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#rewards"
                className="inline-flex h-11 items-center justify-center rounded-md border border-cream-300 bg-paper px-6 text-sm font-bold text-ink transition-colors hover:border-neem"
              >
                View Rewards
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* benefits */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Why join" title="Member benefits" sub="A warm little club of perks for the families who shop with us most." />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loyaltyBenefits.map((b, i) => {
            const Icon = loyaltyIcon[b.icon];
            return (
              <Reveal key={b.id} delay={Math.min(i * 0.05, 0.25)}>
                <div className="group h-full rounded-3xl border border-cream-200 bg-paper p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-neem/10 text-neem transition-transform duration-300 group-hover:scale-105">
                    <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{b.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* how it works */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Simple by design" title="How it works" />
        </Reveal>
        <Reveal>
          <div className="relative mt-10">
            {/* connecting line (sm+) */}
            <div
              className="absolute inset-x-[12%] top-8 hidden h-0.5 bg-cream-300 sm:block"
              aria-hidden
            />
            <ol className="relative grid grid-cols-1 gap-8 sm:grid-cols-4">
              {loyaltySteps.map((s, i) => {
                const Icon = loyaltyIcon[s.icon];
                return (
                  <li key={s.id} className="flex flex-col items-center text-center">
                    <span className="relative z-10 flex size-16 items-center justify-center rounded-2xl bg-neem text-paper shadow-sm ring-4 ring-paper">
                      <Icon className="size-7" strokeWidth={1.75} aria-hidden />
                      <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-mustard font-display text-xs font-bold text-ink">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="mt-4 font-display text-base font-bold text-ink">{s.title}</h3>
                    <p className="mt-1 max-w-[14rem] text-sm text-ink-muted">{s.desc}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* membership tiers */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Membership" title="Choose your tier" sub="The more you shop, the more you unlock. Every tier keeps the last one's perks." />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          {loyaltyTiers.map((tier, i) => {
            const Icon = loyaltyIcon[tier.icon];
            return (
              <Reveal key={tier.id} delay={Math.min(i * 0.06, 0.2)} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-3xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:p-7 ${
                    tier.featured
                      ? "border-neem bg-neem/[0.04] ring-1 ring-neem lg:-translate-y-2"
                      : "border-cream-200 bg-paper"
                  }`}
                >
                  {tier.featured ? (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-neem px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-paper">
                      Most popular
                    </span>
                  ) : null}
                  <span
                    className={`flex size-12 items-center justify-center rounded-2xl ${
                      tier.featured ? "bg-neem text-paper" : "bg-neem/10 text-neem"
                    }`}
                  >
                    <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold text-ink">{tier.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">{tier.tagline}</p>
                  <p className="mt-4 font-display text-lg font-bold text-neem-deep">{tier.price}</p>
                  <ul className="mt-4 space-y-2.5">
                    {tier.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-sm text-ink">
                        <span className="mt-0.5 flex size-5 flex-none items-center justify-center rounded-full bg-neem/15 text-neem">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signin"
                    className={`mt-6 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-bold transition-colors ${
                      tier.featured
                        ? "bg-neem text-paper hover:bg-neem-deep"
                        : "border border-cream-300 bg-paper text-ink hover:border-neem"
                    }`}
                  >
                    {tier.featured ? "Join Gold" : "Choose " + tier.name}
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* reward examples */}
      <section id="rewards" className={`${SECTION} scroll-mt-24 py-10`}>
        <Reveal>
          <SectionHead eyebrow="Redeem" title="Reward examples" sub="Turn the points you earn into real perks at checkout." />
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loyaltyRewards.map((r, i) => {
            const Icon = loyaltyIcon[r.icon];
            return (
              <Reveal key={r.id} delay={Math.min(i * 0.05, 0.2)} className="h-full">
                <div className="group flex h-full flex-col items-start rounded-3xl border border-cream-200 bg-paper p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:p-6">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-mustard/20 text-ink transition-transform duration-300 group-hover:scale-105">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                    {r.points.toLocaleString()} points
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-ink">{r.title}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* member dashboard preview — gated. No auth/backend yet, so the personal
          figures are hidden behind a sign-in lock; logged-out visitors only see
          the (blurred) shape of the dashboard, never the point values. */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Your account" title="Your rewards dashboard" sub="Sign in to track your points, tier progress, and rewards." />
        </Reveal>
        <Reveal>
          <div className="relative mx-auto mt-8 max-w-2xl">
            {/* blurred, non-interactive preview (hidden from assistive tech) */}
            <div
              className="pointer-events-none select-none overflow-hidden rounded-3xl border border-cream-200 bg-paper shadow-sm blur-[6px]"
              aria-hidden
            >
            {/* header */}
            <div className="flex items-center justify-between gap-4 border-b border-cream-200 bg-neem/5 px-6 py-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neem-deep">
                  Current tier
                </p>
                <p className="mt-0.5 flex items-center gap-2 font-display text-xl font-bold text-ink">
                  <Medal className="size-5 text-neem" aria-hidden />
                  {loyaltyDashboard.tier}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-neem-deep">
                  Points
                </p>
                <p className="mt-0.5 font-display text-2xl font-bold text-ink">
                  {loyaltyDashboard.points.toLocaleString()}
                </p>
              </div>
            </div>

            {/* progress */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink">
                  {loyaltyDashboard.pointsToNext.toLocaleString()} points to {loyaltyDashboard.nextTier}
                </span>
                <span className="text-ink-soft">{loyaltyDashboard.progress}%</span>
              </div>
              <div className="mt-2">
                <LoyaltyProgress value={loyaltyDashboard.progress} />
              </div>
            </div>

            {/* recent activity */}
            <div className="border-t border-cream-200 px-6 py-5">
              <p className="font-display text-sm font-bold text-ink">Recent activity</p>
              <ul className="mt-3 space-y-3">
                {loyaltyDashboard.activity.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-ink">{a.label}</p>
                      <p className="text-xs text-ink-soft">{a.date}</p>
                    </div>
                    <span
                      className={`font-display font-bold ${
                        a.points.startsWith("−") ? "text-ink-soft" : "text-neem-deep"
                      }`}
                    >
                      {a.points}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            </div>

            {/* sign-in lock overlay — the personal figures behind it are blurred */}
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-paper/50 px-6 text-center backdrop-blur-[2px]">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-neem/10 text-neem">
                <Lock className="size-7" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-ink">
                Sign in to see your points
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-ink-muted">
                Track your tier, points, and rewards once you&apos;re signed in.
              </p>
              <Link
                href="/signin"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-colors hover:bg-neem-deep"
              >
                Sign in
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* testimonials */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Loved by members" title="What our members say" />
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loyaltyTestimonials.map((t, i) => (
            <Reveal key={t.id} delay={Math.min(i * 0.06, 0.2)} className="h-full">
              <figure className="flex h-full flex-col rounded-3xl border border-cream-200 bg-paper p-6 shadow-sm">
                <div className="flex items-center gap-0.5 text-mustard" aria-hidden>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-4 fill-mustard" />
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span
                    className={`flex size-10 items-center justify-center rounded-full font-display text-sm font-bold ${toneSoft[t.tone]}`}
                  >
                    {t.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{t.name}</p>
                    <p className="text-xs text-ink-soft">{t.tier}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* faq */}
      <section className={`${SECTION} py-10`}>
        <Reveal>
          <SectionHead eyebrow="Good to know" title="Frequently asked questions" />
        </Reveal>
        <Reveal>
          <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-2xl border border-cream-200 bg-paper shadow-sm">
            <Accordion type="single" collapsible defaultValue="loyalty-faq-0">
              {loyaltyFaqs.map((f, i) => (
                <AccordionItem key={f.q} value={`loyalty-faq-${i}`} className="border-cream-200 px-5">
                  <AccordionTrigger className="py-4 text-left text-[15px] font-semibold text-ink hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-4 text-[15px] leading-relaxed text-ink-muted">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </section>

      {/* final CTA */}
      <section className={`${SECTION} pb-16 pt-6`}>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-neem/20 bg-neem/5 px-6 py-14 text-center sm:px-10">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div className="absolute -bottom-16 left-1/2 size-64 -translate-x-1/2 rounded-full bg-neem/10 blur-3xl" />
            </div>
            <div className="relative">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-neem/10 text-neem">
                <Crown className="size-7" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
                Become a member today
              </h2>
              <p className="mx-auto mt-3 max-w-md text-ink-muted">
                Start earning rewards from your very first purchase.
              </p>
              <div className="mt-7">
                <Link
                  href="/signin"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-neem px-8 text-sm font-bold text-paper shadow-[0_12px_30px_rgba(83,117,57,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-neem-deep"
                >
                  Join Now
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
