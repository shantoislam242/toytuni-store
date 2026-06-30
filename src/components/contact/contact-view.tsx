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
      <section className="mx-auto w-full max-w-[92rem] px-4 pt-12 pb-8 text-center sm:px-6 lg:px-8">
        <p className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-terracotta">
          Get in touch
          <Sparkles className="size-4" />
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ink sm:text-5xl">
          We&apos;d Love to Hear From You
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted">
          Have a question about our toys, your order, or anything else? We&apos;re here to help!
        </p>
      </section>

      {/* body: form / details / image */}
      <section className="mx-auto grid w-full max-w-[92rem] gap-8 px-4 pb-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr_1fr] lg:gap-10 lg:px-8">
        <ContactForm />

        {/* contact details */}
        <div>
          <h2 className="font-display text-2xl font-bold text-neem-deep">Get in Touch</h2>
          <dl className="mt-6 space-y-5">
            {contactInfo.map((item, i) => {
              const Icon = infoIcon[item.icon];
              return (
                <div
                  key={item.id}
                  className={i > 0 ? "border-t border-cream-200 pt-5" : undefined}
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

        {/* hero image */}
        <div className="min-h-[340px] lg:min-h-0">
          <ContactImage />
        </div>
      </section>

      {/* trust strip */}
      <section className="mx-auto w-full max-w-[92rem] px-4 pb-16 sm:px-6 lg:px-8">
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
