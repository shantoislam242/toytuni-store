import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { getNewLaunches } from "@/lib/data/catalog";

/**
 * "New Arrivals" listing: a hero plus a clean grid of the store's newest
 * products (those flagged `badge: "New"`). Server component — reuses the shared
 * `newLaunches` list so ordering matches the home page; ProductCard supplies all
 * card interactivity.
 */
export async function NewArrivalsView() {
  const newProducts = await getNewLaunches();

  return (
    <main className="flex-1 bg-paper">
      {/* hero */}
      <section className="mx-auto w-full max-w-[92rem] px-4 pt-6 pb-8 text-center sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "New Arrivals" }]} />
        <div className="mt-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
            Just landed
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            New Arrivals
          </h1>
          {newProducts.length > 0 ? (
            <p className="mx-auto mt-3 max-w-xl text-ink-muted">
              Our latest handmade wooden toys — {newProducts.length} just landed.
              Freshly added, non-toxic, and ready for little hands.
            </p>
          ) : null}
        </div>
      </section>

      {/* grid or empty state */}
      {newProducts.length > 0 ? (
        <div className="mx-auto grid w-full max-w-[92rem] grid-cols-2 gap-4 px-4 pb-16 sm:grid-cols-3 sm:gap-6 sm:px-6 lg:grid-cols-4 lg:gap-8 lg:px-8">
          {newProducts.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[92rem] px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-cream-300 px-6 py-16 text-center">
            <h2 className="font-display text-xl font-bold text-ink">
              No new arrivals right now
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Check back soon — we add fresh toys regularly.
            </p>
            <Button asChild className="mt-6">
              <Link href="/collections/all">Browse all toys</Link>
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
