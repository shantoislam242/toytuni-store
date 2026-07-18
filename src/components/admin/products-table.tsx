"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/product/product-image";
import { ProductFrame } from "@/components/product/product-frame";
import { formatTk } from "@/lib/format";
import type { AdminProductListItem } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        active ? "bg-neem/15 text-neem-deep" : "bg-muted text-muted-foreground",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Products list (Task 5). Client component so the title/SKU search filters
 * instantly — the underlying data (`getAdminProducts()`, service-role) is
 * fetched once, server-side, by the parent page. Rows link to the operational
 * edit form at `/admin/products/[slug]`.
 */
export function ProductsTable({ products }: { products: AdminProductListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or SKU…"
            className="h-9 pl-8"
          />
        </div>
        <Button asChild size="sm">
          <Link href="/admin/products/new">
            <Plus className="size-4" />
            New product
          </Link>
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-cream-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">SKU</th>
              <th className="px-4 py-2.5 text-right font-medium">Price</th>
              <th className="px-4 py-2.5 text-right font-medium">Stock</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  No products match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-cream-200 last:border-b-0 hover:bg-cream-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductFrame className="size-11 shrink-0 rounded-lg">
                        <ProductImage
                          slug={product.slug}
                          imageNum={1}
                          label={product.title}
                          fallbackTone="cream"
                          imageUrl={product.imageUrl ?? undefined}
                        />
                      </ProductFrame>
                      <Link
                        href={`/admin/products/${product.slug}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {product.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{product.sku}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink">
                    {formatTk(product.price)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right",
                      product.stockQty <= product.lowStockThreshold
                        ? "font-semibold text-danger"
                        : "text-ink",
                    )}
                  >
                    {product.stockQty}
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={product.active} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${product.slug}`}
                      className="text-xs font-medium text-neem-deep hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
