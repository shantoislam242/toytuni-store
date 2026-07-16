import { ProductGrid } from "@/components/collection/product-grid";
import { Breadcrumb } from "@/components/breadcrumb";
import { crumbs } from "@/lib/breadcrumbs";
import { getCatalog } from "@/lib/data/catalog";
import type { AgeTier } from "@/lib/types";

/**
 * Age-scoped PLP: products are pre-filtered to one age tier, so the grid's
 * own Age facet is hidden (`hideAgeFilter`) to avoid a redundant control.
 */
export async function AgeCollectionView({ tier }: { tier: AgeTier }) {
  const products = await getCatalog();
  const scoped = products.filter((p) => p.ageTierSlug === tier.slug);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-[90rem] lg:px-8">
      <Breadcrumb
        items={crumbs(
          { label: "Shop", href: "/collections/all" },
          { label: tier.labelBn },
        )}
      />

      {/* heading */}
      <header className="mt-4 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Shop by Age
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {tier.labelBn}
        </h1>
        {tier.taglineBn ? (
          <p className="mt-2 text-ink-muted">{tier.taglineBn}</p>
        ) : null}
      </header>

      <div className="mt-8">
        <ProductGrid products={scoped} hideAgeFilter persistKey={`age:${tier.slug}`} />
      </div>
    </main>
  );
}
