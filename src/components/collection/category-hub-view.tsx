import { Breadcrumb } from "@/components/breadcrumb";
import { CategoryCard } from "@/components/collection/category-card";
import { categories } from "@/lib/mock/categories";
import { products } from "@/lib/mock/products";

/**
 * "Shop by Category" hub: a hero plus a bento grid of premium category cards.
 * Server component — derives each category's product count and a peek of tone
 * tiles, then hands plain props to the client CategoryCard. The first category
 * renders as a wider feature card.
 */
export function CategoryHubView() {
  return (
    <main className="flex-1 bg-paper">
      {/* hero */}
      <section className="mx-auto w-full max-w-[92rem] px-4 pt-6 pb-8 text-center sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop by Category" }]} />
        <div className="mt-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
            Shop by Category
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Find their next favourite
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-muted">
            Explore our handmade wooden toys by play type — from first teethers to
            big-kid ride-ons.
          </p>
        </div>
      </section>

      {/* bento grid */}
      <div className="mx-auto grid w-full max-w-[92rem] grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 sm:gap-5 sm:px-6 lg:grid-cols-3 lg:px-8">
        {categories.map((cat, index) => {
          const catProducts = products.filter((p) => p.categorySlug === cat.slug);
          const peek = catProducts.slice(0, 3).map((p) => ({
            tone: p.imageTones[0],
            label: p.imageLabelBn,
          }));
          return (
            <CategoryCard
              key={cat.slug}
              name={cat.nameBn}
              tagline={cat.taglineBn}
              href={cat.href}
              tone={cat.tone}
              count={catProducts.length}
              peek={peek}
              feature={index === 0}
              index={index}
            />
          );
        })}
      </div>
    </main>
  );
}
