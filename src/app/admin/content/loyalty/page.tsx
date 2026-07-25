import type { Metadata } from "next";
import { getLoyaltyContent } from "@/lib/data/loyalty";
import { LoyaltyContentForm } from "@/components/admin/loyalty-content-form";
import { ContentNav } from "@/components/admin/content-nav";

export function generateMetadata(): Metadata {
  return { title: "Loyalty content", robots: { index: false, follow: false } };
}

/** `/admin/content/loyalty` — edit the Loyalty Rewards page. */
export default async function Page() {
  const content = await getLoyaltyContent();
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit storefront pages.</p>
      <ContentNav />
      <div className="mt-6">
        <LoyaltyContentForm initial={content} />
      </div>
    </div>
  );
}
