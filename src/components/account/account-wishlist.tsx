"use client";

import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { useWishlist } from "@/lib/wishlist/wishlist-context";
import { useCatalog } from "@/lib/catalog/catalog-context";

/**
 * The `/account/wishlist` view — the same saved products as the top-level
 * `/wishlist`, rendered inside the account shell. Reads the shared wishlist
 * context (per-user + DB-synced for signed-in users) and resolves slugs to
 * products via the catalog context.
 */
export function AccountWishlist() {
  const { slugs, hydrated, clear } = useWishlist();
  const { bySlug } = useCatalog();

  const items = hydrated
    ? slugs.flatMap((slug) => {
        const product = bySlug(slug);
        return product ? [product] : [];
      })
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Saved</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold text-ink sm:text-3xl">Wishlist</h1>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-danger hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {/* Before hydration, render an empty spacer to avoid an empty-state flash. */}
      {!hydrated ? (
        <div className="mt-6 min-h-[30vh]" />
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-terracotta">
            <Heart className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-ink-muted">Tap the heart on any toy to save it here for later.</p>
          <Link
            href="/collections/all"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-neem px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep"
          >
            Browse toys <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-muted">
            {items.length} {items.length === 1 ? "toy" : "toys"} saved
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {items.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
