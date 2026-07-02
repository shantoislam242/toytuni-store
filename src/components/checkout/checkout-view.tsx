"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeliverySummary } from "@/components/checkout/delivery-summary";
import { GuestForm } from "@/components/checkout/guest-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PaymentMethods } from "@/components/checkout/payment-methods";
import { ShippingMethod } from "@/components/checkout/shipping-method";
import { useCart } from "@/lib/cart/cart-context";
import { shippingOptions } from "@/lib/mock/checkout";
import { cn } from "@/lib/utils";

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Checkout page — UI only. A mock `isLoggedIn` boolean switches between the
 * logged-in summary and the guest form (a preview toggle lets you see both).
 * No backend, auth, payment, or order submission is wired up.
 */
export function CheckoutView() {
  const { items, subtotal, hydrated } = useCart();

  // Mock auth state — replace with the real session later.
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("cod");

  if (!hydrated) {
    return <main className="mx-auto min-h-[50vh] w-full max-w-[80rem] flex-1 px-4 py-10" />;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <ShoppingBag className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            Nothing to check out yet
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Add a few toys to your cart to continue.
          </p>
          <Button asChild className="mt-6">
            <Link href="/collections/all">
              Browse toys
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const deliveryOption = shippingOptions.find((o) => o.id === shipping) ?? shippingOptions[0];
  const delivery = deliveryOption.price;
  // Mock promotional discount so the summary shows the line (UI only).
  const discount = Math.round(subtotal * 0.1);
  const total = Math.max(0, subtotal - discount + delivery);

  const ctaLabel = isLoggedIn ? "Place Order" : "Continue to Payment";
  const onCta = () =>
    toast.info(
      isLoggedIn
        ? "Placing orders is coming soon — checkout is UI-only for now."
        : "The payment step is coming soon — checkout is UI-only for now.",
    );

  return (
    <main className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isLoggedIn
              ? "Review your details and place your order."
              : "Enter your details to continue."}
          </p>
        </div>

        {/* preview toggle — demo only, remove once real auth is connected */}
        <div className="inline-flex items-center gap-2">
          <span className="text-xs font-medium text-ink-soft">Preview:</span>
          <div className="inline-flex rounded-full border border-cream-300 bg-card p-1 text-sm">
            {[
              { key: true, label: "Logged in" },
              { key: false, label: "Guest" },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setIsLoggedIn(opt.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-medium transition-colors",
                  isLoggedIn === opt.key
                    ? "bg-neem text-paper"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* left: details + shipping + payment */}
        <div className="space-y-6 lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLoggedIn ? "logged-in" : "guest"}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {isLoggedIn ? (
                <DeliverySummary onEdit={() => toast.info("Editing is UI-only for now.")} />
              ) : (
                <GuestForm />
              )}
            </motion.div>
          </AnimatePresence>

          <Section delay={0.05}>
            <ShippingMethod value={shipping} onChange={setShipping} />
          </Section>

          <Section delay={0.1}>
            <PaymentMethods value={payment} onChange={setPayment} />
          </Section>
        </div>

        {/* right: order summary — sticky on desktop (lg+) so it stays visible
            while scrolling the form; a normal block on mobile/tablet. The grid
            column stretches to the row height, giving the sticky card room to
            travel and stop naturally at the container's end (never the footer).
            The top offset must clear the site header, which is a two-row sticky
            bar (~112px tall when collapsed on scroll) — a smaller offset let the
            card slide UNDER the header and clipped its top. The inner wrapper is
            capped to the remaining viewport height and scrolls internally only
            if the card is ever taller than the screen, so nothing is cropped;
            its padding keeps the card's shadow/rounded corners from being
            clipped by the scroll box. Opacity-only entrance avoids a leftover
            transform that would break position: sticky. */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            className="lg:sticky lg:top-[124px]"
          >
            <div className="lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:overscroll-contain lg:p-1 [scrollbar-width:thin]">
              <OrderSummary
                items={items}
                subtotal={subtotal}
                delivery={delivery}
                discount={discount}
                total={total}
                ctaLabel={ctaLabel}
                onCta={onCta}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
