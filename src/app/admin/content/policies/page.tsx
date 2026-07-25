import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { getPolicy } from "@/lib/policy";
import { EDITABLE_POLICY_SLUGS } from "@/lib/data/policy-content";
import { ContentNav } from "@/components/admin/content-nav";

export function generateMetadata(): Metadata {
  return { title: "Policies", robots: { index: false, follow: false } };
}

/** `/admin/content/policies` — pick a policy page to edit. */
export default function Page() {
  const policies = EDITABLE_POLICY_SLUGS.map((slug) => ({ slug, title: getPolicy(slug)?.title ?? slug }));
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit storefront pages.</p>
      <ContentNav />
      <ul className="mt-6 divide-y divide-cream-200 rounded-2xl border border-cream-300 bg-card">
        {policies.map((p) => (
          <li key={p.slug}>
            <Link href={`/admin/content/policies/${p.slug}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-cream-50">
              <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-neem/10 text-neem-deep"><FileText className="size-4.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{p.title}</span>
                <span className="block text-xs text-ink-soft">/policy/{p.slug}</span>
              </span>
              <ChevronRight className="size-4 flex-none text-ink-soft" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
