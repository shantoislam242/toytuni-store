import { ProductGrid } from "@/components/collection/product-grid";
import { GiftCardBlock } from "@/components/gift/gift-card-block";
import { Breadcrumb } from "@/components/breadcrumb";
import { crumbs } from "@/lib/breadcrumbs";
import { giftKits } from "@/lib/mock/gifts";

export function GiftView() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-[90rem] lg:px-8">
      <Breadcrumb items={crumbs({ label: "Gifts" })} />

      {/* intro */}
      <header className="mt-4 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Gifting made easy
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Gifts &amp; Gift Cards
        </h1>
        <p className="mt-2 text-ink-muted">
          Curated kits for every stage — or a gift card to let them choose.
        </p>
      </header>

      {/* gift card block */}
      <div className="mt-8">
        <GiftCardBlock />
      </div>

      {/* gift kits grid */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          Gift Kits &amp; Bundles
        </h2>
        <div className="mt-6">
          <ProductGrid products={giftKits} />
        </div>
      </section>
    </main>
  );
}
