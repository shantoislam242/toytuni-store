"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
              {/* image-only slide (links through, no overlay text).
                  Mobile keeps the banner's true 16:9 ratio so the whole
                  artwork shows un-cropped; sm+ preserves the taller desktop
                  hero with object-cover. */}
              <Link
                href={s.href}
                className="relative block aspect-video w-full overflow-hidden sm:aspect-auto sm:min-h-[440px] md:min-h-[560px]"
              >
                <Image
                  src={s.image}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </Link>
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
