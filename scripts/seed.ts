import { createAdminSupabase } from "../src/lib/supabase/admin";
import { products } from "../src/lib/mock/products";
import { categories } from "../src/lib/mock/categories";
import { ageTiers } from "../src/lib/mock/age-tiers";

const db = createAdminSupabase();

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
    const { data: prod, error } = await db.from("products").upsert({
      slug: p.slug, sku: p.sku, title: p.titleBn, price: p.price,
      compare_at_price: p.compareAtPrice ?? null, rating: p.rating,
      review_count: p.reviewCount, age_tier_slug: p.ageTierSlug,
      category_slug: p.categorySlug, badge: p.badge ?? null,
      image_label: p.imageLabelBn, image_tones: p.imageTones,
      description: null, preorder_ship_date: null, active: true,
    }, { onConflict: "slug" }).select("id").single();
    if (error || !prod) throw error ?? new Error(`no id for ${p.slug}`);

    const inv = await db.from("inventory")
      .upsert({ product_id: prod.id, stock_qty: 25, low_stock_threshold: 5 },
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

  // Report counts.
  for (const t of ["categories", "age_tiers", "products", "inventory", "product_variants"]) {
    const { count } = await db.from(t).select("*", { count: "exact", head: true });
    console.log(`${t}: ${count}`);
  }
  console.log("seed complete");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
