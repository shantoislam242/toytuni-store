"use client";

import { useState } from "react";
import Image from "next/image";
import { PlaceholderImage } from "@/components/placeholder-image";

/**
 * Contact hero image with a graceful fallback. If the file at the path below is
 * missing (404), it swaps to a toned placeholder so the layout never breaks.
 * Client island because the fallback relies on the image `onError` event.
 * Drop the real artwork at /public/images/contact/contact-hero.png to show it.
 */
export function ContactImage() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <PlaceholderImage
        tone="neem-soft"
        label="Wooden Montessori toys"
        className="h-[240px] w-full rounded-2xl sm:h-[320px] lg:h-[420px]"
      />
    );
  }

  return (
    <Image
      src="/images/contact/contact-hero.png"
      alt="Handmade wooden Montessori toys"
      width={2172}
      height={724}
      onError={() => setFailed(true)}
      className="h-[240px] w-full rounded-2xl object-cover sm:h-[320px] lg:h-[420px]"
    />
  );
}
