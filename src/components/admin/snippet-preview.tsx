"use client";
import { SITE_URL } from "@/lib/config";

export function SnippetPreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  return (
    <div className="rounded-xl border border-cream-300 p-4">
      <p className="text-xs text-ink-soft">Search preview</p>
      <p className="mt-1 truncate text-xs text-neem-deep">{SITE_URL.replace(/^https?:\/\//, "")}/blog/{slug || "your-post"}</p>
      <p className="truncate text-lg text-[#1a0dab]">{title || "Your SEO title"}</p>
      <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{description || "Your meta description will appear here."}</p>
    </div>
  );
}
