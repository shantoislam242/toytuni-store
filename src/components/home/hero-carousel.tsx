"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { heroSlides } from "@/lib/mock/hero";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

const toneClass: Record<Tone, string> = {
  cream: "bg-cream-200 text-ink",
  neem: "bg-neem text-paper",
  "neem-soft": "bg-neem-soft text-ink",
  wood: "bg-wood-light text-ink",
  terracotta: "bg-terracotta text-ink",
  mustard: "bg-mustard text-ink",
  "dusty-blue": "bg-dusty-blue text-ink",
  blush: "bg-blush text-ink",
};

export function HeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  // autoplay: advance every 3s, keep going after manual interaction.
  // useState initializer creates the plugin once (stable, no ref access during render).
  const [autoplay] = useState(() =>
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

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
          {heroSlides.map((s) => (
            <CarouselItem key={s.id}>
              <div className={cn("relative w-full overflow-hidden", toneClass[s.tone])}>
                <div className="mx-auto flex min-h-[440px] max-w-6xl flex-col justify-center px-6 py-12 sm:min-h-[560px] sm:px-10 lg:max-w-[90rem]">
                  <span className="w-fit rounded-full bg-paper/80 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
                    {s.eyebrowBn}
                  </span>
                  <h2 className="mt-5 max-w-xl font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
                    {s.titleBn}
                  </h2>
                  <p className="mt-4 max-w-md text-base opacity-90 sm:text-lg">
                    {s.subtitleBn}
                  </p>
                  <div className="mt-7">
                    <Button asChild size="lg" variant="secondary">
                      <Link href={s.href}>{s.ctaBn} →</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 hidden border-none bg-paper/80 sm:flex" />
        <CarouselNext className="right-4 hidden border-none bg-paper/80 sm:flex" />
      </Carousel>

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
