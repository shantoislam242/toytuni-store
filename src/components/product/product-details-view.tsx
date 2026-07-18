"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Baby, BadgeCheck, Check, CreditCard, FlaskConical, Leaf, Mail, Minus, Package,
  Plus, Recycle, ShieldCheck, Star, Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/breadcrumb";
import { crumbs } from "@/lib/breadcrumbs";
import dynamic from "next/dynamic";
import { AgeInsight } from "@/components/product/age-insight";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductTabs } from "@/components/product/product-tabs";
import { ProductReviews } from "@/components/product/product-reviews";
import { ProductRail } from "@/components/product/product-rail";
import { WishlistButton } from "@/components/product/wishlist-button";
import { useCart } from "@/lib/cart/cart-context";
import { formatDate, formatTk } from "@/lib/format";
import { expertInsightsHref } from "@/lib/routes";
import { certifications } from "@/lib/mock/trust";
import { cn } from "@/lib/utils";
import type { AgeTier, Category, Product, ProductDetail } from "@/lib/types";
import type { ProductAvailability } from "@/lib/data/product-state";

// Shown only after an add-to-cart click — defer its framer-motion + portal code.
const CartAddedPopup = dynamic(
  () => import("@/components/cart/cart-added-popup").then((m) => m.CartAddedPopup),
  { ssr: false },
);

const certIcon = {
  "shield-check": ShieldCheck,
  leaf: Leaf,
  baby: Baby,
  recycle: Recycle,
  "badge-check": BadgeCheck,
  "flask-conical": FlaskConical,
} as const;

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-5",
            index < rounded ? "fill-mustard text-mustard" : "fill-cream-300 text-cream-300",
          )}
        />
      ))}
    </div>
  );
}

// Brand glyphs for social share (lucide dropped brand icons) — inline SVG
// (simple-icons paths), same pattern as the footer.
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ProductDetailsView({
  product,
  detail,
  ageTier,
  category,
  related,
}: {
  product: Product & { availability?: ProductAvailability };
  detail: ProductDetail;
  ageTier?: AgeTier;
  category?: Category;
  related: Product[];
}) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [showAdded, setShowAdded] = useState(false);

  // Once the product is in the cart, the Add button locks to "Added" — the
  // quantity is only changed from the cart page, so it can't be added twice.
  const inCart = items.some((it) => it.product.slug === product.slug);

  const availability = product.availability;
  const isPreorder = availability?.state === "preorder";
  const isSoldOut = availability?.state === "sold_out";

  // Current page URL for the social-share links (client-only; empty during SSR).
  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  // Auto-dismiss the "Added to Cart" confirmation, matching the product cards.
  useEffect(() => {
    if (!showAdded) return;
    const timeout = window.setTimeout(() => setShowAdded(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [showAdded]);

  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const handleAddToCart = () => {
    if (inCart) return; // already added — no duplicate lines / silent increments
    addItem(product.slug, quantity);
    setShowAdded(true);
  };
  const buyNow = () => {
    if (!inCart) addItem(product.slug, quantity);
    router.push("/cart");
  };

  // Social share targets. Each builds its share URL from a given page URL. The
  // click handler reads the live window.location at click time, so the link is
  // always valid regardless of SSR/hydration timing. Networks open a small
  // popup; Email opens the mail client. (Counter is a static placeholder.)
  const shareText_ = encodeURIComponent(`${product.titleBn} — handmade neem-wood toy`);
  const shareTargets: {
    label: string;
    icon: ReactNode;
    email?: boolean;
    build: (url: string) => string;
  }[] = [
    {
      label: "Facebook",
      icon: <FacebookIcon className="size-4" />,
      build: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    },
    {
      label: "LinkedIn",
      icon: <LinkedInIcon className="size-4" />,
      build: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
    },
    {
      label: "WhatsApp",
      icon: <WhatsAppIcon className="size-4" />,
      build: (u) => `https://wa.me/?text=${shareText_}%20${encodeURIComponent(u)}`,
    },
    {
      label: "X",
      icon: <XIcon className="size-4" />,
      build: (u) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${shareText_}`,
    },
    {
      label: "Email",
      icon: <Mail className="size-4" />,
      email: true,
      build: (u) =>
        `mailto:?subject=${encodeURIComponent(product.titleBn)}&body=${shareText_}%20${encodeURIComponent(u)}`,
    },
  ];

  const handleShare = (
    e: MouseEvent<HTMLAnchorElement>,
    target: (typeof shareTargets)[number],
  ) => {
    // Rewrite the href to the live page URL right before the browser follows
    // it, so the share always carries the correct URL regardless of hydration
    // timing. No preventDefault / window.open — native target="_blank" (and
    // mailto:) navigation is never blocked by popup blockers.
    const url = typeof window !== "undefined" ? window.location.href : shareUrl;
    e.currentTarget.href = target.build(url);
  };

  return (
    <main className="flex-1 bg-paper">
      {/* breadcrumb */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:max-w-[90rem] lg:px-8">
        <Breadcrumb
          items={crumbs(
            { label: "Shop", href: "/collections/all" },
            ...(category
              ? [{ label: category.nameBn, href: category.href }]
              : []),
            { label: product.titleBn },
          )}
        />
      </div>

      {/* ===== top: gallery + purchase (balanced 50/50) ===== */}
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-4 lg:max-w-[90rem] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10 lg:px-8">
        {/* An admin-set image_url (via the DB overlay) wins over the mock
            image list; absent, the PDP keeps showing the existing mock
            gallery unchanged. */}
        <ProductGallery
          images={product.imageUrl ? [product.imageUrl] : detail.imageSrcs}
          imageLabel={product.imageLabelBn}
          imageTones={product.imageTones}
        />

        <div className="flex flex-col lg:pl-6">
          {/* tags + wishlist */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {ageTier ? (
                <span className="rounded-full bg-mustard/35 px-3 py-1 text-sm font-medium text-ink">
                  {ageTier.labelBn}
                </span>
              ) : null}
              {/* Expert Insight — info (ⓘ) popover explaining the age fit + benefits. */}
              {ageTier ? (
                <AgeInsight
                  ageLabel={ageTier.labelBn}
                  focus={ageTier.taglineBn}
                  benefits={detail.benefits}
                  learnMoreHref={expertInsightsHref(product.slug)}
                />
              ) : null}
            </div>
            {/* wishlist — mobile/tablet keeps it up here; desktop moves it
                beside the product name below (see the title row). */}
            <div className="lg:hidden">
              <WishlistButton slug={product.slug} className="border border-cream-200 bg-paper" />
            </div>
          </div>

          {/* rating */}
          <div className="mt-3 flex items-center gap-3">
            <Stars rating={product.rating} />
            <span className="text-sm font-semibold text-ink-muted">
              {product.reviewCount} reviews
            </span>
          </div>

          <div className="mt-2.5 flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {product.titleBn}
            </h1>
            {/* wishlist — desktop only; sits right beside the product name. */}
            <div className="hidden shrink-0 lg:block">
              <WishlistButton
                slug={product.slug}
                className="border border-cream-200 bg-paper"
              />
            </div>
          </div>

          {/* Product Code (SKU) — sits between the title and description.
              Label is muted; the code itself uses the primary ink colour with a
              medium weight. Value is dynamic per product (never hardcoded). */}
          <p className="mt-2 text-sm text-ink-muted">
            Product Code:{" "}
            <span className="font-medium text-ink">{product.sku}</span>
          </p>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            {detail.description}
          </p>

          <p className="mt-2 text-sm font-bold text-terracotta">
            300k+ babies growing with our product
          </p>

          {/* price */}
          <div className="mt-3 flex flex-wrap items-end gap-3">
            {product.compareAtPrice ? (
              <span className="text-lg text-ink line-through">
                {formatTk(product.compareAtPrice)}
              </span>
            ) : null}
            <span className="font-display text-2xl font-bold text-danger">
              {formatTk(product.price)}
            </span>
            {discount ? (
              <span className="mb-1 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">
                {discount}% off
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink-muted">Taxes included.</p>

          {/* quantity + actions */}
          <div className="mt-4 grid gap-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink-muted">Quantity</p>
              <div className="inline-grid h-11 grid-cols-3 overflow-hidden rounded-md border border-ink-soft/60 bg-paper">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  aria-label="Decrease quantity"
                  className="flex w-14 items-center justify-center text-ink-muted transition hover:bg-cream-100"
                >
                  <Minus className="size-4" />
                </button>
                <span className="flex w-14 items-center justify-center text-base font-medium text-ink">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  aria-label="Increase quantity"
                  className="flex w-14 items-center justify-center text-ink-muted transition hover:bg-cream-100"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
              <Button
                type="button"
                onClick={handleAddToCart}
                disabled={isSoldOut || inCart}
                aria-label={isSoldOut ? "Sold out" : inCart ? "Added to cart" : "Add to cart"}
                className={cn(
                  "h-11 gap-2 rounded-lg bg-neem px-4 text-[13px] font-bold text-paper hover:bg-neem-deep",
                  inCart && !isSoldOut && "bg-neem-deep disabled:opacity-100",
                )}
              >
                {isSoldOut ? (
                  "Sold out"
                ) : inCart ? (
                  <>
                    <Check className="size-4" />
                    Added
                  </>
                ) : isPreorder ? (
                  "Pre-order now"
                ) : (
                  "Add to Cart"
                )}
              </Button>
              <Button
                type="button"
                onClick={buyNow}
                disabled={isSoldOut}
                className="h-11 rounded-lg bg-ink px-4 text-[13px] font-bold text-paper hover:bg-ink/90"
              >
                Buy Now
              </Button>
            </div>
            {availability?.state === "preorder" ? (
              <div className="mt-1 space-y-1.5 rounded-lg border border-cream-200 bg-cream-50/60 p-3 text-sm">
                <p className="flex items-center gap-2 text-ink-muted">
                  <Package className="size-4 flex-none text-neem" aria-hidden />
                  Shipping starts from{" "}
                  <span className="font-medium text-ink">{formatDate(availability.shipDate)}</span>
                </p>
                {availability.deliveryDate ? (
                  <p className="flex items-center gap-2 text-ink-muted">
                    <Truck className="size-4 flex-none text-neem" aria-hidden />
                    Expected delivery{" "}
                    <span className="font-medium text-ink">{formatDate(availability.deliveryDate)}</span>
                  </p>
                ) : null}
                {availability.advancePct && availability.advancePct > 0 ? (
                  <p className="flex items-center gap-2 text-ink-muted">
                    <CreditCard className="size-4 flex-none text-neem" aria-hidden />
                    Advance {availability.advancePct}% ·{" "}
                    <span className="font-medium text-ink">{formatTk(availability.advanceAmount)}</span>{" "}
                    now /{" "}
                    <span className="font-medium text-ink">
                      {formatTk(product.price - availability.advanceAmount)}
                    </span>{" "}
                    on delivery
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* trust strip */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {certifications.map((cert) => {
              const Icon = certIcon[cert.icon];
              return (
                <div key={cert.id} className="flex items-center gap-2.5">
                  <span className="flex size-9 flex-none items-center justify-center rounded-full bg-neem/10 text-neem">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs font-medium leading-tight text-ink-muted">
                    {cert.labelBn}
                  </span>
                </div>
              );
            })}
          </div>

          {/* social share — below the trust features */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-ink-muted">
              9K shares
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {shareTargets.map((s) => (
                <a
                  key={s.label}
                  href={s.build(shareUrl)}
                  onClick={(e) => handleShare(e, s)}
                  target={s.email ? undefined : "_blank"}
                  rel={s.email ? undefined : "noopener noreferrer"}
                  aria-label={`Share on ${s.label}`}
                  title={`Share on ${s.label}`}
                  className="flex size-9 items-center justify-center rounded-full bg-ink/5 text-ink-muted transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-110 hover:bg-neem hover:text-paper hover:shadow-md hover:shadow-neem/25 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== certified logo ===== */}
      {/* pointer-events-none: this section is pulled up (lg:-mt-20) and would
          otherwise overlap — and swallow clicks on — the share row above it.
          It's a purely decorative image, so nothing here needs to be clickable. */}
      <section className="pointer-events-none mx-auto w-full max-w-6xl px-4 pb-2 pt-6 sm:px-6 lg:-mt-20 lg:max-w-[90rem] lg:px-8 lg:pt-0">
        <div className="flex justify-center">
          <Image
            src="/images/certified%20Logo/certlogo.webp"
            alt="Product certifications"
            width={1885}
            height={834}
            className="h-auto w-full max-w-2xl object-contain"
          />
        </div>
      </section>

      {/* ===== details tabs ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:-mt-12 lg:max-w-[90rem] lg:px-8">
        <ProductTabs detail={detail} />
      </section>

      {/* ===== related products ===== */}
      {/* width matches the header container (brand ↔ cart) so the rail lines up */}
      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:max-w-[90rem] lg:px-8">
        <ProductRail title="You may also like" products={related} viewAllHref="/collections/all" />
      </section>

      {/* ===== reviews ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:max-w-[90rem] lg:px-8">
        <ProductReviews
          reviews={detail.reviews ?? []}
          rating={product.rating}
          reviewCount={product.reviewCount}
        />
      </section>

      {showAdded ? (
        <CartAddedPopup title={product.titleBn} onClose={() => setShowAdded(false)} />
      ) : null}
    </main>
  );
}
