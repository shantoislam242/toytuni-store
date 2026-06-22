import type { Metadata } from "next";
import { AllProductsView } from "@/components/collection/all-products-view";
import { StubPage } from "@/components/stub-page";
import { BRAND_NAME } from "@/lib/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "all") {
    return {
      title: `All Products — ${BRAND_NAME}`,
      description: "Browse every handmade, non-toxic wooden toy in our store.",
    };
  }
  return { title: `Collection: ${slug} — ${BRAND_NAME}` };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (slug === "all") {
    return <AllProductsView />;
  }

  return <StubPage title={`Collection: ${slug}`} />;
}
