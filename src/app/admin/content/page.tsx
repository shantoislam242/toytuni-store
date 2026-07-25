import type { Metadata } from "next";
import { getSiteContent } from "@/lib/data/content";
import { HomepageContentForm } from "@/components/admin/homepage-content-form";

export function generateMetadata(): Metadata {
  return { title: "Content", robots: { index: false, follow: false } };
}

/**
 * `/admin/content` — edit storefront content. Phase 1: the homepage hero +
 * about teaser. Reads the current (cached, fail-soft) content and hands it to
 * the client form.
 */
export default async function Page() {
  const content = await getSiteContent();
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit the homepage hero and about section.</p>
      <div className="mt-6">
        <HomepageContentForm initial={content} />
      </div>
    </div>
  );
}
