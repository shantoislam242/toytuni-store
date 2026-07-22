"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { subscribeNewsletter } from "@/lib/forms/actions";

/**
 * Newsletter band — a deep-neem panel with an email capture.
 */
export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      const r = await subscribeNewsletter(email, "journal");
      if (r.ok) {
        setSent(true);
        setEmail("");
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-3xl bg-neem px-6 py-12 text-center text-paper sm:px-10 sm:py-14">
      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Join the Neem Journal
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-paper/85">
        New play ideas, safety notes and Montessori tips — a gentle note now and
        then, never spam.
      </p>

      {sent ? (
        <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-paper/15 px-4 py-2 text-sm font-medium">
          <Check className="size-4" />
          Thanks — you&apos;re on the list.
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:flex-row"
        >
          <label htmlFor="journal-email" className="sr-only">
            Email address
          </label>
          <input
            id="journal-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 flex-1 rounded-full border border-paper/20 bg-paper px-4 text-sm text-ink outline-none placeholder:text-ink-soft focus-visible:border-[color:var(--honey)]"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[color:var(--honey)] px-5 text-sm font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Subscribing…" : "Subscribe"}
            <ArrowRight className="size-4" />
          </button>
        </form>
      )}
    </section>
  );
}
