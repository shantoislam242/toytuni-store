"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { PlaceholderImage } from "@/components/placeholder-image";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

type ImageItem = {
  src?: string;
  label: string;
  tone: Tone;
};

/**
 * Product image gallery: large main image, clickable thumbnail strip,
 * prev/next arrows, and a hover lens-zoom on the main image.
 */
export function ProductGallery({
  images,
  imageLabel,
  imageTones,
}: {
  images: (string | undefined)[];
  imageLabel: string;
  imageTones: [Tone, Tone];
}) {
  // Always show at least the two placeholder tones so the strip isn't empty.
  const items: ImageItem[] = (images.length
    ? images
    : [undefined, undefined]
  ).map((src, i) => ({
    src,
    label: imageLabel,
    tone: imageTones[i % imageTones.length],
  }));

  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [lens, setLens] = useState({ x: 50, y: 50 });

  const go = (next: number) =>
    setActive((current) => (current + next + items.length) % items.length);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLens({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const activeItem = items[active];

  return (
    <div className="space-y-4">
      {/* main image */}
      <div className="relative">
        <div
          className="group relative aspect-square overflow-hidden rounded-xl border border-cream-200 bg-cream-50"
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={onMove}
        >
          {activeItem.src ? (
            <img
              src={activeItem.src}
              alt={activeItem.label}
              className={cn(
                "size-full object-cover transition-transform duration-200",
                zoom && "scale-[1.8]",
              )}
              style={zoom ? { transformOrigin: `${lens.x}% ${lens.y}%` } : undefined}
            />
          ) : (
            <PlaceholderImage tone={activeItem.tone} label={activeItem.label} className="size-full" />
          )}

          {/* zoom hint — visible while idle; fades + scales out instantly on
              hover, and fades back in after a ~250ms delay once the cursor
              leaves. The asymmetric timing comes from the transition-delay of
              each target state (delay-0 on hover, delay-[250ms] on idle). */}
          <div className="pointer-events-none absolute right-3 top-3 flex scale-100 items-center gap-1 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-medium text-ink-muted opacity-100 shadow-sm transition-all delay-[250ms] duration-300 ease-out group-hover:scale-95 group-hover:opacity-0 group-hover:delay-0">
            <ZoomIn className="size-3.5" />
            Hover to zoom
          </div>

          {/* nav arrows */}
          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition hover:bg-paper hover:text-neem-deep"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition hover:bg-paper hover:text-neem-deep"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* thumbnails */}
      {items.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:max-w-md">
          {items.slice(0, 4).map((item, index) => (
            <button
              key={`${item.src ?? "placeholder"}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View product image ${index + 1}`}
              aria-current={active === index}
              className={cn(
                "aspect-square overflow-hidden rounded-md border bg-cream-50 transition",
                active === index
                  ? "border-neem ring-2 ring-neem/20"
                  : "border-cream-200 hover:border-neem-soft",
              )}
            >
              {item.src ? (
                <img src={item.src} alt={item.label} className="size-full object-cover" />
              ) : (
                <PlaceholderImage tone={item.tone} label={item.label} className="size-full" />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
