import { ProductGrid } from "@/components/collection/product-grid";
import { Breadcrumb } from "@/components/breadcrumb";
import { crumbs } from "@/lib/breadcrumbs";
import { getCatalog } from "@/lib/data/catalog";
import type { Category } from "@/lib/types";

/**
 * Category-scoped PLP: products are pre-filtered to one category. Unlike the
 * age pages, the Age facet stays visible so shoppers can narrow a category
 * down to their child's stage.
 */
export async function CategoryCollectionView({ category }: { category: Category }) {
  const products = await getCatalog();
  const scoped = products.filter((p) => p.categorySlug === category.slug);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-[90rem] lg:px-8">
      <Breadcrumb
        items={crumbs(
          { label: "Shop", href: "/collections/all" },
          { label: category.nameBn },
        )}
      />

      {/* heading */}
      <header className="mt-4 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Shop by Category
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {category.nameBn}
        </h1>
        {category.taglineBn ? (
          <p className="mt-2 text-ink-muted">{category.taglineBn}</p>
        ) : null}
      </header>

      <div className="mt-8">
        <ProductGrid products={scoped} persistKey={`category:${category.slug}`} />
      </div>
    </main>
  );
}
