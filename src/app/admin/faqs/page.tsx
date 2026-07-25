import type { Metadata } from "next";
import { getAdminFaqs } from "@/lib/admin/faq-actions";
import { FaqManager } from "@/components/admin/faq-manager";

export function generateMetadata(): Metadata {
  return { title: "FAQ", robots: { index: false, follow: false } };
}

/**
 * `/admin/faqs` — manage the support-center FAQ (CMS phase 2). Reads every FAQ
 * (active + hidden) via the service-role-backed `getAdminFaqs` and hands them
 * to the client manager.
 */
export default async function Page() {
  const faqs = await getAdminFaqs();
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">FAQ</h1>
      <p className="mt-1 text-sm text-ink-muted">Questions shown on the support page, grouped by category.</p>
      <div className="mt-6">
        <FaqManager faqs={faqs} />
      </div>
    </div>
  );
}
