"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X, ZoomIn } from "lucide-react";
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
 * prev/next arrows, and a hover lens-zoom on the main image (desktop). On touch
 * devices the "Hover to zoom" hint is replaced by an expand icon; tapping the
 * icon or the image opens a fullscreen viewer.
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
  const [lightbox, setLightbox] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const go = (next: number) =>
    setActive((current) => (current + next + items.length) % items.length);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLens({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  // Tapping the image opens the fullscreen viewer on touch devices only; desktop
  // keeps its hover lens-zoom untouched.
  const onImageClick = () => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
      setLightbox(true);
    }
  };

  // Escape to close + lock body scroll while the fullscreen viewer is open.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

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
          onClick={onImageClick}
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

          {/* zoom hint — DESKTOP (hover-capable) only. Visible while idle; fades +
              scales out instantly on hover and fades back in after a ~250ms delay
              once the cursor leaves. */}
          <div className="pointer-events-none absolute right-3 top-3 hidden scale-100 items-center gap-1 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-medium text-ink-muted opacity-100 shadow-sm transition-all delay-[250ms] duration-300 ease-out group-hover:scale-95 group-hover:opacity-0 group-hover:delay-0 [@media(hover:hover)]:flex">
            <ZoomIn className="size-3.5" />
            Hover to zoom
          </div>

          {/* zoom hint — TOUCH devices: an expand icon inside the same pill. Taps
              open the fullscreen viewer. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(true);
            }}
            aria-label="Open fullscreen image"
            className="absolute right-3 top-3 hidden size-9 items-center justify-center rounded-full bg-paper/90 text-neem-deep shadow-sm transition-transform duration-200 ease-out hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem [@media(hover:none)]:flex"
          >
            <Expand className="size-4" />
          </button>

          {/* nav arrows */}
          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition hover:bg-paper hover:text-neem-deep"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
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

      {/* fullscreen viewer (UI only) */}
      {mounted
        ? createPortal(
            <AnimatePresence>
              {lightbox ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Product image viewer"
                  onClick={() => setLightbox(false)}
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
                >
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setLightbox(false)}
                    aria-label="Close fullscreen image"
                    className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-paper/15 text-paper transition-colors hover:bg-paper/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                  >
                    <X className="size-6" />
                  </button>

                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex w-full max-w-4xl items-center justify-center"
                  >
                    {activeItem.src ? (
                      <img
                        src={activeItem.src}
                        alt={activeItem.label}
                        className="max-h-[85vh] w-auto rounded-lg object-contain"
                      />
                    ) : (
                      <PlaceholderImage
                        tone={activeItem.tone}
                        label={activeItem.label}
                        className="aspect-square w-full max-w-lg rounded-lg"
                      />
                    )}

                    {items.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => go(-1)}
                          aria-label="Previous image"
                          className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/15 text-paper transition-colors hover:bg-paper/25"
                        >
                          <ChevronLeft className="size-6" />
                        </button>
                        <button
                          type="button"
                          onClick={() => go(1)}
                          aria-label="Next image"
                          className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-paper/15 text-paper transition-colors hover:bg-paper/25"
                        >
                          <ChevronRight className="size-6" />
                        </button>
                      </>
                    ) : null}
                  </motion.div>

                  {items.length > 1 ? (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-paper/15 px-3 py-1 text-sm font-medium text-paper">
                      {active + 1} / {items.length}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
