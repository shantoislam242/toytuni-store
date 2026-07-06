import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortKey } from "@/lib/collection";

// Presentational: live result count, a mobile "Filter" trigger, and the
// sort dropdown. The desktop filter panel lives in a sidebar, not here.
export function CollectionToolbar({
  count,
  sort,
  onSortChange,
  onOpenFilters,
  activeFilterCount = 0,
}: {
  count: number;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-cream-300 pb-3">
      {onOpenFilters ? (
        <Button variant="outline" size="sm" onClick={onOpenFilters}>
          <SlidersHorizontal className="size-4" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-neem text-[11px] font-semibold text-paper">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
      ) : null}

      {/* count + sort grouped on the right */}
      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{count}</span>{" "}
          {count === 1 ? "product" : "products"}
        </p>
        <label htmlFor="sort" className="hidden text-sm text-ink-muted sm:inline">
          Sort by
        </label>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger
            id="sort"
            aria-label="Sort products"
            className="h-10 w-[168px] rounded-lg border-cream-300 bg-paper px-3.5 text-sm text-ink sm:w-[215px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-[168px] bg-paper sm:min-w-[215px]">
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="py-1.5">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
