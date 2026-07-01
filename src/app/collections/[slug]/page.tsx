import type { Metadata } from "next";
import { AllProductsView } from "@/components/collection/all-products-view";
import { AgeCollectionView } from "@/components/collection/age-collection-view";
import { CategoryCollectionView } from "@/components/collection/category-collection-view";
import { StubPage } from "@/components/stub-page";
import { AgeHubView } from "@/components/collection/age-hub-view";
import { CategoryHubView } from "@/components/collection/category-hub-view";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { categoryBySlug } from "@/lib/mock/categories";
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
  if (slug === "by-age") {
    return {
      title: `Shop by Age — ${BRAND_NAME}`,
      description:
        "Browse handmade, non-toxic wooden Montessori toys by your child's age and developmental stage.",
    };
  }
  if (slug === "by-category") {
    return {
      title: `Shop by Category — ${BRAND_NAME}`,
      description:
        "Browse handmade, non-toxic wooden Montessori toys by play type — teethers, stackers, blocks, ride-ons and more.",
    };
  }
  const tier = ageTierBySlug(slug);
  if (tier) {
    return {
      title: `${tier.labelBn} — ${BRAND_NAME}`,
      description: `Handmade, non-toxic wooden toys for ${tier.labelBn}. ${
        tier.taglineBn ?? ""
      }`.trim(),
    };
  }
  const category = categoryBySlug(slug);
  if (category) {
    return {
      title: `${category.nameBn} — ${BRAND_NAME}`,
      description: `Handmade, non-toxic ${category.nameBn} toys. ${
        category.taglineBn ?? ""
      }`.trim(),
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

  if (slug === "by-age") {
    return <AgeHubView />;
  }

  if (slug === "by-category") {
    return <CategoryHubView />;
  }

  const tier = ageTierBySlug(slug);
  if (tier) {
    return <AgeCollectionView tier={tier} />;
  }

  const category = categoryBySlug(slug);
  if (category) {
    return <CategoryCollectionView category={category} />;
  }

  return <StubPage title={`Collection: ${slug}`} />;
}
