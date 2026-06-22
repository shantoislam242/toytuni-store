import { Breadcrumb } from "@/components/breadcrumb";
import { ProductGrid } from "@/components/collection/product-grid";
import { products } from "@/lib/mock/products";

// Composes the All Products PLP: breadcrumb + heading + interactive grid.
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

      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </main>
  );
}
