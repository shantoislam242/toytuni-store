"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Play, RotateCcw, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ProductDetail } from "@/lib/types";

/** Turn a YouTube watch / shorts / youtu.be / embed URL into an embeddable one. */
function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-[15px] text-ink-muted">No information yet.</p>;
  return (
    <ul className="list-disc space-y-3 pl-5 text-[15px] leading-7 text-ink-muted marker:text-ink-muted">
      {items.map((item) => (
        <li key={item} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Detail/spec table row. */
function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-cream-200 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-ink">{label}</dt>
      <dd className="text-sm text-ink-muted">{value}</dd>
    </div>
  );
}

/** Pill-style tab trigger: outlined when idle, filled (blush) when active. */
const pillClass =
  "h-auto flex-none rounded-full border border-cream-300 px-5 py-2 text-sm font-medium text-ink-muted shadow-none transition-colors hover:border-neem-soft hover:text-ink data-active:border-neem data-active:bg-neem/15 data-active:font-bold data-active:text-neem-deep data-active:shadow-none";

/**
 * Tabbed product information shown as side-by-side pills: Description, Why Play,
 * How to Play, Details, and Return & Exchange. Falls back gracefully when
 * optional fields are missing.
 */
export function ProductTabs({ detail }: { detail: ProductDetail }) {
  const specs = detail.specs;
  const embedUrl = detail.videoUrl ? youtubeEmbedUrl(detail.videoUrl) : null;
  // Shorts are vertical (9:16); regular watch videos are landscape (16:9).
  const isShort = Boolean(detail.videoUrl && /\/shorts\//.test(detail.videoUrl));
  const [videoHidden, setVideoHidden] = useState(false);
  const showVideo = Boolean(embedUrl) && !videoHidden;

  // Draggable video: the frame keeps its default slot but can be dragged to any
  // position (a translate offset; {0,0} = default). Dragging happens on the
  // handle bar, since the iframe itself captures pointer events.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const moved = offset.x !== 0 || offset.y !== 0;

  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setOffset({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) });
  };
  const onDragEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return; // not an actual drag (e.g. a button click)
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <Tabs
      defaultValue="description"
      className={cn("mx-auto gap-6", showVideo ? "max-w-5xl" : "max-w-3xl")}
    >
      <TabsList className="flex h-auto w-full flex-wrap justify-center gap-2 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
        <TabsTrigger value="description" className={pillClass}>
          Description
        </TabsTrigger>
        <TabsTrigger value="why" className={pillClass}>
          Learning Benefits
        </TabsTrigger>
        <TabsTrigger value="how" className={pillClass}>
          How to Play
        </TabsTrigger>
        <TabsTrigger value="details" className={pillClass}>
          Specifications
        </TabsTrigger>
        <TabsTrigger value="return" className={pillClass}>
          Shipping &amp; Returns
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description">
        <div
          className={cn(
            showVideo && "gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]",
          )}
        >
          {/* left: description + features + benefits */}
          <div className="space-y-6">
            <p className="max-w-2xl text-[15px] leading-7 text-ink-muted">
              {detail.description}
            </p>
            {detail.features.length ? (
              <div>
                <h3 className="mb-3 font-display text-lg font-bold text-ink">Features</h3>
                <BulletList items={detail.features} />
              </div>
            ) : null}
            {detail.benefits.length ? (
              <div>
                <h3 className="mb-3 font-display text-lg font-bold text-ink">Benefits</h3>
                <BulletList items={detail.benefits} />
              </div>
            ) : null}

            {/* restore control — shown after the video is dismissed */}
            {embedUrl && videoHidden ? (
              <button
                type="button"
                onClick={() => setVideoHidden(false)}
                className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-paper px-4 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-neem hover:text-neem-deep"
              >
                <Play className="size-3.5" />
                Watch product video
              </button>
            ) : null}
          </div>

          {/* right: embedded product video — dismissible + draggable */}
          {showVideo ? (
            <div
              className={cn("mt-8 lg:mt-0", moved && "relative z-30")}
              style={
                moved
                  ? { transform: `translate(${offset.x}px, ${offset.y}px)` }
                  : undefined
              }
            >
              <div className={cn("mx-auto w-full lg:mx-0", isShort && "max-w-[280px]")}>
                {/* drag handle bar */}
                <div
                  onPointerDown={onDragStart}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  className="flex touch-none cursor-grab select-none items-center justify-between gap-2 rounded-t-2xl border border-b-0 border-cream-200 bg-cream-50 px-3 py-1.5 active:cursor-grabbing"
                >
                  <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                    <GripVertical className="size-3.5" />
                    Drag to move
                  </span>
                  <div className="flex items-center gap-0.5">
                    {moved ? (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setOffset({ x: 0, y: 0 })}
                        aria-label="Reset position"
                        title="Reset position"
                        className="flex size-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-neem/10 hover:text-neem-deep focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neem"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setVideoHidden(true)}
                      aria-label="Hide video"
                      title="Hide video"
                      className="flex size-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neem"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* video frame */}
                <div
                  className={cn(
                    "w-full overflow-hidden rounded-b-2xl border border-t-0 border-cream-200 bg-ink/5 shadow-sm",
                    isShort ? "aspect-[9/16]" : "aspect-video",
                  )}
                >
                  <iframe
                    src={embedUrl ?? undefined}
                    title="Product video"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="why">
        <div className="max-w-2xl">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">Why your child will love it</h3>
          <BulletList items={detail.whyPlay ?? []} />
        </div>
      </TabsContent>

      <TabsContent value="how">
        <div className="max-w-2xl">
          <h3 className="mb-3 font-display text-lg font-bold text-ink">How to play</h3>
          <BulletList items={detail.howPlay ?? []} />
        </div>
      </TabsContent>

      <TabsContent value="details">
        <dl className="max-w-2xl">
          <SpecRow label="Age range" value={specs?.ageRange} />
          <SpecRow label="Materials" value={specs?.materials} />
          <SpecRow label="Safety" value={specs?.safety} />
          <SpecRow label="Weight" value={specs?.weight} />
          <SpecRow label="Dimensions" value={specs?.dimensions} />
        </dl>
      </TabsContent>

      <TabsContent value="return">
        <p className="max-w-2xl text-sm leading-7 text-ink-muted">
          {detail.returnPolicy}
        </p>
      </TabsContent>
    </Tabs>
  );
}
