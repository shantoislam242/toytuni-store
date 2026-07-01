"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { heroSlides } from "@/lib/mock/hero";
import { cn } from "@/lib/utils";

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  // autoplay: advance every 3s, keep going after manual interaction.
  // useState initializer creates the plugin once (stable, no ref access during render).
  const [autoplay] = useState(() =>
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  // Tablet/desktop (>=768px): the hero fills the first viewport — height =
  // window height minus the (non-collapsed) header — so the whole banner + CTA
  // are visible without scrolling. Mobile (<768px): we keep heroHeight null and
  // fall back to the compact CSS height below, so the hero doesn't swallow the
  // whole phone screen and the next section peeks through. Re-measured on
  // resize/orientation change.
  const [heroHeight, setHeroHeight] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      if (window.innerWidth < 768) {
        setHeroHeight(null);
        return;
      }
      const headerH =
        document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      setHeroHeight(Math.max(280, window.innerHeight - headerH));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <div className="relative">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
        plugins={[autoplay]}
      >
        <CarouselContent>
          {heroSlides.map((s, i) => (
            <CarouselItem key={s.id}>
              {/* image-only slide (no overlay text — the banners carry their
                  own copy). Mobile uses the compact CSS height (h-[400px]) so
                  the hero doesn't fill the whole phone screen; tablet/desktop
                  get the runtime `heroHeight` (viewport − header) so the banner
                  + CTA fill the first screen without scrolling. The md/lg CSS
                  heights are only the pre-measure fallback. The image fills via
                  object-cover (cropping as needed) and slowly zooms (Ken Burns);
                  overflow-hidden clips the zoom. */}
              <motion.div
                className="relative block h-[280px] w-full overflow-hidden sm:h-[360px] md:h-[420px] lg:h-[460px]"
                style={heroHeight ? { height: heroHeight } : undefined}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <Image
                  src={s.image}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="animate-kenburns object-cover"
                />
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 hidden border-none bg-paper/80 sm:flex" />
        <CarouselNext className="right-4 hidden border-none bg-paper/80 sm:flex" />
      </Carousel>

      {/* Shop Now CTA — anchored near the bottom-right of the hero (a little up
          from the edge, clear of the dots), gently fades + slides up on mount
          (Framer Motion). The overlay is click-through (pointer-events-none) so
          carousel swipe/arrows still work; only the pill is interactive. Points
          at the current slide's target. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-end pb-14 pr-6 sm:pb-16 sm:pr-16 lg:pr-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          className="pointer-events-auto"
        >
          <motion.div
            className="relative"
            animate={{ y: [0, -4, 0], rotate: [0, 0.2, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
            whileHover={{ scale: 1.05, y: -5, boxShadow: "0 20px 45px rgba(83, 117, 57, 0.26)" }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-x-3 -bottom-2 h-3 rounded-full bg-neem/25 blur-xl" />
            <Link
              href={heroSlides[selected]?.href ?? "/collections/all"}
              className="group relative inline-flex items-center overflow-hidden rounded-full border border-white/20 bg-[linear-gradient(135deg,#8fb466_0%,#5f7e3d_100%)] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-paper shadow-[0_14px_34px_rgba(83,117,57,0.24)] transition-all duration-300 ease-out hover:bg-[linear-gradient(135deg,#9cc56f_0%,#6d8f45_100%)] sm:px-8 sm:py-4 sm:text-sm"
            >
              <motion.span
                className="absolute inset-0 rounded-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.35)_45%,transparent_100%)]"
                animate={{ x: ["-140%", "140%"] }}
                transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2.4, ease: "linear" }}
              />
              <span className="relative z-10 inline-flex items-center gap-2">
                Shop Now
                <motion.span
                  className="inline-flex"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <ArrowRight className="size-4" />
                </motion.span>
              </span>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* dots — overlaid at the bottom of the banner */}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === selected ? "w-6 bg-neem" : "w-2 bg-paper/70 hover:bg-paper",
            )}
          />
        ))}
      </div>
    </div>
  );
}
