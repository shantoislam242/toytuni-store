import { createServerSupabase } from "@/lib/supabase/server";
import type { ProductOverride } from "@/lib/data/product-overlay";

/** Row shape for the `products` + `inventory` select below. `inventory` is a
 *  1:1 relation (see `inventory_product_id_fkey`, `isOneToOne: true`), so
 *  PostgREST embeds it as a single object (or null) rather than an array —
 *  but the array shape is also handled defensively below in case the join
 *  shape ever changes.
 *
 *  NOTE: this is supplied via `.overrideTypes()` rather than inferred from
 *  the `.select()` string. The `@supabase/ssr` version pinned in this repo
 *  (0.5.2) ships a `createServerClient` typing built against an older
 *  `SupabaseClient` generic signature than the installed `@supabase/supabase-js`
 *  (2.110.6); the resulting arity mismatch makes automatic `.select()` string
 *  parsing resolve to `never` for every query run through
 *  `createServerSupabase`, not just this join. `.overrideTypes()` is the
 *  library-documented escape hatch for exactly this "inference fails" case. */
type OverrideRow = {
  slug: string;
  price: number;
  compare_at_price: number | null;
  preorder_ship_date: string | null;
  inventory: { stock_qty: number } | { stock_qty: number }[] | null;
};

/** Fetch operational overrides (price / stock / pre-order) for all active
 *  products, keyed by slug. Reads via the RLS-guarded anon client. */
export async function getProductOverrides(): Promise<Map<string, ProductOverride>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("slug, price, compare_at_price, preorder_ship_date, inventory(stock_qty)")
    .eq("active", true)
    .overrideTypes<OverrideRow[], { merge: false }>();
  if (error) throw error;
  const map = new Map<string, ProductOverride>();
  for (const r of data ?? []) {
    const inv = r.inventory;
    const stockQty = Array.isArray(inv) ? (inv[0]?.stock_qty ?? 0) : (inv?.stock_qty ?? 0);
    map.set(r.slug, {
      price: r.price,
      compareAtPrice: r.compare_at_price,
      stockQty,
      preorderShipDate: r.preorder_ship_date,
    });
  }
  return map;
}
