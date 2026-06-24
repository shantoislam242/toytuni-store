import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { WishlistButton } from "@/components/product/wishlist-button";
import { PlaceholderImage } from "@/components/placeholder-image";
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
    <div className="group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-cream-300 bg-card transition-shadow hover:shadow-md">
      {/* image (hover-swap) */}
      <Link href={href} className="relative block aspect-square">
        <PlaceholderImage
          tone={product.imageTones[0]}
          label={product.imageLabelBn}
          className="absolute inset-0 size-full transition-opacity duration-300 group-hover/card:opacity-0"
        />
        <PlaceholderImage
          tone={product.imageTones[1]}
          label={product.imageLabelBn}
          className="absolute inset-0 size-full opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        />

        {/* badge — top-left */}
        {product.badge ? (
          <Badge className="absolute left-2.5 top-2.5 bg-neem text-paper">
            {product.badge}
          </Badge>
        ) : null}
        {/* age pill — bottom-left (clear of the wishlist heart) */}
        {ageTier ? (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-paper/90 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
            {ageTier.labelBn}
          </span>
        ) : null}
      </Link>

      {/* wishlist heart — top-right, sibling of the link to keep markup valid */}
      <WishlistButton slug={product.slug} className="absolute right-2 top-2 z-10" />

      {/* body */}
      <div className="flex flex-1 flex-col p-3">
        <Link
          href={href}
          className="line-clamp-2 font-medium text-ink hover:text-neem-deep"
        >
          {product.titleBn}
        </Link>

        <div className="mt-1.5 flex items-center gap-1.5">
          <Stars rating={product.rating} />
          <span className="text-xs text-ink-soft">({product.reviewCount})</span>
        </div>

        {/* variant swatches */}
        {product.variants?.length ? (
          <div className="mt-2 flex items-center gap-1.5">
            {product.variants.map((v) => (
              <span
                key={v.name}
                title={v.name}
                className={cn(
                  "size-4 rounded-full border border-cream-300",
                  swatchBg[v.tone],
                )}
              />
            ))}
          </div>
        ) : null}

        {/* price + cart */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold text-ink">
              {formatTk(product.price)}
            </span>
            {product.compareAtPrice ? (
              <span className="text-xs text-ink-soft line-through">
                {formatTk(product.compareAtPrice)}
              </span>
            ) : null}
          </div>
          <AddToCartButton slug={product.slug} title={product.titleBn} />
        </div>
      </div>
    </div>
  );
}
