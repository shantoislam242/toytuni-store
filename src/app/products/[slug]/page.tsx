import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailsView } from "@/components/product/product-details-view";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed-tracker";
import { BRAND_NAME, SITE_URL } from "@/lib/config";
import { JsonLd } from "@/components/seo/json-ld";
import { productImagePath } from "@/lib/product-og";
import { getAgeTiers, getCategories } from "@/lib/data/taxonomy";
import { productDetailBySlug, basicProductDetail, products } from "@/lib/mock/products";
import { GiftCardDetailsView } from "@/components/gift/gift-card-details-view";
import { giftKits, giftCards } from "@/lib/mock/gifts";
import { getCatalogProduct, getRelated } from "@/lib/data/catalog";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return [...products, ...giftKits, ...giftCards].map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  const description =
    productDetailBySlug(slug)?.description ??
    `${product.titleBn} — handmade, non-toxic neem-wood Montessori toy from ${BRAND_NAME}.`;
  const img = productImagePath(slug);

  return {
    title: product.titleBn,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      url: `/products/${slug}`,
      title: product.titleBn,
      description,
      // Fall back to the branded default so every share has a valid image.
      images: [{ url: img ?? "/og-default.png", alt: product.titleBn }],
    },
  };
}

export default async function Page({
  params,
}: Props) {
  const { slug } = await params;

  // Gift cards get their own dedicated details page (no notFound).
  const giftCard = giftCards.find((c) => c.slug === slug);
  if (giftCard) {
    return <GiftCardDetailsView amount={giftCard.price} />;
  }

  const product = await getCatalogProduct(slug);
  if (!product) {
    notFound();
  }

  // Mock products carry rich hand-written copy; a DB-only product (e.g. one an
  // admin just created) has none, so fall back to a basic detail built from its
  // own DB fields — this is what lets a brand-new catalog product render a real
  // PDP instead of 404-ing.
  const detail = productDetailBySlug(slug) ?? basicProductDetail(slug, product.description);

  const [categories, ageTiers] = await Promise.all([
    getCategories(),
    getAgeTiers(),
  ]);
  const category = categories.find((c) => c.slug === product.categorySlug);
  const ageTier = ageTiers.find((t) => t.slug === product.ageTierSlug);
  const img = productImagePath(product.slug);
  const availabilitySchema =
    product.availability.state === "preorder"
      ? "https://schema.org/PreOrder"
      : product.availability.state === "sold_out"
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock";
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.titleBn,
    description: detail.description,
    image: [`${SITE_URL}${img ?? "/og-default.png"}`],
    sku: product.sku,
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "BDT",
      availability: availabilitySchema,
      url: `${SITE_URL}/products/${product.slug}`,
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/collections/all` },
      ...(category
        ? [{ "@type": "ListItem", position: 3, name: category.nameBn, item: `${SITE_URL}${category.href}` }]
        : []),
      {
        "@type": "ListItem",
        position: category ? 4 : 3,
        name: product.titleBn,
        item: `${SITE_URL}/products/${product.slug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[productLd, breadcrumbLd]} />
      {/* record this product in the browser's recently-viewed history */}
      <RecentlyViewedTracker slug={product.slug} />
      <ProductDetailsView
        product={product}
        detail={detail}
        ageTier={ageTier}
        category={category}
        related={await getRelated(product.slug)}
      />
      <div className="bg-paper">
        <RecentlyViewed excludeSlug={product.slug} />
      </div>
    </>
  );
}
