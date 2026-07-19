import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlogCategory } from "@/lib/types";

/**
 * Blog grid controls: a "Browse by categories" heading with a search input
 * beside it, and a row of rounded category chips beneath (horizontally
 * scrollable on mobile). Fully controlled by the parent.
 */
export function BlogToolbar({
  categories,
  active,
  onCategoryChange,
  query,
  onQueryChange,
  tags,
  activeTag,
  onTagChange,
}: {
  categories: BlogCategory[];
  active: string;
  onCategoryChange: (slug: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  tags: string[];
  activeTag: string | null;
  onTagChange: (tag: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          Browse by categories
        </h2>

        {/* search */}
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="h-11 w-full rounded-full border border-cream-300 bg-paper pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25"
          />
        </div>
      </div>

      {/* category chips — scroll horizontally on small screens */}
      <div
        role="tablist"
        aria-label="Filter by category"
        className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c) => {
          const selected = active === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onCategoryChange(c.slug)}
              className={cn(
                "flex-none rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-neem bg-neem text-paper"
                  : "border-cream-300 bg-paper text-ink-muted hover:border-neem-soft hover:text-ink",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* tag chips — optional, single-select toggle */}
      {tags.length > 0 ? (
        <div
          role="group"
          aria-label="Filter by tag"
          className="mt-3 flex flex-wrap gap-2"
        >
          {tags.map((t) => {
            const selected = activeTag === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={selected}
                onClick={() => onTagChange(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selected
                    ? "border-neem bg-neem text-paper"
                    : "border-cream-300 bg-paper text-ink-muted hover:border-neem-soft hover:text-ink",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
