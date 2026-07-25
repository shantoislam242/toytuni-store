import type { Metadata } from "next";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { TrustStrip } from "@/components/home/trust-strip";
import { FeaturedProductHero } from "@/components/home/featured-product-hero";
import { ShopByAge } from "@/components/home/shop-by-age";
import { ProductTabs } from "@/components/home/product-tabs";
import { Testimonials } from "@/components/home/testimonials";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { AboutTeaser } from "@/components/home/about-teaser";
import { getAgeTiers, getCategories } from "@/lib/data/taxonomy";
import { getSiteContent } from "@/lib/data/content";

export const metadata: Metadata = {
  // Absolute title: rendered exactly, not wrapped by the "%s | Toytuni" template.
  title: {
    absolute: "Handmade Neem-Wood Toys",
  },
  description:
    "Bangladesh-made, neem-wood, non-toxic, handmade Montessori toys for children",
  alternates: { canonical: "/" },
};

export default async function Home() {
  // DB taxonomy (admin-editable) for the Shop-by-Age + By-Category cards, plus
  // the admin-editable homepage content (hero + about teaser).
  const [ageTiers, categories, content] = await Promise.all([
    getAgeTiers(),
    getCategories(),
    getSiteContent(),
  ]);
  return (
    <>
      {/* Page-level h1 for SEO/accessibility. The hero is image-led (its copy is
          baked into the banners), so the h1 is visually hidden but present in the
          document outline. */}
      <h1 className="sr-only">
        Toytuni — Handmade Neem-Wood Montessori Toys for Ages 0–3
      </h1>
      {/* hero (full-bleed) — admin-editable */}
      <HeroCarousel hero={content.hero} />

      {/* trust strip (full-width) */}
      <TrustStrip />

      {/* featured product spotlight — Traditional Push Wagon */}
      <FeaturedProductHero />

      {/* shop by age — dedicated browse-by-stage section (DB, admin-editable) */}
      <ShopByAge ageTiers={ageTiers} categories={categories} />

      {/* tabbed product module */}
      <ProductTabs />

      {/* testimonials */}
      <Testimonials />

      {/* recently viewed — mock rail (no real browsing history) */}
      <RecentlyViewed />

      {/* about teaser — sits just above the footer (admin-editable) */}
      <AboutTeaser about={content.about} />

      {/* newsletter now lives inside the footer (Keep In Touch column) */}
    </>
  );
}
