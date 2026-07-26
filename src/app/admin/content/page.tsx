import type { Metadata } from "next";
import { getSiteContent } from "@/lib/data/content";
import { getAdminProducts } from "@/lib/admin/queries";
import { HomepageContentForm } from "@/components/admin/homepage-content-form";
import { ContentNav } from "@/components/admin/content-nav";

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
  // Product list backs the featured-product picker only. A products read must
  // NEVER 500 the content editor — fail soft to an empty list (the picker keeps
  // the current slug via its fallback option).
  let products: { slug: string; title: string }[] = [];
  try {
    products = (await getAdminProducts())
      .filter((p) => p.active)
      .map((p) => ({ slug: p.slug, title: p.title }));
  } catch (err) {
    console.error("admin/content: product list failed to load:", err);
  }
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">Storefront</p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Content</h1>
      <p className="mt-1 text-sm text-ink-muted">Edit storefront pages.</p>
      <ContentNav />
      <div className="mt-6">
        <HomepageContentForm initial={content} products={products} />
      </div>
    </div>
  );
}
