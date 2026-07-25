import type { Metadata } from "next";
import { getBulkContent } from "@/lib/data/bulk";
import { BulkContentForm } from "@/components/admin/bulk-content-form";
import { ContentNav } from "@/components/admin/content-nav";

export function generateMetadata(): Metadata {
  return { title: "Bulk content", robots: { index: false, follow: false } };
}

/** `/admin/content/bulk` — edit the Wholesale/Bulk page. */
export default async function Page() {
  const content = await getBulkContent();
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit storefront pages.</p>
      <ContentNav />
      <div className="mt-6">
        <BulkContentForm initial={content} />
      </div>
    </div>
  );
}
