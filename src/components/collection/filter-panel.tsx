"use client";

import { Slider } from "@/components/ui/slider";
import { ageTiers } from "@/lib/mock/age-tiers";
import { formatTk } from "@/lib/format";
import type { Filters } from "@/lib/collection";

const BADGES = ["New", "Best Seller", "Limited"] as const;

/** Toggle membership of a value in an array (immutable). */
function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((x) => x !== value)
    : [...arr, value];
}

/**
 * Presentational facet panel (Price + Age + Badge). Holds no state of its
 * own — it renders `filters` and reports edits through `onChange`, so the
 * same component works in the desktop sidebar and the mobile Sheet.
 */
export function FilterPanel({
  filters,
  priceMax,
  onChange,
  showHeading = true,
}: {
  filters: Filters;
  priceMax: number;
  onChange: (next: Filters) => void;
  showHeading?: boolean;
}) {
  const reset = () => onChange({ ages: [], badges: [], maxPrice: priceMax });
  const hasActive =
    filters.ages.length > 0 ||
    filters.badges.length > 0 ||
    filters.maxPrice < priceMax;

  return (
    <div className="space-y-6">
      {showHeading ? (
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Filters</h2>
          <button
            type="button"
            onClick={reset}
            disabled={!hasActive}
            className="rounded-sm text-sm font-medium text-neem-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem disabled:cursor-not-allowed disabled:text-ink-soft disabled:no-underline"
          >
            Reset
          </button>
        </div>
      ) : null}

      {/* Price */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink">Price</legend>
        <Slider
          min={0}
          max={priceMax}
          step={10}
          value={[filters.maxPrice]}
          onValueChange={([v]) => onChange({ ...filters, maxPrice: v })}
          aria-label="Maximum price"
        />
        <p className="text-sm text-ink-muted">
          Up to <span className="font-medium text-ink">{formatTk(filters.maxPrice)}</span>
        </p>
      </fieldset>

      {/* Age */}
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Age</legend>
        {ageTiers.map((t) => (
          <label
            key={t.slug}
            className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted"
          >
            <input
              type="checkbox"
              checked={filters.ages.includes(t.slug)}
              onChange={() =>
                onChange({ ...filters, ages: toggle(filters.ages, t.slug) })
              }
              className="size-4 accent-neem"
            />
            {t.labelBn}
          </label>
        ))}
      </fieldset>

      {/* Badge */}
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Badge</legend>
        {BADGES.map((b) => (
          <label
            key={b}
            className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted"
          >
            <input
              type="checkbox"
              checked={filters.badges.includes(b)}
              onChange={() =>
                onChange({ ...filters, badges: toggle(filters.badges, b) })
              }
              className="size-4 accent-neem"
            />
            {b}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
