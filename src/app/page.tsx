import { HeroCarousel } from "@/components/home/hero-carousel";
import { TrustStrip } from "@/components/home/trust-strip";
import { ProductTabs } from "@/components/home/product-tabs";
import { BrowseTabs } from "@/components/home/browse-tabs";
import { Testimonials } from "@/components/home/testimonials";

export default function Home() {
  return (
    <>
      {/* hero (full-bleed) */}
      <HeroCarousel />

      {/* trust strip (full-width) */}
      <TrustStrip />

      {/* tabbed product module */}
      <ProductTabs />

      {/* tabbed browse module (age / category / bulk) */}
      <div className="bg-cream-50">
        <BrowseTabs />
      </div>

      {/* testimonials */}
      <Testimonials />

      {/* newsletter now lives inside the footer (Keep In Touch column) */}
    </>
  );
}
