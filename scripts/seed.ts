import { createAdminSupabase } from "../src/lib/supabase/admin";
import { products } from "../src/lib/mock/products";
import { categories } from "../src/lib/mock/categories";
import { ageTiers } from "../src/lib/mock/age-tiers";
import { giftKits, giftCards } from "../src/lib/mock/gifts";
import type { Product } from "../src/lib/types";

const db = createAdminSupabase();

// Known lookup slugs — used to null out FK columns that don't reference a
// seeded row (gift kits/cards use categories like "gift-kit"/"gift-card" that
// aren't in the categories table, and gift cards have an empty age tier).
const knownCategories = new Set(categories.map((c) => c.slug));
const knownAgeTiers = new Set(ageTiers.map((a) => a.slug));

/** Upsert one product + its inventory (+ variants). `stockQty` lets giftables
 *  seed with effectively unlimited stock so the decrement is harmless. */
async function seedProduct(p: Product, stockQty: number) {
  const { data: prod, error } = await db.from("products").upsert({
    slug: p.slug, sku: p.sku ?? p.slug.toUpperCase(), title: p.titleBn, price: p.price,
    compare_at_price: p.compareAtPrice ?? null, rating: p.rating,
    review_count: p.reviewCount,
    age_tier_slug: knownAgeTiers.has(p.ageTierSlug) ? p.ageTierSlug : null,
    category_slug: knownCategories.has(p.categorySlug) ? p.categorySlug : null,
    badge: p.badge ?? null,
    image_label: p.imageLabelBn, image_tones: p.imageTones,
    description: null, preorder_ship_date: null, active: true,
  }, { onConflict: "slug" }).select("id").single();
  if (error || !prod) throw error ?? new Error(`no id for ${p.slug}`);

  const inv = await db.from("inventory")
    .upsert({ product_id: prod.id, stock_qty: stockQty, low_stock_threshold: 5 },
      { onConflict: "product_id" });
  if (inv.error) throw inv.error;

  if (p.variants?.length) {
    // Replace variants for a clean re-seed.
    const del = await db.from("product_variants").delete().eq("product_id", prod.id);
    if (del.error) throw del.error;
    const v = await db.from("product_variants").insert(
      p.variants.map((vr) => ({ product_id: prod.id, name: vr.name, tone: vr.tone })),
    );
    if (v.error) throw v.error;
  }
}

async function main() {
  // Lookup tables first (products FK-reference them).
  const cat = await db.from("categories").upsert(
    categories.map((c, i) => ({ slug: c.slug, title: c.nameBn, sort: i })),
    { onConflict: "slug" },
  );
  if (cat.error) throw cat.error;

  const age = await db.from("age_tiers").upsert(
    ageTiers.map((a, i) => ({ slug: a.slug, title: a.labelBn, sort: i })),
    { onConflict: "slug" },
  );
  if (age.error) throw age.error;

  for (const p of products) {
    await seedProduct(p, 25);
  }

  // Gift kits + gift cards are cart-addable products that live only in mock.
  // Seed them as normal products (with huge stock) so checkout can resolve
  // them and createOrder works for gift/mixed carts.
  for (const p of [...giftKits, ...giftCards]) {
    await seedProduct(p, 9999);
  }

  // Report counts.
  for (const t of ["categories", "age_tiers", "products", "inventory", "product_variants"]) {
    const { count } = await db.from(t).select("*", { count: "exact", head: true });
    console.log(`${t}: ${count}`);
  }
  console.log("seed complete");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
