"use client";

import { X } from "lucide-react";
import { ageTierBySlug } from "@/lib/mock/age-tiers";
import { formatTk } from "@/lib/format";
import type { Filters } from "@/lib/collection";

type Chip = { key: string; label: string; onRemove: () => void };

/**
 * Removable pills for the currently applied filters, plus "Clear all".
 * Renders nothing when no facet is active.
 */
export function ActiveFilters({
  filters,
  priceMax,
  onChange,
}: {
  filters: Filters;
  priceMax: number;
  onChange: (next: Filters) => void;
}) {
  const chips: Chip[] = [];

  filters.ages.forEach((slug) =>
    chips.push({
      key: `age-${slug}`,
      label: ageTierBySlug(slug)?.labelBn ?? slug,
      onRemove: () =>
        onChange({ ...filters, ages: filters.ages.filter((a) => a !== slug) }),
    }),
  );

  filters.badges.forEach((badge) =>
    chips.push({
      key: `badge-${badge}`,
      label: badge,
      onRemove: () =>
        onChange({
          ...filters,
          badges: filters.badges.filter((b) => b !== badge),
        }),
    }),
  );

  if (filters.maxPrice < priceMax) {
    chips.push({
      key: "price",
      label: `Up to ${formatTk(filters.maxPrice)}`,
      onRemove: () => onChange({ ...filters, maxPrice: priceMax }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1 rounded-full border border-cream-300 bg-cream-100 py-1 pr-1 pl-3 text-xs text-ink"
        >
          {c.label}
          <button
            type="button"
            onClick={c.onRemove}
            aria-label={`Remove ${c.label}`}
            className="rounded-full p-0.5 text-ink-soft hover:bg-cream-300 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neem"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => onChange({ ages: [], badges: [], maxPrice: priceMax })}
        className="rounded-sm text-xs font-medium text-neem-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem"
      >
        Clear all
      </button>
    </div>
  );
}
