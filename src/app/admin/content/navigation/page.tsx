import type { Metadata } from "next";
import { getNavContent } from "@/lib/data/nav";
import { NavContentForm } from "@/components/admin/nav-content-form";
import { ContentNav } from "@/components/admin/content-nav";

export function generateMetadata(): Metadata {
  return { title: "Navigation", robots: { index: false, follow: false } };
}

/** `/admin/content/navigation` — edit header + footer navigation and socials. */
export default async function Page() {
  const content = await getNavContent();
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit storefront pages.</p>
      <ContentNav />
      <p className="mt-4 text-sm text-ink-muted">
        The Age / Category menus follow your{" "}
        <span className="font-medium">Categories</span> settings; the mobile bottom bar is fixed.
      </p>
      <div className="mt-4">
        <NavContentForm initial={content} />
      </div>
    </div>
  );
}
