"use client";

import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { useWishlist } from "@/lib/wishlist/wishlist-context";
import { productBySlug } from "@/lib/mock/products";

export function WishlistView() {
  const { slugs, hydrated, clear } = useWishlist();

  // Avoid an empty-state flash before storage is read.
  if (!hydrated) {
    return <main className="mx-auto min-h-[40vh] w-full max-w-6xl flex-1 px-4 py-10" />;
  }

  const items = slugs.flatMap((slug) => {
    const product = productBySlug(slug);
    return product ? [product] : [];
  });

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-cream-300 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-terracotta">
            <Heart className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            Your wishlist is empty
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Tap the heart on any toy to save it here for later.
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

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:py-10 lg:max-w-[90rem] lg:px-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Your Wishlist
          </h1>
          <p className="mt-2 text-ink-muted">
            {items.length} {items.length === 1 ? "toy" : "toys"} saved
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-danger hover:underline"
        >
          Clear all
        </button>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </main>
  );
}
