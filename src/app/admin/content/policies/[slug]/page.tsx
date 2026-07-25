import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminPolicy } from "@/lib/admin/policy-actions";
import { PolicyContentForm } from "@/components/admin/policy-content-form";

export function generateMetadata(): Metadata {
  return { title: "Edit policy", robots: { index: false, follow: false } };
}

/** `/admin/content/policies/[slug]` — edit one policy page. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = await getAdminPolicy(slug);
  if (!policy) notFound();

  return (
    <div>
      <Link href="/admin/content/policies" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to policies
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">{policy.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Editing <span className="font-mono">/policy/{slug}</span>. Reset restores the built-in default.
      </p>
      <div className="mt-6">
        <PolicyContentForm slug={slug} initial={policy} />
      </div>
    </div>
  );
}
