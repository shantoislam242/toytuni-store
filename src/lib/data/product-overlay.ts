import type { Product } from "@/lib/types";
import { getProductState, type ProductAvailability } from "@/lib/data/product-state";

export type ProductOverride = {
  price: number;
  compareAtPrice: number | null;
  stockQty: number;
  preorderShipDate: string | null;
  /** Admin-uploaded product photo (Supabase Storage public URL), or null when
   *  the product still relies on the public/images/products/<slug> probing. */
  imageUrl: string | null;
};

export type OverlaidProduct = Product & { availability: ProductAvailability };

/**
 * Merge a DB operational override onto a mock-structured product. The DB is the
 * source of truth for price / compareAtPrice / stock / pre-order; everything
 * else (title, images, category, badge, …) stays from the base. A missing
 * override (product in mock but not the DB — shouldn't happen post-seed) keeps
 * the base price and treats the item as in stock so it never wrongly blocks a
 * sale; createOrder re-checks stock authoritatively anyway.
 */
export function applyOverride(
  base: Product,
  override: ProductOverride | undefined,
  now: Date = new Date(),
): OverlaidProduct {
  if (!override) {
    return { ...base, availability: { state: "in_stock", stockQty: 1 } };
  }
  return {
    ...base,
    price: override.price,
    compareAtPrice: override.compareAtPrice ?? undefined,
    imageUrl: override.imageUrl ?? undefined,
    availability: getProductState({
      stockQty: override.stockQty,
      preorderShipDate: override.preorderShipDate,
      now,
    }),
  };
}
