import type { Metadata } from "next";
import { getPopupContent } from "@/lib/data/popup";
import { PopupContentForm } from "@/components/admin/popup-content-form";
import { ContentNav } from "@/components/admin/content-nav";

export function generateMetadata(): Metadata {
  return { title: "Pop-up content", robots: { index: false, follow: false } };
}

/** `/admin/content/popup` — edit the timed newsletter pop-up. */
export default async function Page() {
  const content = await getPopupContent();
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit storefront pages.</p>
      <ContentNav />
      <div className="mt-6">
        <PopupContentForm initial={content} />
      </div>
    </div>
  );
}
