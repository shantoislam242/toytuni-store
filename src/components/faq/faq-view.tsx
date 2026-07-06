import Link from "next/link";
import {
  Leaf,
  Lock,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { FaqExplorer } from "@/components/faq/faq-explorer";
import { Reveal } from "@/components/policy/reveal";

const trustCards: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: ShieldCheck, title: "Safe & Non-Toxic", desc: "Child-safe, natural neem-wood toys." },
  { icon: Truck, title: "Fast Shipping", desc: "Most orders dispatched within 24 hours." },
  { icon: RefreshCw, title: "Easy Returns", desc: "Hassle-free returns within 7 days." },
  { icon: Lock, title: "Secure Payments", desc: "Safe checkout, with COD available." },
];

/**
 * FAQ support-center page: a hero with soft decorative background, the
 * interactive FaqExplorer (search + filter + accordion), a "still need help" CTA,
 * and a trust row. Server component — the explorer and Reveal are client islands.
 */
export function FaqView() {
  return (
    <main className="flex-1 bg-paper">
      {/* hero */}
      <section className="relative mx-auto w-full max-w-6xl lg:max-w-[90rem] px-4 pt-6 pb-8 text-center sm:px-6 lg:px-8">
        {/* soft decorative background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-neem/10 blur-3xl" />
          <div className="absolute top-8 right-6 size-40 rounded-full bg-mustard/10 blur-3xl" />
          <div className="absolute top-16 left-6 size-40 rounded-full bg-dusty-blue/10 blur-3xl" />
          <Leaf className="absolute left-[12%] top-24 size-8 -rotate-12 text-neem/20" />
          <Leaf className="absolute right-[14%] top-16 size-6 rotate-[18deg] text-neem/20" />
        </div>

        <div className="relative">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "FAQs" }]} />
          <Reveal className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-neem/20 bg-neem/10 px-4 py-1.5 text-sm font-semibold text-neem-deep">
              Support Center
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-muted">
              Find quick answers about our products, shipping, orders, returns, and
              payments. Can&apos;t find what you&apos;re looking for? We&apos;re just a
              message away.
            </p>
          </Reveal>
        </div>
      </section>

      {/* search + filter + accordion */}
      <section className="mx-auto w-full max-w-6xl lg:max-w-[90rem] px-4 pb-8 sm:px-6 lg:px-8">
        <Reveal>
          <FaqExplorer />
        </Reveal>
      </section>

      {/* still need help */}
      <section className="mx-auto w-full max-w-6xl lg:max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8">
        <Reveal>
          <div className="rounded-3xl border border-neem/20 bg-neem/5 px-6 py-12 text-center sm:px-10">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-neem/10 text-neem">
              <MessageCircle className="size-7" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
              Still have questions?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-ink-muted">
              Our friendly support team is here to help with anything about your order,
              our toys, or your account.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-colors hover:bg-neem-deep"
              >
                Contact us
              </Link>
              <a
                href="mailto:hello@databrandix.com"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-cream-300 bg-paper px-6 text-sm font-bold text-ink transition-colors hover:border-neem"
              >
                <Mail className="size-4 text-neem" aria-hidden />
                Email support
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* trust row */}
      <section className="mx-auto w-full max-w-6xl lg:max-w-[90rem] px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {trustCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="flex flex-col items-start rounded-2xl border border-cream-200 bg-paper p-5 shadow-sm transition-shadow duration-300 hover:shadow-md"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-neem/10 text-neem">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <h3 className="mt-3 font-bold text-ink">{card.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>
    </main>
  );
}
