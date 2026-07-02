import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductRail } from "@/components/product/product-rail";
import {
  products,
  bestSellers,
  newLaunches,
  giftPicks,
  neemWood,
} from "@/lib/mock/products";
import type { Product } from "@/lib/types";

type Tab = { value: string; label: string; href: string; items: Product[] };

const tabs: Tab[] = [
  { value: "best", label: "Best Sellers", href: "/collections/best-sellers", items: bestSellers },
  { value: "new", label: "New Launches", href: "/collections/new", items: newLaunches },
  { value: "gift", label: "Gifts", href: "/collections/gifts", items: giftPicks },
  { value: "all", label: "All Products", href: "/collections/all", items: products },
  { value: "neem", label: "Neem Wood", href: "/collections/neem-wood", items: neemWood },
];

export function ProductTabs() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:max-w-[90rem] lg:px-8">
      <h2 className="text-center font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Our Toys
      </h2>

      <Tabs defaultValue="best" className="mt-6">
        {/* Mobile: one swipeable row (scrollbar hidden). sm+: centered, wraps
            only if it must. Triggers size to content (flex-none) so they never
            cram into a broken 2-row grid. */}
        <TabsList className="mx-auto mb-6 flex h-auto max-w-full justify-start gap-1 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-none px-3">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <ProductRail products={t.items} viewAllHref={t.href} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
