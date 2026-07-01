import Link from "next/link";
import {
  Check,
  Clock,
  Globe,
  Headset,
  Mail,
  Phone,
  School,
  ShieldCheck,
  Store,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { BulkForm } from "@/components/bulk/bulk-form";
import { Button } from "@/components/ui/button";
import { bulkBenefits, bulkContact, bulkSteps, bulkTiers } from "@/lib/mock/bulk";
import type { BulkIcon, Tone } from "@/lib/types";

// String → lucide icon, covering every BulkIcon value used by the data.
const bulkIcon: Record<BulkIcon, LucideIcon> = {
  school: School,
  store: Store,
  globe: Globe,
  tag: Tag,
  headset: Headset,
  "shield-check": ShieldCheck,
  truck: Truck,
};

// Soft tone wash for tier cards. Tailwind v4 only detects literal class names, so
// this is a static map over the whole Tone union.
const tierWash: Record<Tone, string> = {
  cream: "bg-cream-100",
  neem: "bg-neem/15",
  "neem-soft": "bg-neem-soft/40",
  wood: "bg-wood-light/50",
  terracotta: "bg-terracotta/20",
  mustard: "bg-mustard/25",
  "dusty-blue": "bg-dusty-blue/25",
  blush: "bg-blush/40",
};

/**
 * "Bulk / B2B" landing page: hero + three wholesale program tiers + benefits
 * strip + how-it-works steps + a UI-only inquiry form. Server component — maps
 * static data; the only client island is BulkForm.
 */
export function BulkView() {
  return (
    <main className="flex-1 bg-paper">
      {/* hero */}
      <section className="mx-auto w-full max-w-[80rem] px-4 pt-6 pb-8 text-center sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Bulk / B2B" }]} />
        <div className="mt-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
            For Business
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Wholesale &amp; Bulk Orders
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-ink-muted">
            Partner with us to bring safe, natural neem-wood Montessori toys to your
            preschool, shop, or region — at wholesale pricing with dedicated support.
          </p>
          {/* placeholder stat strip */}
          <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            <span>250+ preschools</span>
            <span aria-hidden>·</span>
            <span>10,000+ toys shipped</span>
            <span aria-hidden>·</span>
            <span>Ships to 3 countries</span>
          </div>
          <div className="mt-7">
            <Button asChild>
              <Link href="#inquiry">Request a quote</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* program tiers */}
      <section className="mx-auto w-full max-w-[80rem] px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {bulkTiers.map((tier) => {
            const Icon = bulkIcon[tier.icon];
            return (
              <div
                key={tier.id}
                id={tier.id}
                className={`scroll-mt-24 rounded-3xl border border-cream-200/70 p-6 shadow-sm ${tierWash[tier.tone]}`}
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-paper/80 text-neem-deep shadow-sm ring-1 ring-black/[0.03]">
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-ink">{tier.titleBn}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{tier.descBn}</p>
                <ul className="mt-4 space-y-2">
                  {tier.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-ink">
                      <Check className="mt-0.5 size-4 flex-none text-neem" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* why partner with us */}
      <section className="mx-auto w-full max-w-[80rem] px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Why partner with us
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-6 rounded-2xl border border-cream-200 bg-cream-50/50 px-6 py-10 lg:grid-cols-4">
          {bulkBenefits.map((b) => {
            const Icon = bulkIcon[b.icon];
            return (
              <div key={b.id} className="flex flex-col items-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-neem/10 text-neem">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-3 font-bold text-ink">{b.titleBn}</h3>
                <p className="mt-1 max-w-[16rem] text-sm text-ink-muted">{b.descBn}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto w-full max-w-[80rem] px-4 pb-12 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          How it works
        </h2>
        <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {bulkSteps.map((step, i) => (
            <li key={step.id} className="flex flex-col items-start">
              <span className="flex size-10 items-center justify-center rounded-full bg-neem font-display text-base font-bold text-paper">
                {i + 1}
              </span>
              <h3 className="mt-3 font-bold text-ink">{step.titleBn}</h3>
              <p className="mt-1 text-sm text-ink-muted">{step.descBn}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* inquiry */}
      <section
        id="inquiry"
        className="mx-auto w-full max-w-[80rem] scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8"
      >
        <h2 className="text-center font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Request a wholesale quote
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink-muted">
          Tell us a little about your business and we&apos;ll get back to you with
          pricing and options.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <BulkForm />

          {/* prefer to talk? */}
          <div className="rounded-2xl border border-cream-200 bg-neem/5 p-6 sm:p-8">
            <h3 className="font-display text-xl font-bold text-ink">Prefer to talk?</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Reach our wholesale desk directly and we&apos;ll help you get started.
            </p>
            <dl className="mt-6 space-y-5">
              <div className="flex items-start gap-4">
                <span className="flex size-11 flex-none items-center justify-center rounded-full bg-neem/10 text-neem">
                  <Phone className="size-5" aria-hidden />
                </span>
                <div>
                  <dt className="font-bold text-ink">Phone</dt>
                  <dd className="mt-0.5 text-sm text-ink-muted">{bulkContact.phone}</dd>
                </div>
              </div>
              <div className="flex items-start gap-4 border-t border-cream-200/70 pt-5">
                <span className="flex size-11 flex-none items-center justify-center rounded-full bg-neem/10 text-neem">
                  <Mail className="size-5" aria-hidden />
                </span>
                <div>
                  <dt className="font-bold text-ink">Email</dt>
                  <dd className="mt-0.5 text-sm text-ink-muted">{bulkContact.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-4 border-t border-cream-200/70 pt-5">
                <span className="flex size-11 flex-none items-center justify-center rounded-full bg-neem/10 text-neem">
                  <Clock className="size-5" aria-hidden />
                </span>
                <div>
                  <dt className="font-bold text-ink">Hours</dt>
                  <dd className="mt-0.5 text-sm text-ink-muted">{bulkContact.hoursBn}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
