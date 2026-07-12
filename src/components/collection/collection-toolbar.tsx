"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortKey } from "@/lib/collection";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

// Suggested page sizes; the last one renders as "100+" and applies 100.
const PAGE_SIZE_SUGGESTIONS = [10, 20, 50, 100] as const;

const VIEW_OPTIONS: { value: ViewMode; label: string; icon: typeof List }[] = [
  { value: "list", label: "List view", icon: List },
  { value: "grid", label: "Grid view", icon: LayoutGrid },
];

/**
 * Items-per-page control: a numeric input the user can type into freely, plus a
 * dropdown of quick suggestions (10 / 20 / 50 / 100+). Typed values commit on
 * Enter or blur; invalid input reverts to the current size.
 */
function PageSizeInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLDivElement>(null);

  // Keep the field in sync when the size changes elsewhere.
  useEffect(() => setDraft(String(value)), [value]);

  // Close the suggestion list on an outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) {
      onChange(Math.min(n, 999));
    } else {
      setDraft(String(value)); // revert invalid input
    }
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex h-10 w-[92px] items-center rounded-lg border border-cream-300 bg-paper focus-within:border-neem focus-within:ring-2 focus-within:ring-neem/25">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Items per page"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d+]/g, ""))}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(draft);
              setOpen(false);
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setDraft(String(value));
              setOpen(false);
            }
          }}
          onBlur={() => commit(draft)}
          className="h-full w-full min-w-0 rounded-l-lg bg-transparent px-3 text-sm text-ink outline-none"
        />
        <button
          type="button"
          aria-label="Page-size suggestions"
          onClick={() => setOpen((o) => !o)}
          className="flex size-8 flex-none items-center justify-center text-ink-soft transition-colors hover:text-ink"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-1 min-w-full overflow-hidden rounded-lg border border-cream-300 bg-paper py-1 shadow-lg shadow-ink/10">
          {PAGE_SIZE_SUGGESTIONS.map((n, i) => {
            const isLast = i === PAGE_SIZE_SUGGESTIONS.length - 1;
            return (
              <button
                key={n}
                type="button"
                // preventDefault keeps the input from blurring before the click
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(n);
                  setDraft(String(n));
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-neem hover:text-paper",
                  value === n ? "font-semibold text-neem-deep" : "text-ink",
                )}
              >
                {isLast ? `${n}+` : n}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Presentational: live result count, a mobile "Filter" trigger, a "View as"
// list/grid toggle, an items-per-page picker, and the sort dropdown. The
// desktop filter panel lives in a sidebar, not here.
export function CollectionToolbar({
  count,
  sort,
  onSortChange,
  onOpenFilters,
  activeFilterCount = 0,
  view,
  onViewChange,
  pageSize,
  onPageSizeChange,
}: {
  count: number;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  /** Grid vs list layout. */
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
  /** Products shown before/added per "Load more". */
  pageSize: number;
  onPageSizeChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-cream-300 pb-3">
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

      {/* View as — list vs grid layout. */}
      <div className="flex items-center gap-2">
        <span className="hidden text-xs font-semibold uppercase tracking-wide text-ink-soft sm:inline">
          View as
        </span>
        <div className="flex items-center gap-1">
          {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onViewChange(value)}
              aria-label={label}
              aria-pressed={view === value}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border transition-colors",
                view === value
                  ? "border-neem bg-neem/10 text-neem-deep"
                  : "border-cream-300 text-ink-soft hover:border-neem-soft hover:text-ink",
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* count + items-per-page + sort grouped on the right */}
      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        <p className="hidden text-sm text-ink-muted sm:block">
          <span className="font-medium text-ink">{count}</span>{" "}
          {count === 1 ? "product" : "products"}
        </p>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm text-ink-muted">Show</span>
          <PageSizeInput value={pageSize} onChange={onPageSizeChange} />
        </div>

        <label htmlFor="sort" className="hidden text-sm text-ink-muted sm:inline">
          Sort by
        </label>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger
            id="sort"
            aria-label="Sort products"
            className="h-10 w-[150px] rounded-lg border-cream-300 bg-paper px-3.5 text-sm text-ink sm:w-[200px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="end"
            sideOffset={8}
            arrow
            className="min-w-(--radix-select-trigger-width) bg-paper"
          >
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
