"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Send } from "lucide-react";
import { useHomeReset } from "@/components/layout/home-reset";
import { subscribeNewsletter } from "@/lib/forms/actions";

/**
 * Footer newsletter capture. Keeps the footer a server component by isolating
 * the interactive form here.
 *
 * The footer lives outside the HomeResetBoundary (it's shared chrome), so it
 * won't remount on a logo "refresh". Instead we subscribe to `resetKey` and
 * clear the form ourselves, so a homepage refresh returns this to its default
 * empty state too.
 */
export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const { resetKey } = useHomeReset();

  // Clear back to the empty form whenever the homepage is "refreshed" via the logo.
  useEffect(() => {
    setSent(false);
    setEmail("");
  }, [resetKey]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    start(async () => {
      const r = await subscribeNewsletter(email, "footer");
      if (r.ok) {
        setSent(true);
        setEmail("");
      } else {
        toast.error(r.error);
      }
    });
  };

  if (sent) {
    return (
      <p className="mt-3 inline-flex max-w-sm items-center gap-2 rounded-full bg-neem/10 px-4 py-2.5 text-sm font-medium text-neem-deep">
        <Check className="size-4" />
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex max-w-sm items-center gap-2 rounded-full border border-cream-300 bg-paper p-1.5 pl-4"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        aria-label="Email address"
        className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
      />
      <span className="h-6 w-px shrink-0 bg-cream-300" aria-hidden />
      <button
        type="submit"
        disabled={pending}
        aria-label="Subscribe"
        className="group flex size-9 shrink-0 items-center justify-center rounded-full bg-neem text-paper transition-colors hover:bg-neem-deep disabled:cursor-not-allowed disabled:opacity-70"
      >
        {/* Paper-plane rotates to the right on hover. */}
        <Send className="size-4 transition-transform duration-300 ease-out group-hover:rotate-45" />
      </button>
    </form>
  );
}
