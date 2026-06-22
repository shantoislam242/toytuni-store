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
import { ActiveFilters } from "@/components/collection/active-filters";
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
 * derives the displayed list, and renders the toolbar, the filters Sheet
 * (toggled open on every screen size), active-filter chips, the grid and
 * Load more.
 */
export function ProductGrid({ products }: { products: Product[] }) {
  const priceMax = priceCeiling(products);
  const [sort, setSort] = useState<SortKey>("featured");
  const [filters, setFilters] = useState<Filters>(() => emptyFilters(products));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Any filter change restarts pagination so the user isn't stranded mid-list.
  const updateFilters = (next: Filters) => {
    setFilters(next);
    setVisibleCount(PAGE_SIZE);
  };
  const resetFilters = () => updateFilters(emptyFilters(products));

  const activeCount =
    filters.ages.length +
    filters.badges.length +
    (filters.maxPrice < priceMax ? 1 : 0);

  const filtered = applyFilters(products, filters);
  const sorted = applySort(filtered, sort);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div>
      <CollectionToolbar
        count={filtered.length}
        sort={sort}
        onSortChange={setSort}
        activeFilterCount={activeCount}
        onOpenFilters={() => setSheetOpen(true)}
      />

      <ActiveFilters
        filters={filters}
        priceMax={priceMax}
        onChange={updateFilters}
      />

      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-cream-300 px-6 py-16 text-center">
          <p className="font-display text-xl font-bold text-ink">
            No toys match these filters
          </p>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Try widening the price range or clearing a filter to see more.
          </p>
          <Button variant="outline" className="mt-6" onClick={resetFilters}>
            Reset filters
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
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
        </>
      )}

      {/* Filters Sheet (toggled open on every screen size) — same FilterPanel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="sr-only">Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FilterPanel
              filters={filters}
              priceMax={priceMax}
              onChange={updateFilters}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
