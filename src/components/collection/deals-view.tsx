import { ProductGrid } from "@/components/collection/product-grid";
import { Breadcrumb } from "@/components/breadcrumb";
import { crumbs } from "@/lib/breadcrumbs";
import { getDeals } from "@/lib/data/catalog";

/**
 * "Offers" PLP: the curated on-sale selection (each item carries a
 * compareAtPrice so cards render the discount). Same heading + interactive grid
 * pattern as the other collection pages, so filters/sort/load-more and
 * per-collection filter persistence all work.
 */
export async function DealsView() {
  const deals = await getDeals();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-[90rem] lg:px-8">
      <Breadcrumb
        items={crumbs({ label: "Shop", href: "/collections/all" }, { label: "Offers" })}
      />

      <header className="mt-4 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Limited-time savings
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Offers &amp; Deals
        </h1>
        {deals.length > 0 ? (
          <p className="mx-auto mt-2 max-w-xl text-ink-muted">
            Handmade, non-toxic wooden toys at a special price — {deals.length} on
            offer right now.
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        <ProductGrid products={deals} persistKey="deals" />
      </div>
    </main>
  );
}
