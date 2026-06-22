"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CollectionToolbar } from "@/components/collection/collection-toolbar";
import { FilterPanel } from "@/components/collection/filter-panel";
import {
  applyFilters,
  applySort,
  emptyFilters,
  priceCeiling,
  type Filters,
  type SortKey,
} from "@/lib/collection";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 12; // products shown before the first "Load more"
const LOAD_MORE_STEP = 6; // products revealed per "Load more" click

/**
 * State owner for the PLP: holds sort / filters / how many are visible,
 * derives the displayed list, and renders the filter sidebar (desktop) or
 * Sheet (mobile), the toolbar, the grid and Load more.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  const priceMax = priceCeiling(products);
  const [sort, setSort] = useState<SortKey>("featured");
  const [filters, setFilters] = useState<Filters>(() => emptyFilters(products));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = applyFilters(products, filters);
  const sorted = applySort(filtered, sort);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <FilterPanel filters={filters} priceMax={priceMax} onChange={setFilters} />
      </aside>

      {/* Main column */}
      <div>
        <CollectionToolbar
          count={filtered.length}
          sort={sort}
          onSortChange={setSort}
          onOpenFilters={() => setSheetOpen(true)}
        />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {visible.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>

        {hasMore ? (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((c) => c + LOAD_MORE_STEP)}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </div>

      {/* Mobile filter Sheet — same FilterPanel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FilterPanel
              filters={filters}
              priceMax={priceMax}
              onChange={setFilters}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
