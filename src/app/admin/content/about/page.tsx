import type { Metadata } from "next";
import { getAboutContent } from "@/lib/data/about";
import { AboutContentForm } from "@/components/admin/about-content-form";
import { ContentNav } from "@/components/admin/content-nav";

export function generateMetadata(): Metadata {
  return { title: "About content", robots: { index: false, follow: false } };
}

/** `/admin/content/about` — edit the About page. */
export default async function Page() {
  const content = await getAboutContent();
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit storefront pages.</p>
      <ContentNav />
      <div className="mt-6">
        <AboutContentForm initial={content} />
      </div>
    </div>
  );
}
