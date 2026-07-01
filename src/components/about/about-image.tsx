"use client";

import { useState } from "react";
import Image from "next/image";
import { PlaceholderImage } from "@/components/placeholder-image";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

/**
 * Image with a graceful placeholder fallback. Renders a toned placeholder when
 * no `src` is given or the file 404s — so the layout never breaks before real
 * photography is added. Drop artwork under /public/images/about/ and pass its
 * path as `src`. Client island (the fallback relies on the `onError` event).
 */
export function AboutImage({
  src,
  alt,
  tone = "neem-soft",
  label,
  className,
  width = 1200,
  height = 900,
  priority = false,
}: {
  src?: string;
  alt: string;
  tone?: Tone;
  label?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <PlaceholderImage tone={tone} label={label ?? alt} className={className} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
