"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { ProductListItem } from "@/components/product/product-list-item";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CollectionToolbar,
  type ViewMode,
} from "@/components/collection/collection-toolbar";
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

const DEFAULT_PAGE_SIZE = 24; // products shown before the first "Load more"

/**
 * State owner for the PLP: holds sort / filters / how many are visible,
 * derives the displayed list, and renders the toolbar, the filters Sheet
 * (toggled open on every screen size), active-filter chips, the grid and
 * Load more.
 */
export function ProductGrid({
  products,
  hideAgeFilter = false,
}: {
  products: Product[];
  /** scoped pages (e.g. an age tier) hide the redundant Age facet. */
  hideAgeFilter?: boolean;
}) {
  const priceMax = priceCeiling(products);
  const [sort, setSort] = useState<SortKey>("featured");
  const [filters, setFilters] = useState<Filters>(() => emptyFilters(products));
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [view, setView] = useState<ViewMode>("grid");
  const [visibleCount, setVisibleCount] = useState(DEFAULT_PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Any filter change restarts pagination so the user isn't stranded mid-list.
  const updateFilters = (next: Filters) => {
    setFilters(next);
    setVisibleCount(pageSize);
  };
  const resetFilters = () => updateFilters(emptyFilters(products));

  // Changing the page size resets how many are shown to that size.
  const changePageSize = (next: number) => {
    setPageSize(next);
    setVisibleCount(next);
  };

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
        view={view}
        onViewChange={setView}
        pageSize={pageSize}
        onPageSizeChange={changePageSize}
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
          {view === "list" ? (
            <div className="mt-6 flex flex-col gap-4">
              {visible.map((product) => (
                <ProductListItem key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-4 min-[420px]:gap-4 sm:grid-cols-3 sm:gap-7 lg:grid-cols-4 lg:gap-8">
              {visible.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          )}

          {hasMore ? (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((c) => c + pageSize)}
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
              hideAge={hideAgeFilter}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
