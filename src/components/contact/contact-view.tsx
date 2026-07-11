import {
  BadgeCheck,
  Baby,
  Clock,
  Heart,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { crumbs } from "@/lib/breadcrumbs";
import { ContactForm } from "@/components/contact/contact-form";
import { ContactImage } from "@/components/contact/contact-image";
import { contactInfo, contactTrust } from "@/lib/mock/contact";

const infoIcon = {
  "map-pin": MapPin,
  phone: Phone,
  mail: Mail,
  clock: Clock,
} as const;

const featureIcon = {
  baby: Baby,
  leaf: Leaf,
  "badge-check": BadgeCheck,
  heart: Heart,
} as const;

export function ContactView() {
  return (
    <main className="flex-1 bg-paper">
      {/* hero */}
      <section className="relative mx-auto w-full max-w-[80rem] overflow-hidden px-4 pt-6 pb-8 text-center sm:px-6 lg:px-8">
        <Breadcrumb items={crumbs({ label: "Contact" })} />
        {/* decorative leaf sprig (bottom-left) */}
        <Leaf
          className="pointer-events-none absolute left-6 top-28 size-8 -rotate-12 text-neem/20 sm:left-16"
          aria-hidden
        />

        {/* paper-plane doodle with a dotted, looping flight trail */}
        <svg
          viewBox="0 0 130 130"
          aria-hidden
          className="pointer-events-none absolute right-[20%] top-1 hidden h-24 w-24 text-neem/50 sm:block"
        >
          {/* paper plane, pointing up-right */}
          <path
            d="M70 46 L112 14 L96 54 L86 44 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M86 44 L112 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* dotted trail looping downward */}
          <path
            d="M78 54 C 68 78, 98 80, 92 100 C 88 114, 68 112, 76 96 C 81 84, 98 88, 102 74"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeDasharray="0.5 7"
            strokeLinecap="round"
          />
        </svg>

        <span className="inline-flex items-center gap-2 rounded-full border border-neem/20 bg-neem/10 px-4 py-1.5 text-sm font-semibold text-neem-deep">
          <Sparkles className="size-4" />
          We&apos;re Here to Help
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold text-ink sm:text-5xl">
          Get in Touch
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted">
          Have a question about our toys, your order, or anything else? We&apos;d love to hear from you!
        </p>
      </section>

      {/* body: message form + contact information (two cards) */}
      <section className="mx-auto grid w-full max-w-[80rem] gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-8">
        <ContactForm />

        {/* contact information card */}
        <div className="rounded-2xl border border-cream-200 bg-neem/5 p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">Contact Information</h2>
          <dl className="mt-6 space-y-5">
            {contactInfo.map((item, i) => {
              const Icon = infoIcon[item.icon];
              return (
                <div
                  key={item.id}
                  className={i > 0 ? "border-t border-cream-200/70 pt-5" : undefined}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 flex-none items-center justify-center rounded-full bg-neem/10 text-neem">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <dt className="font-bold text-ink">{item.label}</dt>
                      <dd className="mt-0.5 space-y-0.5 text-sm text-ink-muted">
                        {item.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </dd>
                    </div>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </section>

      {/* full-width hero image band with a newsletter card overlaid on the
          image's bottom-left corner (uses the empty left space of the artwork) */}
      <section className="mx-auto w-full max-w-[80rem] px-4 pb-12 sm:px-6 lg:px-8">
        <div className="relative">
          <ContactImage />

          <div className="absolute bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 text-center sm:bottom-8">
            <h3 className="font-display text-lg font-bold text-ink sm:text-xl">
              Subscribe our newsletter
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Get early access to new toys, offers, and parenting tips.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-full border border-cream-300 bg-paper p-1.5 pl-4">
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email address"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
              />
              <span className="h-6 w-px shrink-0 bg-cream-300" aria-hidden />
              <button
                type="button"
                aria-label="Subscribe"
                className="group flex size-9 shrink-0 items-center justify-center rounded-full bg-neem text-paper transition-colors hover:bg-neem-deep"
              >
                {/* Paper-plane rotates on hover, matching the footer signup. */}
                <Send className="size-4 transition-transform duration-300 ease-out group-hover:rotate-45" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* trust strip */}
      <section className="mx-auto w-full max-w-[80rem] px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 rounded-2xl border border-cream-200 bg-cream-50/50 px-6 py-10 lg:grid-cols-4">
          {contactTrust.map((f) => {
            const Icon = featureIcon[f.icon];
            return (
              <div key={f.id} className="flex flex-col items-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-neem/10 text-neem">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-3 font-bold text-ink">{f.label}</h3>
                <p className="mt-1 max-w-[16rem] text-sm text-ink-muted">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
