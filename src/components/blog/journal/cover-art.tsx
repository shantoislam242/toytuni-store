import Image from "next/image";
import { NeemSprig } from "@/components/blog/journal/neem-sprig";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/types";

/** Cover-relevant fields only — satisfied by both the legacy `BlogPost` (mock,
 *  typed body) and the DB-backed `BlogPostData` (markdown body) shapes, so
 *  this stays usable from either. */
type CoverPost = { coverImage?: string; coverTone: Tone; coverLabel: string };

// Muted, journal-palette tints per cover tone (bg wash + sprig/label accent).
const coverStyle: Record<Tone, { bg: string; accent: string }> = {
  "neem-soft": { bg: "#dde6d4", accent: "#4a6b50" },
  neem: { bg: "#cdd9c5", accent: "#34513a" },
  mustard: { bg: "#ecdfc2", accent: "#a9762f" },
  terracotta: { bg: "#e9d7c8", accent: "#a5623f" },
  "dusty-blue": { bg: "#d6dfe1", accent: "#5c7a82" },
  blush: { bg: "#ead8d1", accent: "#a5685c" },
  wood: { bg: "#e5d6bd", accent: "#8a6537" },
  cream: { bg: "#ede4d0", accent: "#8a7f63" },
};

/**
 * Illustrated SVG cover panel — the fallback when a post has no real photo.
 * A soft tinted wash, two organic blobs and a neem sprig, plus the cover label.
 */
export function CoverArt({
  tone,
  label,
  className,
}: {
  tone: Tone;
  label: string;
  className?: string;
}) {
  const s = coverStyle[tone] ?? coverStyle.cream;
  return (
    <div
      aria-hidden
      className={cn("relative flex size-full items-center justify-center overflow-hidden", className)}
      style={{ backgroundColor: s.bg }}
    >
      <span
        className="absolute -right-8 -top-10 size-32 rounded-full opacity-40"
        style={{ backgroundColor: s.accent }}
      />
      <span
        className="absolute -bottom-12 -left-8 size-36 rounded-full opacity-20"
        style={{ backgroundColor: s.accent }}
      />
      {/* the sprig inherits currentColor from this wrapper's colour */}
      <span className="relative" style={{ color: s.accent }}>
        <NeemSprig className="size-24 opacity-90" />
      </span>
      <span
        className="absolute bottom-3 left-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: s.accent }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Post cover: renders a real `next/image` when the post has `coverImage`,
 * otherwise the illustrated `CoverArt` fallback. Structured so a CMS can drop
 * in a photo per post with no card changes.
 *
 * `next/image` handles the heavy lifting: responsive `srcset` from `sizes`,
 * AVIF/WebP negotiation, and lazy loading by default. Pass `priority` only for
 * an above-the-fold cover (e.g. the blog's featured story) to load it eagerly;
 * every other cover stays lazy.
 */
export function PostCover({
  post,
  sizes,
  className,
  priority = false,
}: {
  post: CoverPost;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  if (post.coverImage) {
    return (
      <Image
        src={post.coverImage}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }
  return <CoverArt tone={post.coverTone} label={post.coverLabel} className={className} />;
}
