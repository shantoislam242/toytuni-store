import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailsView } from "@/components/product/product-details-view";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { RecentlyViewedTracker } from "@/components/product/recently-viewed-tracker";
import { BRAND_NAME } from "@/lib/config";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { categoryBySlug } from "@/lib/mock/categories";
import { productBySlug, productDetailBySlug, products, relatedProducts } from "@/lib/mock/products";
import { GiftCardDetailsView } from "@/components/gift/gift-card-details-view";
import { giftKits, giftCards } from "@/lib/mock/gifts";

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
  const product = productBySlug(slug);

  if (!product) {
    return {
      title: `Product not found | ${BRAND_NAME}`,
    };
  }

  return {
    title: `${product.titleBn} | ${BRAND_NAME}`,
    description: productDetailBySlug(slug)?.description,
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

  const product = productBySlug(slug);
  const detail = productDetailBySlug(slug);

  if (!product || !detail) {
    notFound();
  }

  return (
    <>
      {/* record this product in the browser's recently-viewed history */}
      <RecentlyViewedTracker slug={product.slug} />
      <ProductDetailsView
        product={product}
        detail={detail}
        ageTier={ageTierBySlug(product.ageTierSlug)}
        category={categoryBySlug(product.categorySlug)}
        related={relatedProducts(product.slug)}
      />
      <div className="bg-paper">
        <RecentlyViewed excludeSlug={product.slug} />
      </div>
    </>
  );
}
