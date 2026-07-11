"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/product/product-image";
import { productBySlug, products } from "@/lib/mock/products";
import { readRecentlyViewed } from "@/lib/recently-viewed";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

// Mock selection shown to first-time visitors who have no real history yet.
const defaultRecentlyViewed = products.slice(0, 8);

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${rating.toFixed(1)}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < rounded ? "fill-mustard text-mustard" : "fill-cream-300 text-cream-300",
          )}
        />
      ))}
    </div>
  );
}

/** Compact card: image, title, rating, price, and a Quick Add button. */
function RecentlyViewedCard({ product }: { product: Product }) {
  const href = `/products/${product.slug}`;
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-cream-200 bg-card transition-shadow duration-300 hover:shadow-md">
      <Link href={href} className="relative block aspect-square overflow-hidden bg-frame">
        <ProductImage
          slug={product.slug}
          imageNum={1}
          label={product.imageLabelBn}
          fallbackTone={product.imageTones[0]}
          className="size-full transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link
          href={href}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-ink transition-colors duration-300 hover:text-neem-deep"
        >
          {product.titleBn}
        </Link>

        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-xs text-ink-soft">({product.reviewCount})</span>
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base font-bold leading-none text-ink">
              {formatTk(product.price)}
            </span>
            {product.compareAtPrice ? (
              <span className="text-xs text-ink-soft line-through">
                {formatTk(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
          <AddToCartButton
            slug={product.slug}
            title={product.titleBn}
            className="mt-2.5 h-9 w-full min-w-0 px-2 text-[0.8rem]"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * "Recently Viewed" section — a horizontally scrollable rail of compact product
 * cards (swipe on mobile, arrows on desktop). Frontend-only: reads real browsing
 * history from the browser's localStorage (see `@/lib/recently-viewed`), most
 * recent first, excluding the current product. Falls back to a mock selection
 * for first-time visitors with no history yet. Renders nothing when empty.
 */
export function RecentlyViewed({
  excludeSlug,
  fallback = defaultRecentlyViewed,
  title = "Recently Viewed",
  subtitle = "Pick up right where you left off.",
  max = 10,
}: {
  /** Product to omit (e.g. the one currently open on a product page). */
  excludeSlug?: string;
  /** Shown when the visitor has no stored history yet. */
  fallback?: Product[];
  title?: string;
  subtitle?: string;
  max?: number;
}) {
  // `null` until mounted, so server + first client render match (they show the
  // fallback), then we swap in the real history after reading localStorage.
  const [slugs, setSlugs] = useState<string[] | null>(null);
  useEffect(() => {
    setSlugs(readRecentlyViewed());
  }, []);

  const fromHistory =
    slugs
      ?.filter((s) => s !== excludeSlug)
      .map((s) => productBySlug(s))
      .filter((p): p is Product => Boolean(p)) ?? [];

  const items = (
    fromHistory.length > 0 ? fromHistory : fallback.filter((p) => p.slug !== excludeSlug)
  ).slice(0, max);

  if (!items.length) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:max-w-[90rem] lg:px-8 lg:py-16">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
      </div>

      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-2 overflow-visible sm:-ml-3">
          {items.map((p) => (
            <CarouselItem
              key={p.slug}
              className="basis-[47%] pl-2 sm:basis-1/3 sm:pl-3 lg:basis-1/5"
            >
              <RecentlyViewedCard product={p} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 hidden sm:flex" />
        <CarouselNext className="right-2 hidden sm:flex" />
      </Carousel>
    </section>
  );
}
