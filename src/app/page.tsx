import { HeroCarousel } from "@/components/home/hero-carousel";
import { TrustStrip } from "@/components/home/trust-strip";

export default function Home() {
  return (
    <>
      {/* hero (full-bleed) */}
      <HeroCarousel />

      {/* trust strip (full-width) */}
      <TrustStrip />

      {/* later steps: product module, browse module, testimonials, newsletter */}
      <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">
          More sections coming in the next steps…
        </p>
      </div>
    </>
  );
}
