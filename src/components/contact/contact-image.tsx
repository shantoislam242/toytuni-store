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
        className="size-full min-h-[320px] rounded-2xl"
      />
    );
  }

  return (
    <Image
      src="/images/contact/contact-hero.png"
      alt="Handmade wooden Montessori toys"
      width={900}
      height={1100}
      onError={() => setFailed(true)}
      className="size-full rounded-2xl object-cover"
    />
  );
}
