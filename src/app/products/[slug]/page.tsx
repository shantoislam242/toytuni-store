import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailsView } from "@/components/product/product-details-view";
import { BRAND_NAME } from "@/lib/config";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { categoryBySlug } from "@/lib/mock/categories";
import { productBySlug, productDetailBySlug, products } from "@/lib/mock/products";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return products.map((product) => ({
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
  const product = productBySlug(slug);
  const detail = productDetailBySlug(slug);

  if (!product || !detail) {
    notFound();
  }

  return (
    <ProductDetailsView
      product={product}
      detail={detail}
      ageTier={ageTierBySlug(product.ageTierSlug)}
      category={categoryBySlug(product.categorySlug)}
    />
  );
}
