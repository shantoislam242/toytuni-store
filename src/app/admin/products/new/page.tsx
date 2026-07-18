import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCategories, getAgeTiers } from "@/lib/data/taxonomy";
import { ProductCreateForm } from "@/components/admin/product-create-form";

export function generateMetadata(): Metadata {
  return {
    title: "New product",
    robots: { index: false, follow: false },
  };
}

/**
 * New-product page (Slice 2). Reads the DB taxonomy (categories + age tiers)
 * server-side and hands the select options to the client create form, which
 * calls the `createProduct` Server Action (admin re-check + validation live
 * server-side). A brand-new DB-only product then renders on the storefront.
 */
export default async function Page() {
  const [categories, ageTiers] = await Promise.all([getCategories(), getAgeTiers()]);

  return (
    <div>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to products
      </Link>

      <div className="mt-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Catalog
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">New product</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          Add a product to the catalog. It goes live on the storefront on save.
        </p>
      </div>

      <div className="mt-6">
        <ProductCreateForm
          categories={categories.map((c) => ({ slug: c.slug, label: c.nameBn }))}
          ageTiers={ageTiers.map((a) => ({ slug: a.slug, label: a.labelBn }))}
        />
      </div>
    </div>
  );
}
