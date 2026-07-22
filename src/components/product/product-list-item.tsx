"use client";

import Link from "next/link";
import { Check, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { ProductImage } from "@/components/product/product-image";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { productDetailBySlug } from "@/lib/mock/products";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

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

// Orders at/above this qualify for free delivery — surfaced as a highlight.
const FREE_DELIVERY_MIN = 2000;

/**
 * Horizontal "list view" row for the PLP: square thumbnail on the left, details
 * (title, rating, age/badge, highlights, price, add-to-cart) on the right. A flat
 * sibling of ProductCard used when the grid is toggled to list mode.
 */
export function ProductListItem({ product }: { product: Product }) {
  const ageTier = ageTierBySlug(product.ageTierSlug);
  const href = `/products/${product.slug}`;
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  // Store-wide product highlights (+ conditional free delivery). Shown only on
  // desktop, where the row is wide enough to fill the empty middle band.
  const highlights = [
    "Handmade Neem Wood",
    "BPA-Free & Non-Toxic",
    "Smooth Rounded Edges",
    ...(product.price >= FREE_DELIVERY_MIN ? ["Free Delivery"] : []),
  ];

  // Real product description when available, else an on-brand fallback so every
  // row fills the middle band consistently.
  const description =
    productDetailBySlug(product.slug)?.description?.trim() ||
    `A handmade, non-toxic neem-wood toy${
      ageTier ? ` for ${ageTier.labelBn}` : ""
    } — smooth, splinter-free and made for open-ended, screen-free play.`;

  return (
    <div className="group/row relative flex gap-3 rounded-xl border border-cream-300 bg-card p-3 transition-colors duration-300 hover:border-neem-soft sm:gap-5 sm:p-4">
      {/* wishlist — pinned to the card's top-right */}
      <WishlistButton
        slug={product.slug}
        className="absolute right-2.5 top-2.5 z-10"
      />

      {/* thumbnail */}
      <Link
        href={href}
        className="relative aspect-square w-24 flex-none self-start overflow-hidden rounded-lg bg-frame sm:w-40"
      >
        <ProductImage
          slug={product.slug}
          imageNum={1}
          label={product.imageLabelBn}
          fallbackTone={product.imageTones[0]}
          imageUrl={product.imageUrl}
          className="absolute inset-0 transition-transform duration-300 group-hover/row:scale-105"
        />
        {discountPercent ? (
          <div className="pointer-events-none absolute left-0 top-0 z-10 size-[64px] [clip-path:polygon(0_0,100%_0,0_100%)] bg-[linear-gradient(135deg,var(--danger),var(--terracotta))] shadow-[1px_1px_5px_rgba(0,0,0,0.2)]">
            <div className="pl-[6px] pt-[3px] leading-none text-white">
              <div className="text-[13px] font-extrabold tracking-tight">
                {discountPercent}%
              </div>
              <div className="text-[9px] font-bold tracking-[0.12em]">OFF</div>
            </div>
          </div>
        ) : null}
      </Link>

      {/* details — info (flex-1) + a bounded actions column on desktop, so the
          description never runs under the Add-to-Cart button */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        {/* info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={href}
            className="line-clamp-2 pr-10 text-sm font-medium leading-5 text-ink transition-colors duration-300 hover:text-neem-deep sm:text-base sm:leading-6 lg:pr-0"
          >
            {product.titleBn}
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {product.reviewCount > 0 ? (
              <>
                <Stars rating={product.rating} />
                <span className="text-xs text-ink-soft">({product.reviewCount})</span>
              </>
            ) : null}
            {product.badge && !discountPercent ? (
              <Badge className="bg-neem px-2 text-[10px] text-paper">{product.badge}</Badge>
            ) : null}
            {ageTier ? (
              <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                {ageTier.labelBn}
              </span>
            ) : null}
          </div>

          {product.kitContents?.length ? (
            <p className="mt-1.5 line-clamp-1 text-xs text-ink-soft">
              Includes: {product.kitContents.join(" · ")}
            </p>
          ) : null}

          {/* middle band (desktop only): highlights on the left, product
              description filling the space to their right. Bounded by the info
              column, so it stays clear of the actions. Hidden on mobile/tablet. */}
          <div className="mt-3 hidden gap-8 lg:flex">
            <ul className="w-52 shrink-0 space-y-1.5">
              {highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-xs text-ink-muted">
                  <Check className="size-3.5 flex-none text-neem-soft" />
                  <span className="truncate">{h}</span>
                </li>
              ))}
            </ul>
            <p className="line-clamp-3 flex-1 text-sm leading-6 text-ink-muted">
              {description}
            </p>
          </div>
        </div>

        {/* actions — bottom row on mobile/tablet, a right column on desktop */}
        <div className="mt-auto flex items-end justify-between gap-3 lg:mt-0 lg:w-40 lg:flex-none lg:flex-col lg:items-end lg:justify-center lg:gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-base font-bold leading-none text-ink sm:text-lg">
              {formatTk(product.price)}
            </span>
            {product.compareAtPrice ? (
              <span className="text-[11px] text-ink-soft line-through sm:text-xs">
                {formatTk(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
          <AddToCartButton
            slug={product.slug}
            title={product.titleBn}
            className="min-w-0 px-3 text-[0.8rem] min-[480px]:min-w-[130px] lg:w-full"
          />
        </div>
      </div>
    </div>
  );
}
