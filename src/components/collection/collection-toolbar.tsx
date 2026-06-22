import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortKey } from "@/lib/collection";

// Presentational: shows the live result count and the sort dropdown.
// (The mobile "Filter" trigger is added in a later step.)
export function CollectionToolbar({
  count,
  sort,
  onSortChange,
}: {
  count: number;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-cream-300 pb-3">
      <p className="text-sm text-ink-muted">
        <span className="font-medium text-ink">{count}</span>{" "}
        {count === 1 ? "product" : "products"}
      </p>

      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="hidden text-sm text-ink-muted sm:inline">
          Sort by
        </label>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger
            id="sort"
            aria-label="Sort products"
            className="w-[170px] sm:w-[190px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
