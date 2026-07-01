"use client";

import Link from "next/link";
import { motion, type Transition } from "framer-motion";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { ProductImage } from "@/components/product/product-image";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product, Tone } from "@/lib/types";

// Solid swatch backgrounds (static so Tailwind keeps them).
const swatchBg: Record<Tone, string> = {
  cream: "bg-cream-300",
  neem: "bg-neem",
  "neem-soft": "bg-neem-soft",
  wood: "bg-wood-deep",
  terracotta: "bg-terracotta",
  mustard: "bg-mustard",
  "dusty-blue": "bg-dusty-blue",
  blush: "bg-blush",
};

const cardHoverTransition: Transition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] };
const cardVariants = {
  rest: { y: 0, scale: 1, zIndex: 0 },
  hover: { y: -8, scale: 1.03, zIndex: 20 },
};

const imageVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.08 },
};

const actionVariants = {
  rest: { opacity: 0.96, y: 8 },
  hover: { opacity: 1, y: 0 },
};

const wishlistVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
};

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating ${rating.toFixed(1)}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < rounded
              ? "fill-mustard text-mustard"
              : "fill-cream-300 text-cream-300",
          )}
        />
      ))}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const ageTier = ageTierBySlug(product.ageTierSlug);
  const href = `/products/${product.slug}`;

  return (
    <motion.div
      className="group/card isolate relative z-0 h-full overflow-visible p-0.5 sm:p-1.5"
      variants={cardVariants}
      initial="rest"
      whileHover="hover"
      animate="rest"
      transition={cardHoverTransition}
      style={{ willChange: "transform" }}
    >
      <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-cream-300 bg-card transition-all duration-300">
        {/* image (hover-swap) */}
        <Link href={href} className="relative block aspect-[4/3] overflow-hidden rounded-t-xl bg-cream-100 sm:aspect-square">
          <motion.div
            className="absolute inset-0"
            variants={imageVariants}
            initial="rest"
            whileHover="hover"
            transition={cardHoverTransition}
          >
            {/* Primary image */}
            <ProductImage
              slug={product.slug}
              imageNum={1}
              label={product.imageLabelBn}
              fallbackTone={product.imageTones[0]}
              className="absolute inset-0 size-full p-2 transition-opacity duration-300 group-hover/card:opacity-0 sm:p-3"
            />
            {/* Hover image */}
            <ProductImage
              slug={product.slug}
              imageNum={2}
              label={product.imageLabelBn}
              fallbackTone={product.imageTones[1]}
              className="absolute inset-0 size-full p-2 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 sm:p-3"
            />
          </motion.div>

        {/* badge — top-left */}
        {product.badge ? (
          <Badge className="absolute left-2 top-2 max-w-[calc(100%-3.5rem)] truncate bg-neem px-2 text-[10px] text-paper sm:left-2.5 sm:top-2.5 sm:text-xs">
            {product.badge}
          </Badge>
        ) : null}
        {/* age pill — bottom-left (clear of the wishlist heart) */}
        {ageTier ? (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-medium text-ink-muted sm:bottom-2.5 sm:left-2.5 sm:text-[11px]">
            {ageTier.labelBn}
          </span>
        ) : null}
      </Link>

      {/* wishlist heart — top-right, sibling of the link to keep markup valid */}
      <motion.div
        className="absolute right-1.5 top-1.5 z-10 sm:right-2 sm:top-2"
        variants={wishlistVariants}
        transition={cardHoverTransition}
      >
        <WishlistButton slug={product.slug} className="transition-transform duration-300" />
      </motion.div>

      {/* body */}
      <div className="flex flex-1 min-w-0 flex-col px-2.5 pb-3 pt-2.5 sm:px-3 sm:pb-4 sm:pt-3">
        <Link
          href={href}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-ink transition-colors duration-300 hover:text-neem-deep sm:min-h-0 sm:text-base sm:leading-6"
        >
          {product.titleBn}
        </Link>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-xs text-ink-soft">({product.reviewCount})</span>
        </div>

        {/* gift-kit "what's inside" — only rendered for products that have it */}
        {product.kitContents?.length ? (
          <p className="mt-1.5 line-clamp-1 text-xs text-ink-soft">
            Includes: {product.kitContents.join(" · ")}
          </p>
        ) : null}

        {/* variant swatches */}
        {product.variants?.length ? (
          <div className="mt-2 flex min-w-0 items-center gap-1.5">
            {product.variants.map((v) => (
              <span
                key={v.name}
                title={v.name}
                className={cn(
                  "size-4 rounded-full border border-cream-300 transition-shadow duration-300",
                  swatchBg[v.tone],
                )}
              />
            ))}
          </div>
        ) : null}

        {/* price + cart */}
        <motion.div
          className="mt-auto flex flex-col items-stretch gap-2 pb-0.5 pt-3 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between min-[420px]:gap-3 sm:pt-4"
          variants={actionVariants}
          transition={cardHoverTransition}
        >
          <div className="flex min-w-0 flex-row items-baseline gap-1.5 min-[420px]:flex-col min-[420px]:items-start min-[420px]:gap-0">
            <span className="font-display text-base font-bold leading-none text-ink sm:text-lg">
              {formatTk(product.price)}
            </span>
            {product.compareAtPrice ? (
              <span className="text-[11px] text-ink-soft line-through sm:text-xs">
                {formatTk(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
          <motion.div
            variants={actionVariants}
            transition={cardHoverTransition}
            className="w-full flex-shrink-0 transition-all duration-300 min-[420px]:ml-auto min-[420px]:w-auto"
          >
            <AddToCartButton
              slug={product.slug}
              title={product.titleBn}
              className="w-full min-w-0 px-2 text-[0.76rem] min-[420px]:min-w-[108px] sm:min-w-[118px] sm:px-3 sm:text-[0.8rem]"
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
    </motion.div>
  );
}
