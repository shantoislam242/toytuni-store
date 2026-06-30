import {
  BadgeCheck,
  Baby,
  Clock,
  Heart,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
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
      <section className="relative mx-auto w-full max-w-[80rem] overflow-hidden px-4 pt-12 pb-8 text-center sm:px-6 lg:px-8">
        {/* decorative leaves */}
        <Leaf
          className="pointer-events-none absolute left-6 top-24 size-8 -rotate-12 text-neem/15 sm:left-16"
          aria-hidden
        />
        <Leaf
          className="pointer-events-none absolute right-8 top-10 size-10 rotate-45 text-neem/15 sm:right-24"
          aria-hidden
        />

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

      {/* full-width hero image band */}
      <section className="mx-auto w-full max-w-[80rem] px-4 pb-12 sm:px-6 lg:px-8">
        <ContactImage />
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
