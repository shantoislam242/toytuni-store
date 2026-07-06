"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/section-heading";
import type { Product } from "@/lib/types";

type Props = {
  /** Omit when the rail sits under tabs that already name it. */
  title?: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
  /** When true the rail auto-advances (loops, pauses on hover). */
  autoplay?: boolean;
};

const AUTOPLAY_DELAY = 3500;

/**
 * Section heading + horizontally scrollable product carousel.
 * Mobile: swipe (peek of next card). Desktop: arrows.
 * Optionally auto-slides (opt-in via `autoplay`).
 */
export function ProductRail({
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel = "View all",
  autoplay = false,
}: Props) {
  const [api, setApi] = useState<CarouselApi>();

  // Auto-advance driven directly off the carousel API (rather than the embla
  // autoplay plugin, which permanently bails if the carousel measures 0 width
  // on first mount inside a tab). Pauses on hover, resumes on leave.
  useEffect(() => {
    if (!autoplay || !api) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const play = () => {
      stop();
      // loop is on, so scrollNext wraps seamlessly with no dead-end.
      timer = setInterval(() => api.scrollNext(), AUTOPLAY_DELAY);
    };

    play();
    const root = api.rootNode();
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", play);

    return () => {
      stop();
      root.removeEventListener("mouseenter", stop);
      root.removeEventListener("mouseleave", play);
    };
  }, [api, autoplay]);

  return (
    <section className="py-2">
      {title ? (
        <SectionHeading title={title} subtitle={subtitle} viewAllHref={viewAllHref} />
      ) : viewAllHref ? (
        <div className="mb-4 flex justify-end">
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-neem-deep underline-offset-4 hover:underline"
          >
            {viewAllLabel} →
          </Link>
        </div>
      ) : null}
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: autoplay }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 overflow-visible sm:-ml-3">
          {products.map((p) => (
            <CarouselItem
              key={p.slug}
              className="basis-[47%] pl-2 sm:basis-1/3 sm:pl-3 lg:basis-1/4"
            >
              <ProductCard product={p} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Arrows sit INSIDE the carousel (left-2/right-2) instead of the
            default -left-12/-right-12, which poked ~16px past the viewport on
            desktop and caused horizontal scrolling. They overlap the slide
            edges, so the desktop design is unchanged. */}
        <CarouselPrevious className="left-2 hidden sm:flex" />
        <CarouselNext className="right-2 hidden sm:flex" />
      </Carousel>
    </section>
  );
}
