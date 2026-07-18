"use client";

import { createContext, useContext, useMemo } from "react";
import type { Product } from "@/lib/types";

/**
 * Client-side catalogue. Hydrated once, on the server, from the DB (see
 * `catalog-provider.server.tsx`) and handed down as a plain-serialisable prop —
 * so client islands (cart, search, wishlist, …) resolve products from the same
 * source of truth as the server storefront instead of the static mock module.
 *
 * `all` carries EVERY sellable product: the shelf catalogue PLUS gift kits and
 * gift cards, so `bySlug` can resolve a gift slug the cart is holding.
 */
type CatalogContextValue = {
  /** Every sellable product (shelf catalogue + gift kits + gift cards). */
  all: Product[];
  /** Resolve any sellable product by slug (O(1) via a memoised Map). */
  bySlug: (slug: string) => Product | undefined;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({
  catalog,
  children,
}: {
  catalog: Product[];
  children: React.ReactNode;
}) {
  const value = useMemo<CatalogContextValue>(() => {
    const map = new Map(catalog.map((p) => [p.slug, p]));
    return { all: catalog, bySlug: (slug: string) => map.get(slug) };
  }, [catalog]);

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}

/**
 * The client catalogue carries every sellable product, gifts included, so the
 * cart/search/wishlist can resolve gift slugs. Consumers that render only the
 * shelf (age-tier counts, the bulk grid, the recently-viewed fallback) exclude
 * gifts with this predicate. Gifts are the products with no shelf category: the
 * DB nulls their category (→ "") and the mock fallback tags them
 * "gift-kit" / "gift-card".
 */
export function isShelfProduct(p: Product): boolean {
  return (
    p.categorySlug !== "" &&
    p.categorySlug !== "gift-kit" &&
    p.categorySlug !== "gift-card"
  );
}
