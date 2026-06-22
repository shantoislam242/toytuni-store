"use client";

import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PlaceholderImage } from "@/components/placeholder-image";
import { testimonials } from "@/lib/mock/testimonials";
import { cn } from "@/lib/utils";

function Stars({ rating, className }: { rating: number; className?: string }) {
  const rounded = Math.round(rating);
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Rating ${rating}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < rounded ? "fill-mustard text-mustard" : "fill-cream-300 text-cream-300",
          )}
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-[90rem] lg:px-8">
      {/* heading */}
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Parents’ Love & Recommendations
        </h2>
        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-ink-muted">
          <span className="font-display text-lg font-bold text-ink">4.4</span>
          <Stars rating={4.4} />
          <span>· 4.4 out of 5 · 9,478 reviews</span>
        </div>
      </div>

      <Carousel opts={{ align: "start", loop: true }} className="mt-8">
        <CarouselContent className="-ml-3">
          {testimonials.map((t) => (
            <CarouselItem
              key={t.id}
              className="basis-[88%] pl-3 sm:basis-1/2 lg:basis-1/3"
            >
              <figure className="flex h-full flex-col rounded-xl border border-cream-300 bg-card p-5">
                <Stars rating={t.rating} />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
                  “{t.quoteBn}”
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <PlaceholderImage tone={t.tone} className="size-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-ink">{t.nameBn}</p>
                    <p className="text-xs text-ink-soft">{t.locationBn}</p>
                  </div>
                </figcaption>
              </figure>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </section>
  );
}
