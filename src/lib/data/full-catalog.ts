import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import type { Product, Tone } from "@/lib/types";
import { products as mockProducts } from "@/lib/mock/products";
import { giftKits, giftCards } from "@/lib/mock/gifts";
import { getProductState } from "@/lib/data/product-state";
import type { OverlaidProduct } from "@/lib/data/product-overlay";

/** Row shape for the full-catalog `products` select below (see 0005_catalog_fields.sql
 *  for `kit_contents`). `inventory` and `product_variants` are joined relations —
 *  `inventory` is 1:1 (object or null; array defensively also handled by callers
 *  that read stock), `product_variants` is 1:many.
 *
 *  Supplied via `.overrideTypes()` rather than inferred from the `.select()`
 *  string — see the note in `src/lib/data/products.ts` for why automatic
 *  `.select()` parsing resolves to `never` under this repo's pinned
 *  `@supabase/ssr` version. */
export type FullProductRow = {
  slug: string;
  sku: string;
  title: string;
  price: number;
  compare_at_price: number | null;
  rating: number;
  review_count: number;
  age_tier_slug: string | null;
  category_slug: string | null;
  badge: "New" | "Best Seller" | "Limited" | null;
  description?: string | null;
  image_label: string;
  image_tones: string[];
  image_url: string | null;
  kit_contents: string[] | null;
  preorder_ship_date: string | null;
  inventory?: { stock_qty: number } | { stock_qty: number }[] | null;
  product_variants?: { name: string; tone: string }[];
};

/** Read the 1:1 `inventory` embed defensively (object, array, or null). */
function readStock(inv: FullProductRow["inventory"]): number {
  return Array.isArray(inv) ? (inv[0]?.stock_qty ?? 0) : (inv?.stock_qty ?? 0);
}

/**
 * Map a joined DB `products` row to the app `Product` shape. Pure — no I/O.
 * `inventory`/stock is read by callers that need availability; this mapper
 * only produces the catalog-structure fields that `Product` carries.
 */
export function rowToFullProduct(row: FullProductRow): Product {
  const variants =
    row.product_variants && row.product_variants.length > 0
      ? row.product_variants.map((v) => ({ name: v.name, tone: v.tone as Tone }))
      : undefined;

  return {
    slug: row.slug,
    sku: row.sku,
    titleBn: row.title,
    price: row.price,
    compareAtPrice: row.compare_at_price ?? undefined,
    rating: row.rating,
    reviewCount: row.review_count,
    ageTierSlug: row.age_tier_slug ?? "",
    categorySlug: row.category_slug ?? "",
    badge: row.badge ?? undefined,
    description: row.description ?? undefined,
    imageTones: row.image_tones as [Tone, Tone],
    imageLabelBn: row.image_label,
    imageUrl: row.image_url ?? undefined,
    kitContents: row.kit_contents ?? undefined,
    variants,
  };
}

/**
 * Full product catalog, read from the DB (source of truth for catalog
 * structure — title, price, category/age-tier, badge, variants, gift-kit
 * contents, …). Only `active` products are returned.
 *
 * Each product carries a computed `availability` (from its stock + optional
 * pre-order ship date), so the storefront no longer needs the separate Phase-1
 * price/stock overlay — the full row already is the source of truth.
 *
 * Fail-soft: any DB error (including a query against a column that doesn't
 * exist yet, e.g. `kit_contents` before migration 0005 is applied) is caught
 * and logged, and the mock catalog is returned instead so the storefront
 * never 500s on a Supabase blip or a pending migration. Mock fallback products
 * read as in stock so they never wrongly block a sale (createOrder re-checks
 * stock authoritatively).
 */
/**
 * Uncached read of the full catalog from the DB via the cookie-less public
 * client. Public/user-independent, so it never reads `cookies()` — that keeps
 * callers (and the root layout that mounts the catalog provider) prerenderable.
 * Wrapped by {@link getFullCatalog} in a persistent, tagged cache.
 */
async function readFullCatalog(): Promise<OverlaidProduct[]> {
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("products")
      .select(
        "slug, sku, title, price, compare_at_price, rating, review_count, age_tier_slug, category_slug, badge, description, image_label, image_tones, image_url, kit_contents, preorder_ship_date, inventory(stock_qty), product_variants(name, tone)",
      )
      .eq("active", true)
      .order("created_at", { ascending: true })
      .overrideTypes<FullProductRow[], { merge: false }>();
    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...rowToFullProduct(row),
      availability: getProductState({
        stockQty: readStock(row.inventory),
        preorderShipDate: row.preorder_ship_date,
      }),
    }));
  } catch (err) {
    console.error("getFullCatalog failed; falling back to mock catalog:", err);
    return [...mockProducts, ...giftKits, ...giftCards].map((p) => ({
      ...p,
      availability: { state: "in_stock", stockQty: 1 },
    }));
  }
}

/**
 * Cached, tag-invalidatable full catalog. `unstable_cache` persists the read
 * across requests and includes it in the static shell, so the storefront
 * renders statically/ISR instead of forcing every route dynamic. Tagged
 * `"catalog"` — an admin create/edit/soft-delete calls `revalidateTag("catalog")`
 * (see `src/lib/admin/actions.ts`) to refresh it on demand; a 1-hour
 * `revalidate` bounds staleness if a tag revalidation is ever missed.
 */
export const getFullCatalog = unstable_cache(readFullCatalog, ["full-catalog"], {
  tags: ["catalog"],
  revalidate: 3600,
});
