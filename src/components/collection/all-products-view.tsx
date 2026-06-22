import { Breadcrumb } from "@/components/breadcrumb";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/mock/products";

// Step 1: static breadcrumb + heading + raw grid (no sort/filter yet).
// Sort, count, Load More and filters arrive in later steps.
export function AllProductsView() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "All Products" }]}
      />

      <header className="mt-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          All Products
        </h1>
        <p className="mt-2 text-ink-muted">
          Every handmade, non-toxic toy in one place.
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </main>
  );
}
