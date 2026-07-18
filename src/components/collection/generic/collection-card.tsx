"use client";

import Link from "next/link";
import { Eye, Star } from "lucide-react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/product/product-image";
import { WishlistButton } from "@/components/product/wishlist-button";
import { shortDescription, isInStock } from "@/lib/collection-helpers";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { categoryBySlug } from "@/lib/mock/categories";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

function Stars({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1" aria-label={`Rated ${rating.toFixed(1)} of 5`}>
      <div className="flex items-center gap-0.5">
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
      <span className="text-xs text-ink-soft">({count})</span>
    </div>
  );
}

/**
 * Reusable premium product card for collection pages. Image with hover zoom
 * (two-image swap), wishlist, a collection badge (+ discount), category, name,
 * short description, age, rating + review count, price + previous price, stock
 * status, Quick View, and Add to Cart. Hover lift via CSS.
 */
export function CollectionCard({
  product,
  onQuickView,
  badgeLabel,
}: {
  product: Product;
  onQuickView: (product: Product) => void;
  /** Collection-level badge (e.g. "Best Seller"); falls back to the product's
   *  own badge when omitted. */
  badgeLabel?: string;
}) {
  const href = `/products/${product.slug}`;
  const ageTier = ageTierBySlug(product.ageTierSlug);
  const category = categoryBySlug(product.categorySlug);
  const inStock = isInStock(product.slug);
  const shownBadge = badgeLabel ?? product.badge;
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-cream-200 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-frame">
        <Link href={href} className="absolute inset-0 block">
          <ProductImage
            slug={product.slug}
            imageNum={1}
            label={product.imageLabelBn}
            fallbackTone={product.imageTones[0]}
            imageUrl={product.imageUrl}
            className="absolute inset-0 transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-0"
          />
          <ProductImage
            slug={product.slug}
            imageNum={2}
            label={product.imageLabelBn}
            fallbackTone={product.imageTones[1]}
            imageUrl={product.imageUrl}
            className="absolute inset-0 opacity-0 transition-all duration-500 ease-out group-hover:scale-105 group-hover:opacity-100"
          />
        </Link>

        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {shownBadge ? (
            <span className="rounded-full bg-neem px-2.5 py-1 text-[11px] font-bold text-paper shadow-sm">
              {shownBadge}
            </span>
          ) : null}
          {discount > 0 ? (
            <span className="rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-paper shadow-sm">
              -{discount}%
            </span>
          ) : null}
        </div>

        <WishlistButton
          slug={product.slug}
          className="absolute right-2.5 top-2.5 border border-cream-200 bg-paper/90"
        />

        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-1.5 rounded-full bg-paper/95 py-2 text-sm font-semibold text-ink opacity-0 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-paper group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Eye className="size-4" />
          Quick View
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          {category ? (
            <span className="truncate text-xs font-medium uppercase tracking-wide text-neem-deep">
              {category.nameBn}
            </span>
          ) : (
            <span />
          )}
          {ageTier ? (
            <span className="flex-none text-xs font-medium text-ink-soft">
              {ageTier.labelBn}
            </span>
          ) : null}
        </div>

        <Link
          href={href}
          className="mt-1 line-clamp-1 font-display text-base font-bold text-ink transition-colors hover:text-neem-deep"
        >
          {product.titleBn}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
          {shortDescription(product.slug)}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <Stars rating={product.rating} count={product.reviewCount} />
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              inStock ? "text-neem-deep" : "text-danger",
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", inStock ? "bg-neem" : "bg-danger")}
              aria-hidden
            />
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        {/* Price on its own line, then a full-width Add to Cart button — cards
            stay narrow even in the desktop 4-column grid, so a full-width button
            never overflows the way a side-by-side one does. */}
        <div className="mt-auto pt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold text-ink">
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
            className="mt-2.5 h-9 w-full min-w-0 px-2 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
