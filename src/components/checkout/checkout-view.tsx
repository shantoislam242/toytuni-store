"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeliverySummary } from "@/components/checkout/delivery-summary";
import { GuestForm } from "@/components/checkout/guest-form";
import { OrderNotes } from "@/components/checkout/order-notes";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PaymentMethods } from "@/components/checkout/payment-methods";
import { ShippingMethod } from "@/components/checkout/shipping-method";
import { useAuth } from "@/lib/auth/auth-context";
import { useCart } from "@/lib/cart/cart-context";
import { useCatalog } from "@/lib/catalog/catalog-context";
import { useCheckout } from "@/lib/checkout/checkout-context";
import { computeAdvance } from "@/lib/data/advance";
import { createOrder } from "@/lib/data/orders";
import type { OverlaidProduct } from "@/lib/data/product-overlay";
import { shippingOptions } from "@/lib/mock/checkout";
import { priceDelivery, zoneForDistrict } from "@/lib/shipping";

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
 * Checkout page. The real session (`useAuth`) switches between the logged-in
 * delivery summary and the guest form. Order submission is wired
 * (`createOrder`); payment remains UI-only.
 */
export function CheckoutView({
  insideDhakaFee,
  outsideDhakaFee,
  freeShippingThreshold,
  codFee,
}: {
  insideDhakaFee: number;
  outsideDhakaFee: number;
  freeShippingThreshold: number;
  codFee: number;
}) {
  const { items, subtotal, hydrated, clear } = useCart();
  // Delivery address chosen in the cart's address modal (drives the summary +
  // the delivery zone label). The actual delivery charge is driven by the
  // shipping-method selector below.
  const { address } = useCheckout();
  const router = useRouter();
  const { bySlug } = useCatalog();

  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("cod");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  // Free shipping unlocks at the threshold. Keep the selection valid: auto-apply
  // free once it unlocks (matches the cart), and never leave "free" selected on
  // an order that no longer qualifies.
  const freeUnlocked = subtotal >= freeShippingThreshold;
  const deliveryZone = address ? zoneForDistrict(address.district) : null;
  const expressAvailable = deliveryZone?.id === "inside_dhaka";

  useEffect(() => {
    if (freeUnlocked) setShipping("free");
    else setShipping((s) => (s === "free" || (s === "express" && !expressAvailable) ? "standard" : s));
  }, [freeUnlocked, expressAvailable]);

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

  // Guard the delivery charge: "free" only counts when the order qualifies,
  // otherwise fall back to Standard (covers the render before the effect syncs).
  const effectiveShippingId =
    (shipping === "free" && !freeUnlocked) || (shipping === "express" && !expressAvailable)
      ? "standard"
      : shipping;
  const deliveryOption =
    shippingOptions.find((o) => o.id === effectiveShippingId) ?? shippingOptions[0];
  // Same helper the server uses in `createOrder` — display and charge can
  // never disagree. Before an address is chosen there's no district to price
  // against, so fall back to the selected option's flat mock price.
  const delivery = address
    ? priceDelivery(shipping, subtotal, address.district, {
        insideDhakaFee, outsideDhakaFee, freeShippingThreshold,
      })
    : deliveryOption.price;
  const deliveryZoneLabel = deliveryZone?.label ?? null;
  // No promo/discount system yet — real orders never apply a phantom discount.
  const discount = 0;
  const codLine = payment === "cod" ? codFee : 0;
  const total = subtotal + delivery + codLine;

  const advanceDueNow = items.reduce((sum, it) => {
    // `bySlug` is typed to the base `Product` shape, but the client catalogue is
    // hydrated from `OverlaidProduct[]` (see `CatalogProviderServer`), so the
    // computed `availability` is present on the actual object at runtime.
    const cat = bySlug(it.product.slug) as OverlaidProduct | undefined;
    if (cat?.availability?.state !== "preorder") return sum;
    return sum + computeAdvance(it.lineTotal, cat.preorderAdvancePct ?? null);
  }, 0);

  const ctaLabel = placing ? "Placing…" : isLoggedIn ? "Place Order" : "Continue to Payment";
  const onCta = async () => {
    if (!isLoggedIn) {
      toast.info("The payment step is coming soon — checkout is UI-only for now.");
      return;
    }
    if (placing) return;
    if (!address) {
      toast.error("Please add a delivery address first.");
      return;
    }

    setPlacing(true);
    try {
      const result = await createOrder({
        customer: { name: address.fullName, phone: address.phone, email: address.email },
        address: {
          division: address.division, district: address.district, area: address.area,
          addressLine: address.addressLine, landmark: address.landmark,
        },
        lines: items.map((it) => ({ slug: it.product.slug, qty: it.qty })),
        notes: notes || undefined,
        deliveryFee: delivery,
        shippingMethodId: effectiveShippingId,
      });

      if (result.ok) {
        clear();
        toast.success(`Order placed! Your order number is ${result.orderNumber}.`);
        router.push("/");
      } else {
        toast.error(result.error);
      }
    } finally {
      setPlacing(false);
    }
  };

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
                <DeliverySummary
                  address={address}
                  onEdit={() => toast.info("Editing is UI-only for now.")}
                />
              ) : (
                <GuestForm />
              )}
            </motion.div>
          </AnimatePresence>

          <Section delay={0.05}>
            <ShippingMethod
              value={effectiveShippingId}
              onChange={setShipping}
              subtotal={subtotal}
              freeShippingThreshold={freeShippingThreshold}
              district={address?.district ?? null}
            />
          </Section>

          <Section delay={0.1}>
            <OrderNotes value={notes} onChange={setNotes} />
          </Section>

          <Section delay={0.15}>
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
                deliveryZoneLabel={deliveryZoneLabel}
                discount={discount}
                codFee={codLine}
                total={total}
                ctaLabel={ctaLabel}
                onCta={onCta}
                advanceDueNow={advanceDueNow}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
