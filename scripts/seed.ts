import { createAdminSupabase } from "../src/lib/supabase/admin";
import { products, productDetailBySlug, basicProductDetail } from "../src/lib/mock/products";
import { categories } from "../src/lib/mock/categories";
import { ageTiers } from "../src/lib/mock/age-tiers";
import { giftKits, giftCards } from "../src/lib/mock/gifts";
import type { Product } from "../src/lib/types";
import type { Database, Json } from "../src/lib/supabase/database.types";

const db = createAdminSupabase();

// `detail_content`/`gallery_urls` (migration 0007) predate the generated
// types — cast narrowly at the call site, same pattern as the
// `preorder_delivery_date`/`preorder_advance_pct` casts in admin/actions.ts.
type ProductsInsertExt = Database["public"]["Tables"]["products"]["Insert"] & {
  detail_content?: Json | null;
  gallery_urls?: string[] | null;
};

// Known lookup slugs — used to null out FK columns that don't reference a
// seeded row (gift kits/cards use categories like "gift-kit"/"gift-card" that
// aren't in the categories table, and gift cards have an empty age tier).
const knownCategories = new Set(categories.map((c) => c.slug));
const knownAgeTiers = new Set(ageTiers.map((a) => a.slug));

/** Upsert one product + its inventory (+ variants). `stockQty` lets giftables
 *  seed with effectively unlimited stock so the decrement is harmless. `pdp`
 *  carries resolved PDP content for shelf products only — gift kits/cards
 *  have no hand-written copy and stay null (dynamic fallback). */
async function seedProduct(
  p: Product,
  stockQty: number,
  pdp?: { description: string | null; detailContent: Json; galleryUrls: string[] },
) {
  const insertRow: ProductsInsertExt = {
    slug: p.slug, sku: p.sku ?? p.slug.toUpperCase(), title: p.titleBn, price: p.price,
    compare_at_price: p.compareAtPrice ?? null, rating: p.rating,
    review_count: p.reviewCount,
    age_tier_slug: knownAgeTiers.has(p.ageTierSlug) ? p.ageTierSlug : null,
    category_slug: knownCategories.has(p.categorySlug) ? p.categorySlug : null,
    badge: p.badge ?? null,
    image_label: p.imageLabelBn, image_tones: p.imageTones,
    description: pdp?.description ?? null, preorder_ship_date: null, active: true,
    kit_contents: p.kitContents ?? null,
    detail_content: pdp?.detailContent ?? null,
    gallery_urls: pdp?.galleryUrls ?? null,
  };
  const { data: prod, error } = await db.from("products")
    .upsert(insertRow as unknown as Database["public"]["Tables"]["products"]["Insert"], { onConflict: "slug" })
    .select("id").single();
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
    categories.map((c, i) => ({
      slug: c.slug, title: c.nameBn, sort: i,
      tone: c.tone, tagline: c.taglineBn ?? null,
    })),
    { onConflict: "slug" },
  );
  if (cat.error) throw cat.error;

  const age = await db.from("age_tiers").upsert(
    ageTiers.map((a, i) => ({
      slug: a.slug, title: a.labelBn, sort: i,
      tone: a.tone, tagline: a.taglineBn ?? null,
    })),
    { onConflict: "slug" },
  );
  if (age.error) throw age.error;

  for (const p of products) {
    // Resolved current PDP content (mock copy merged over defaults). Gift
    // kits/cards have no hand-written copy and stay null (dynamic fallback).
    const detail = productDetailBySlug(p.slug) ?? basicProductDetail(p.slug);
    const detailContent = {
      features: detail.features,
      benefits: detail.benefits,
      whyPlay: detail.whyPlay ?? [],
      howPlay: detail.howPlay ?? [],
      returnPolicy: detail.returnPolicy ?? "",
      specs: detail.specs ?? {},
      deliveryEstimate: detail.deliveryEstimate,
      videoUrl: detail.videoUrl ?? null,
    };
    await seedProduct(p, 25, {
      description: detail.description || null,
      detailContent,
      galleryUrls: detail.imageSrcs,
    });
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
