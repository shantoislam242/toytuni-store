"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";
import { NeemSprig } from "@/components/blog/journal/neem-sprig";
import { subscribeNewsletter } from "@/lib/forms/actions";

/**
 * Newsletter CTA band for the blog — a deep-neem panel with an email capture
 * and a friendly sprig illustration.
 */
export function BlogNewsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      const r = await subscribeNewsletter(email, "blog");
      if (r.ok) {
        setSent(true);
        setEmail("");
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-neem px-6 py-12 text-paper sm:px-10 sm:py-14">
      {/* decorative shapes */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-paper/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-paper/5"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 bottom-6 hidden text-paper/25 lg:block"
      >
        <NeemSprig className="size-40 rotate-12" />
      </span>

      <div className="relative mx-auto max-w-xl text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Play ideas in your inbox
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-paper/85">
          New articles, safety notes and Montessori tips — a gentle note now and
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
            <label htmlFor="blog-newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="blog-newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-paper/20 bg-paper px-5 text-center text-sm text-ink outline-none placeholder:text-ink-soft focus-visible:ring-2 focus-visible:ring-mustard sm:flex-1 sm:rounded-full sm:text-left"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-mustard px-6 text-sm font-semibold text-ink transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:rounded-full"
            >
              {pending ? "Subscribing…" : "Subscribe"}
              <ArrowRight className="size-4" />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
