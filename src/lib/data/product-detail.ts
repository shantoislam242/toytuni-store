import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { productDetailBySlug, basicProductDetail } from "@/lib/mock/products";
import type { DetailContent, ProductDetail, Review } from "@/lib/types";

/** Promo countdown is not admin-editable this slice — a fixed default. */
const DEFAULT_SALE_COUNTDOWN = "1D 12H 00M 00S";

type ProductDetailRow = {
  slug: string;
  description: string | null;
  detail_content: DetailContent | null;
  gallery_urls: string[] | null;
  image_url: string | null;
};

/** Pure: build the app `ProductDetail` from a DB row that HAS detail_content.
 *  Gallery precedence: gallery_urls → [image_url] → fallbackImages (mock). */
export function rowToProductDetail(
  row: Omit<ProductDetailRow, "detail_content"> & { detail_content: DetailContent },
  opts: { reviews: Review[]; fallbackImages: string[] },
): ProductDetail {
  const dc = row.detail_content;
  const gallery =
    row.gallery_urls && row.gallery_urls.length > 0
      ? row.gallery_urls
      : row.image_url
        ? [row.image_url]
        : opts.fallbackImages;
  return {
    slug: row.slug,
    description: row.description ?? "",
    features: dc.features ?? [],
    benefits: dc.benefits ?? [],
    imageSrcs: gallery,
    deliveryEstimate: dc.deliveryEstimate ?? "",
    saleCountdown: DEFAULT_SALE_COUNTDOWN,
    whyPlay: dc.whyPlay ?? [],
    howPlay: dc.howPlay ?? [],
    returnPolicy: dc.returnPolicy ?? "",
    specs: dc.specs ?? {},
    reviews: opts.reviews,
    videoUrl: dc.videoUrl ?? undefined,
  };
}

/** Uncached read: DB detail (fail-soft to mock). */
async function readProductDetail(slug: string): Promise<ProductDetail> {
  const mock = productDetailBySlug(slug) ?? basicProductDetail(slug);
  try {
    const supabase = createPublicSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("slug, description, detail_content, gallery_urls, image_url")
      .eq("slug", slug)
      .maybeSingle()
      .overrideTypes<ProductDetailRow, { merge: false }>();
    if (error) throw error;
    if (!data || !data.detail_content) return mock; // unseeded / gift kit → mock
    return rowToProductDetail(
      { ...data, detail_content: data.detail_content },
      { reviews: mock.reviews ?? [], fallbackImages: mock.imageSrcs },
    );
  } catch (err) {
    console.error(`getProductDetail(${slug}) failed; mock fallback:`, err);
    return mock;
  }
}

/** Cached per-slug, tagged `catalog` so an admin save refreshes the PDP. */
export function getProductDetail(slug: string): Promise<ProductDetail> {
  return unstable_cache(() => readProductDetail(slug), ["product-detail", slug], {
    tags: ["catalog"],
    revalidate: 3600,
  })();
}
