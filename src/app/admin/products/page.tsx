import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { getAdminProducts } from "@/lib/admin/queries";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";

export function generateMetadata(): Metadata {
  return {
    title: "Products",
    robots: { index: false, follow: false },
  };
}

/**
 * Products list (Task 5). `getAdminProducts()` is service-role, unscoped by
 * RLS — server-only — and returns every product (active or not, incl. gift
 * cards/kits). The table itself is a client component for instant search.
 */
export default async function Page() {
  const products = await getAdminProducts();

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
        Catalog
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">Products</h1>

      {products.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <Package className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">No products yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Products in the catalog will show up here.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link href="/admin/products/new">
              <Plus className="size-4" />
              New product
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <ProductsTable products={products} />
        </div>
      )}
    </div>
  );
}
