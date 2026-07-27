"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { Check, Leaf, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/lib/forms/actions";
import { DEFAULT_POPUP_IMAGE, type PopupContent } from "@/lib/data/popup-shape";

// Don't interrupt purchase/auth/account flows or the admin app.
const EXCLUDED = ["/admin", "/signin", "/signup", "/auth", "/checkout", "/cart", "/account"];
const isExcluded = (p: string) =>
  EXCLUDED.some((r) => p === r || p.startsWith(`${r}/`));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const inputCls =
  "h-11 w-full rounded-full border border-cream-300 bg-paper px-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

/**
 * Timed newsletter pop-up. Appears ~30s after each fresh page load (the timer
 * survives client navigations since this lives in the root layout's deferred
 * islands, but resets on a full reload — so a returning visitor sees it again).
 * Closing marks it dismissed for the current load only; it stays out of
 * purchase/auth/account flows. Reuses `subscribeNewsletter` (source "popup"),
 * so sign-ups land in the admin inbox like any other.
 */
export function NewsletterPopup({ content }: { content: PopupContent }) {
  const pathname = usePathname();
  const [armed, setArmed] = useState(false); // 30s elapsed
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false); // closed/subscribed this session
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Arm after the admin-set delay on each fresh page load — no persistence, so
  // it shows on every new visit. Only the in-memory `dismissed` flag stops it
  // reopening within the same load once closed. Skipped when disabled.
  useEffect(() => {
    if (!content.enabled) return;
    const id = window.setTimeout(() => setArmed(true), content.delaySeconds * 1000);
    return () => window.clearTimeout(id);
  }, [content.enabled, content.delaySeconds]);

  // Open when armed, but only on an allowed route (waits if currently excluded).
  // `dismissed` stops it reopening the instant it's closed (the effect would
  // otherwise re-fire since `armed` stays true).
  useEffect(() => {
    if (armed && !open && !dismissed && !done && !isExcluded(pathname)) setOpen(true);
  }, [armed, pathname, open, dismissed, done]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDismissed(true); // don't reopen within this page load
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const res = await subscribeNewsletter(email.trim(), "popup", firstName);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setDone(true);
  };

  // Never mount when disabled or on excluded routes (keeps the portal out too).
  if (!content.enabled || isExcluded(pathname)) return null;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-cream-300 bg-paper text-ink shadow-2xl duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none">
          <Dialog.Close
            className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-paper/80 text-ink-soft shadow-sm backdrop-blur transition-colors hover:bg-cream-200 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4.5" />
          </Dialog.Close>

          <div className="grid w-full items-stretch sm:grid-cols-2">
            {/* image panel — hidden on phones to keep the card compact */}
            <div className="relative hidden min-h-[24rem] sm:block">
              <Image
                src={content.image ?? DEFAULT_POPUP_IMAGE}
                alt=""
                fill
                sizes="(min-width: 640px) 24rem, 0px"
                className="object-cover"
              />
            </div>

            {/* content panel */}
            <div className="flex flex-col justify-center overflow-y-auto bg-gradient-to-br from-cream-50 to-paper p-6 [scrollbar-width:thin] sm:p-8">
              {done ? (
                <div className="text-center">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-neem/10 text-neem-deep">
                    <Check className="size-7" strokeWidth={2.5} />
                  </span>
                  <h2 className="mt-4 font-display text-2xl font-bold text-ink">
                    {content.successHeading}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-muted">
                    {content.successBody}
                  </p>
                  <Dialog.Close className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-neem px-8 text-sm font-bold text-paper transition-colors hover:bg-neem-deep">
                    Continue shopping
                  </Dialog.Close>
                </div>
              ) : (
                <>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neem/10 px-3 py-1 text-xs font-semibold text-neem-deep">
                    <Leaf className="size-3.5" />
                    {content.eyebrow}
                  </span>
                  <Dialog.Title className="mt-3 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
                    {content.heading}
                  </Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm leading-6 text-ink-muted">
                    {content.subheading}
                  </Dialog.Description>

                  <form onSubmit={submit} noValidate className="mt-5 space-y-3">
                    <input
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      aria-label="First name"
                      className={inputCls}
                    />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      aria-label="Email address"
                      required
                      className={inputCls}
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neem text-sm font-bold uppercase tracking-wide text-paper transition-colors hover:bg-neem-deep disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                      {submitting ? "Joining…" : content.buttonLabel}
                    </button>
                  </form>

                  <p className="mt-3 text-center text-[11px] text-ink-soft">{content.finePrint}</p>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
