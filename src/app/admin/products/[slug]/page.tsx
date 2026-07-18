import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminProductBySlug } from "@/lib/admin/queries";
import { getCategories, getAgeTiers } from "@/lib/data/taxonomy";
import { ProductEditForm } from "@/components/admin/product-edit-form";

export function generateMetadata(): Metadata {
  return {
    title: "Edit product",
    robots: { index: false, follow: false },
  };
}

/**
 * Product edit (Task 5). `getAdminProductBySlug()` is service-role — server-only
 * — and returns the product whether active or not. The form itself is a client
 * component that calls the `updateProduct` / `uploadProductImage` actions.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, categories, ageTiers] = await Promise.all([
    getAdminProductBySlug(slug),
    getCategories(),
    getAgeTiers(),
  ]);
  if (!product) notFound();

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
          Product
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">{product.title}</h1>
        <p className="mt-0.5 font-mono text-sm text-ink-muted">{product.sku}</p>
      </div>

      <div className="mt-6">
        <ProductEditForm
          product={product}
          categories={categories.map((c) => ({ slug: c.slug, label: c.nameBn }))}
          ageTiers={ageTiers.map((a) => ({ slug: a.slug, label: a.labelBn }))}
        />
      </div>
    </div>
  );
}
