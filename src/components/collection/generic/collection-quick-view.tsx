"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/product/product-image";
import { ProductFrame } from "@/components/product/product-frame";
import { WishlistButton } from "@/components/product/wishlist-button";
import { shortDescription } from "@/lib/collection-helpers";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rating.toFixed(1)} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < rounded ? "fill-mustard text-mustard" : "fill-cream-300 text-cream-300",
          )}
        />
      ))}
    </div>
  );
}

/** Quick View modal for collection pages. Controlled via `product` (null closes). */
export function CollectionQuickView({
  product,
  badgeLabel,
  onClose,
}: {
  product: Product | null;
  badgeLabel?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, onClose]);

  const badge = product ? (badgeLabel ?? product.badge) : undefined;

  return (
    <AnimatePresence>
      {product ? (
        <motion.div
          key="cqv-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Quick view — ${product.titleBn}`}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative grid max-h-[calc(100dvh-2rem)] w-full max-w-3xl gap-6 overflow-y-auto overscroll-contain rounded-3xl border border-cream-200 bg-paper p-5 shadow-2xl sm:grid-cols-2 sm:p-6"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quick view"
              className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-paper/90 text-ink-soft shadow-sm transition-colors hover:text-ink sm:size-9"
            >
              <X className="size-4" />
            </button>

            <ProductFrame interactive={false} className="rounded-2xl">
              <ProductImage
                slug={product.slug}
                imageNum={1}
                label={product.imageLabelBn}
                fallbackTone={product.imageTones[0]}
                imageUrl={product.imageUrl}
                priority
                className="size-full"
              />
              {badge ? (
                <span className="absolute left-3 top-3 rounded-full bg-neem px-2.5 py-1 text-[11px] font-bold text-paper">
                  {badge}
                </span>
              ) : null}
            </ProductFrame>

            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wide text-neem-deep">
                {ageTierBySlug(product.ageTierSlug)?.labelBn ?? "All ages"}
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink">
                {product.titleBn}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <Stars rating={product.rating} />
                <span className="text-sm text-ink-soft">({product.reviewCount})</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                {shortDescription(product.slug)}
              </p>

              <div className="mt-4 flex items-end gap-2">
                <span className="font-display text-2xl font-bold text-ink">
                  {formatTk(product.price)}
                </span>
                {product.compareAtPrice ? (
                  <span className="pb-1 text-sm text-ink-soft line-through">
                    {formatTk(product.compareAtPrice)}
                  </span>
                ) : null}
              </div>

              <div className="mt-auto space-y-3 pt-5">
                <div className="flex items-center gap-2">
                  <AddToCartButton
                    slug={product.slug}
                    title={product.titleBn}
                    className="h-11 flex-1"
                  />
                  <WishlistButton
                    slug={product.slug}
                    className="size-11 flex-none border border-cream-300 bg-paper"
                  />
                </div>
                <Link
                  href={`/products/${product.slug}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-neem-deep hover:underline"
                >
                  View full details
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
