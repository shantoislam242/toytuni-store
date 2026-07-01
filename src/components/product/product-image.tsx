"use client";

import React from "react";
import { PlaceholderImage } from "@/components/placeholder-image";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

/**
 * Displays a product image from `/images/products/{slug}/{num}.{ext}`, probing
 * common extensions at runtime (.png/.jpg/.jpeg/.webp/.gif). Falls back to
 * PlaceholderImage when no matching file exists. Client component — uses the
 * browser Image loader. Shared by the product card and the cart so both surface
 * the same real photography.
 */
export function ProductImage({
  slug,
  imageNum,
  label,
  fallbackTone,
  className,
}: {
  slug: string;
  imageNum: number;
  label: string;
  fallbackTone: Tone;
  className?: string;
}) {
  const [imagePath, setImagePath] = React.useState<string | null>(null);
  const [imageExists, setImageExists] = React.useState(false);

  React.useEffect(() => {
    const extensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

    const tryExtension = (index: number) => {
      if (index >= extensions.length) {
        setImageExists(false);
        return;
      }

      const ext = extensions[index];
      const path = `/images/products/${slug}/${imageNum}${ext}`;
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
  }, [slug, imageNum]);

  if (!imageExists || !imagePath) {
    return <PlaceholderImage tone={fallbackTone} label={label} className={className} />;
  }

  return (
    <img
      src={imagePath}
      alt={`${label} - Image ${imageNum}`}
      className={cn("h-full w-full object-contain", className)}
    />
  );
}
