import { HeroCarousel } from "@/components/home/hero-carousel";
import { TrustStrip } from "@/components/home/trust-strip";
import { ShopByAge } from "@/components/home/shop-by-age";
import { ProductTabs } from "@/components/home/product-tabs";
import { Testimonials } from "@/components/home/testimonials";

export default function Home() {
  return (
    <>
      {/* hero (full-bleed) */}
      <HeroCarousel />

      {/* trust strip (full-width) */}
      <TrustStrip />

      {/* shop by age — dedicated browse-by-stage section */}
      <ShopByAge />

      {/* tabbed product module */}
      <ProductTabs />

      {/* testimonials */}
      <Testimonials />

      {/* newsletter now lives inside the footer (Keep In Touch column) */}
    </>
  );
}
