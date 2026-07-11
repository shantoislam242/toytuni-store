"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Gift,
  Mail,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  GiftCardThumb,
  giftCardGradientClass,
} from "@/components/cart/gift-card-thumb";
import { useCart } from "@/lib/cart/cart-context";
import { crumbs } from "@/lib/breadcrumbs";
import { giftCardAmounts } from "@/lib/mock/gifts";
import { BRAND_NAME } from "@/lib/config";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_QTY = 20;

const redemptionSteps = [
  "Check your email for the gift card code (delivered within minutes).",
  "Add any toys you love to your cart.",
  "Enter the code in the Coupon / Gift Card field at checkout.",
  "The value applies instantly — any remaining balance stays on the card.",
];

const terms = [
  "Valid for 12 months from the date of purchase.",
  "Redeemable online across every collection in the store.",
  "Non-refundable and cannot be exchanged for cash.",
  "Multiple gift cards can be combined on a single order.",
];

/** Large, premium gift-card hero (pure CSS, gradient varies by denomination). */
function GiftCardHero({ amount }: { amount: number }) {
  return (
    <div
      role="img"
      aria-label={`Gift Card — ${formatTk(amount)}`}
      className={cn(
        "relative flex aspect-[16/10] w-full select-none flex-col justify-between overflow-hidden rounded-3xl p-6 text-paper shadow-xl shadow-ink/10 sm:p-8",
        giftCardGradientClass(amount),
      )}
    >
      {/* sheen + decorative discs */}
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-paper/15" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-ink/10" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-paper/20 to-transparent" />

      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-paper/90 sm:text-xs">
          <Gift className="size-5" />
          Gift Card
        </span>
        <span className="font-display text-base font-bold sm:text-lg">{BRAND_NAME}</span>
      </div>

      <div className="relative">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-paper/80">
          Value
        </p>
        <p className="font-display text-4xl font-bold leading-none drop-shadow-sm sm:text-5xl">
          {formatTk(amount)}
        </p>
      </div>
    </div>
  );
}

/**
 * Dedicated Gift Card details page (replaces the old 404 for /products/gift-card-*).
 * Frontend-only: quantity, Add to Cart and Buy Now drive the real cart; the rest
 * is presentational content (delivery, redemption, terms, other denominations).
 */
export function GiftCardDetailsView({ amount }: { amount: number }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const slug = `gift-card-${amount}`;

  const handleAdd = () => {
    addItem(slug, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addItem(slug, qty);
    router.push("/checkout");
  };

  const others = giftCardAmounts.filter((a) => a !== amount);

  return (
    <main className="flex-1 bg-paper">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:max-w-[90rem] lg:px-8">
        <Breadcrumb
          items={crumbs(
            { label: "Gift", href: "/gift" },
            { label: `Gift Card — ${formatTk(amount)}` },
          )}
        />
      </div>

      {/* ===== hero: card visual + purchase ===== */}
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-4 lg:max-w-[90rem] lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <GiftCardHero amount={amount} />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neem/10 px-3 py-1 text-xs font-semibold text-neem-deep">
            <Sparkles className="size-3.5" />
            Digital Gift Card
          </span>

          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Gift Card — {formatTk(amount)}
          </h1>

          <p className="mt-1 font-display text-2xl font-bold text-neem-deep">
            {formatTk(amount)}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-6 text-ink-muted">
            Give the gift of play. A digital gift card worth{" "}
            <span className="font-semibold text-ink">{formatTk(amount)}</span>, delivered
            instantly by email and redeemable on any handmade, non-toxic toy in our
            store. No fees — the perfect present when you&apos;re not sure what to pick.
          </p>

          {/* quantity */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-medium text-ink">Quantity</span>
            <div className="inline-flex items-center rounded-lg border border-cream-300">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="flex size-10 items-center justify-center text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums text-ink">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                disabled={qty >= MAX_QTY}
                aria-label="Increase quantity"
                className="flex size-10 items-center justify-center text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          {/* actions */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={handleAdd}>
              {added ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
              {added ? "Added to Cart" : "Add to Cart"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={handleBuyNow}
            >
              Buy Now
            </Button>
          </div>

          {/* delivery info */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-cream-300 bg-card p-4">
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-neem/10 text-neem-deep">
              <Mail className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Delivered by email</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                This is a digital gift card — nothing ships. The code arrives in the
                recipient&apos;s inbox within minutes, so it&apos;s perfect for
                last-minute gifting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== redemption + terms ===== */}
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:max-w-[90rem] lg:grid-cols-2 lg:px-8">
        <div className="rounded-2xl border border-cream-200 bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Gift className="size-5 text-neem-deep" />
            How to redeem
          </h2>
          <ol className="mt-4 space-y-3">
            {redemptionSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-muted">
                <span className="flex size-6 flex-none items-center justify-center rounded-full bg-neem text-xs font-bold text-paper">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-cream-200 bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <ShieldCheck className="size-5 text-neem-deep" />
            Terms &amp; conditions
          </h2>
          <ul className="mt-4 space-y-2.5">
            {terms.map((term, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-muted">
                <Check className="mt-0.5 size-4 flex-none text-neem" />
                {term}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== other denominations ===== */}
      {others.length ? (
        <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:max-w-[90rem] lg:px-8">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Other gift card values
          </h2>
          <p className="mt-1 text-sm text-ink-muted">Pick the amount that fits.</p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {others.map((a) => (
              <Link
                key={a}
                href={`/products/gift-card-${a}`}
                className="group rounded-2xl border border-cream-200 bg-card p-3 transition-shadow duration-300 hover:shadow-md"
              >
                <div className="aspect-[16/10] overflow-hidden rounded-xl">
                  <GiftCardThumb amount={a} className="size-full" />
                </div>
                <div className="mt-3 flex items-center justify-between px-1 pb-1">
                  <span className="text-sm font-medium text-ink">
                    Gift Card
                  </span>
                  <span className="font-display font-bold text-ink">
                    {formatTk(a)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
