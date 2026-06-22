"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { CollectionToolbar } from "@/components/collection/collection-toolbar";
import {
  applyFilters,
  applySort,
  emptyFilters,
  type Filters,
  type SortKey,
} from "@/lib/collection";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 12; // products shown before the first "Load more"
const LOAD_MORE_STEP = 6; // products revealed per "Load more" click

/**
 * State owner for the PLP: holds sort / filters / how many are visible,
 * derives the displayed list, and renders the toolbar, grid and Load more.
 * (Filter UI is wired in a later step; filters default to "everything".)
 */
export function ProductGrid({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<SortKey>("featured");
  const [filters] = useState<Filters>(() => emptyFilters(products));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = applyFilters(products, filters);
  const sorted = applySort(filtered, sort);
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  return (
    <div>
      <CollectionToolbar count={filtered.length} sort={sort} onSortChange={setSort} />

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
    </div>
  );
}
