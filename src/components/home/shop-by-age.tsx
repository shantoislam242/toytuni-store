"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaceholderImage } from "@/components/placeholder-image";
import { ageTiers } from "@/lib/mock/age-tiers";
import { categories } from "@/lib/mock/categories";
import { bulkPrograms } from "@/lib/mock/bulk";
import { products } from "@/lib/mock/products";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

/** how many products sit in a given age tier (for the card's count line). */
const countFor = (slug: string) =>
  products.filter((p) => p.ageTierSlug === slug).length;

const toneBg: Record<Tone, string> = {
  cream: "bg-cream-200 text-ink",
  neem: "bg-neem text-paper",
  "neem-soft": "bg-neem-soft text-ink",
  wood: "bg-wood-light text-ink",
  terracotta: "bg-terracotta text-ink",
  mustard: "bg-mustard text-ink",
  "dusty-blue": "bg-dusty-blue text-ink",
  blush: "bg-blush text-ink",
};

function Tile({ href, label, slug }: { href: string; label: string; slug: string }) {
  return (
    <Link
      href={href}
      className="group relative block aspect-square overflow-hidden rounded-xl border border-cream-300 bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <img
        src={`/images/category/${slug}/1.png`}
        alt={label}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-4 pb-4 pt-12 text-center font-display text-sm font-bold text-paper sm:text-base">
        {label}
      </span>
    </Link>
  );
}

function TileGrid({
  items,
}: {
  items: { href: string; label: string; slug: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {items.map((it) => (
        <Tile key={it.href} {...it} />
      ))}
    </div>
  );
}

/**
 * Displays an age-tier image from /public/images/age-tiers/{slug}/1.{ext}
 * Dynamically finds the correct extension (.jpg, .png, .avif, etc.)
 * Falls back to PlaceholderImage if the image doesn't exist.
 */
function AgeTierImage({
  slug,
  label,
  fallbackTone,
  className,
}: {
  slug: string;
  label: string;
  fallbackTone: Tone;
  className?: string;
}) {
  const [imagePath, setImagePath] = React.useState<string | null>(null);
  const [imageExists, setImageExists] = React.useState(false);

  React.useEffect(() => {
    // Try common image extensions
    const extensions = [".jpg", ".jpeg", ".png", ".avif", ".webp", ".gif"];

    const tryExtension = (index: number) => {
      if (index >= extensions.length) {
        setImageExists(false);
        return;
      }

      const ext = extensions[index];
      const path = `/images/age-tiers/${slug}/1${ext}`;
      const img = new Image();

      img.onload = () => {
        setImagePath(path);
        setImageExists(true);
      };

      img.onerror = () => {
        tryExtension(index + 1);
      };

      img.src = path;
    };

    tryExtension(0);
  }, [slug]);

  if (!imageExists || !imagePath) {
    return (
      <PlaceholderImage
        tone={fallbackTone}
        label={label}
        className={className}
      />
    );
  }

  return (
    <img
      src={imagePath}
      alt={label}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function ShopByAge() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-[90rem] lg:px-8">
      {/* heading */}
      <div className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Find the right fit
        </span>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Shop by Age
        </h2>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          Toys matched to every stage — from first grasp to imaginative play.
        </p>
      </div>

      {/* age-tier cards */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {ageTiers.map((t) => {
          const count = countFor(t.slug);
          return (
            <Link
              key={t.slug}
              href={t.href}
              className="group flex flex-col overflow-hidden rounded-xl border border-cream-300 bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <AgeTierImage
                slug={t.slug}
                label={t.labelBn}
                fallbackTone={t.tone}
                className="aspect-[4/3] w-full font-display text-lg"
              />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-display text-base font-bold text-ink sm:text-lg">
                  {t.labelBn}
                </h3>
                {t.taglineBn ? (
                  <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                    {t.taglineBn}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-ink-soft">
                    {count} {count === 1 ? "toy" : "toys"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-neem-deep">
                    Shop
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Browse tabs — category & bulk */}
      <div className="mt-12">
        <Tabs defaultValue="category" className="mt-6">
          <TabsList className="mx-auto mb-6 flex h-auto flex-wrap justify-center gap-1">
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="bulk">Bulk</TabsTrigger>
          </TabsList>

          <TabsContent value="category">
            <TileGrid
              items={categories.map((c) => ({
                href: c.href,
                label: c.nameBn,
                slug: c.slug,
              }))}
            />
          </TabsContent>

          <TabsContent value="bulk">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bulkPrograms.map((p) => (
                <Link
                  key={p.id}
                  href={p.href}
                  className={cn(
                    "group flex flex-col justify-between gap-6 rounded-xl border border-cream-300 p-6 transition-all hover:shadow-md sm:p-8",
                    toneBg[p.tone],
                  )}
                >
                  <div>
                    <h3 className="font-display text-xl font-bold">{p.titleBn}</h3>
                    <p className="mt-2 max-w-sm text-sm opacity-90">{p.descBn}</p>
                  </div>
                  <span className="text-sm font-semibold underline-offset-4 group-hover:underline">
                    Know more →
                  </span>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
