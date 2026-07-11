"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { ProductImage } from "@/components/product/product-image";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
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

/**
 * Horizontal "list view" row for the PLP: square thumbnail on the left, details
 * (title, rating, age/badge, price, add-to-cart) on the right. A flat sibling of
 * ProductCard used when the grid is toggled to list mode.
 */
export function ProductListItem({ product }: { product: Product }) {
  const ageTier = ageTierBySlug(product.ageTierSlug);
  const href = `/products/${product.slug}`;
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0;

  return (
    <div className="group/row relative flex gap-3 rounded-xl border border-cream-300 bg-card p-3 transition-colors duration-300 hover:border-neem-soft sm:gap-5 sm:p-4">
      {/* thumbnail */}
      <Link
        href={href}
        className="relative aspect-square w-24 flex-none overflow-hidden rounded-lg bg-frame sm:w-40"
      >
        <ProductImage
          slug={product.slug}
          imageNum={1}
          label={product.imageLabelBn}
          fallbackTone={product.imageTones[0]}
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

      {/* details */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={href}
            className="line-clamp-2 text-sm font-medium leading-5 text-ink transition-colors duration-300 hover:text-neem-deep sm:text-base sm:leading-6"
          >
            {product.titleBn}
          </Link>
          <WishlistButton slug={product.slug} className="flex-none" />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Stars rating={product.rating} />
          <span className="text-xs text-ink-soft">({product.reviewCount})</span>
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

        {/* price + cart pinned to the bottom */}
        <div className="mt-auto flex flex-col gap-2 pt-3 min-[480px]:flex-row min-[480px]:items-end min-[480px]:justify-between">
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
            className="min-w-0 px-3 text-[0.8rem] min-[480px]:min-w-[130px]"
          />
        </div>
      </div>
    </div>
  );
}
