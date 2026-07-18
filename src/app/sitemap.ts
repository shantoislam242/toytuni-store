import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { products } from "@/lib/mock/products";
import { giftKits, giftCards } from "@/lib/mock/gifts";
import { blogPosts } from "@/lib/mock/blog";
import { getAgeTiers, getCategories } from "@/lib/data/taxonomy";

/**
 * XML sitemap covering every indexable route: content pages, all collection /
 * category / age listings, every product + gift, blog posts, and policy pages.
 * Utility/account/dev routes are intentionally excluded (also disallowed in
 * robots). The `refund` policy alias is omitted (it duplicates `returns`).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const at = (path: string) => `${SITE_URL}${path}`;
  const [ageTiers, categories] = await Promise.all([
    getAgeTiers(),
    getCategories(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: at("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: at("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: at("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: at("/faqs"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: at("/gift"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: at("/loyalty"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: at("/bulk"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: at("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const collectionSlugs = [
    "all",
    "by-age",
    "by-category",
    "new-arrivals",
    "deals",
    "best-sellers",
    "neem-wood",
    ...ageTiers.map((t) => t.slug),
    ...categories.map((c) => c.slug),
  ];
  const collectionPages: MetadataRoute.Sitemap = collectionSlugs.map((slug) => ({
    url: at(`/collections/${slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = [...products, ...giftKits, ...giftCards].map(
    (p) => ({
      url: at(`/products/${p.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: at(`/blog/${post.slug}`),
    lastModified: new Date(post.dateISO),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const policySlugs = [
    "returns",
    "privacy",
    "terms",
    "warranty",
    "cookies",
    "bulk-orders",
    "shipping",
    "safety-standards",
    "sustainability",
  ];
  const policyPages: MetadataRoute.Sitemap = policySlugs.map((slug) => ({
    url: at(`/policy/${slug}`),
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [
    ...staticPages,
    ...collectionPages,
    ...productPages,
    ...blogPages,
    ...policyPages,
  ];
}
