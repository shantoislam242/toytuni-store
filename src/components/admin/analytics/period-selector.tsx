"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PeriodKey } from "@/lib/analytics/period";

const PRESETS: { key: "7d" | "30d" | "90d" | "12mo"; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "12mo", label: "12M" },
];

const PILL_BASE =
  "inline-flex h-8 items-center justify-center rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const PILL_ACTIVE = "bg-ink text-cream-50";
const PILL_INACTIVE = "bg-cream-100 text-ink-muted hover:bg-cream-200 hover:text-ink";

/**
 * URL-driven period selector for the /admin/analytics page (Analytics AN-2,
 * Task 4). Purely a navigation control: it holds no data-fetching state of
 * its own — every click pushes a new `?period=...` search string and lets
 * the server page (reading `resolvePeriod` from `@/lib/analytics/period`)
 * re-render for the new range.
 */
export function PeriodSelector({
  active,
  from,
  to,
}: {
  active: PeriodKey;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  const goToPreset = (key: (typeof PRESETS)[number]["key"]) => {
    router.push(`${pathname}?period=${key}`);
  };

  const canApply = customFrom !== "" && customTo !== "";

  const applyCustom = () => {
    if (!canApply) return;
    router.push(`${pathname}?period=custom&from=${customFrom}&to=${customTo}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Select a preset date range" className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const isActive = active === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => goToPreset(preset.key)}
              className={cn(PILL_BASE, isActive ? PILL_ACTIVE : PILL_INACTIVE)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-full border px-2 py-1",
          active === "custom" ? "border-ink bg-cream-100" : "border-cream-300 bg-transparent",
        )}
      >
        <CalendarRange className="ml-1 size-4 text-ink-muted" aria-hidden="true" />
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="sr-only">Custom range start date</span>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            max={customTo || undefined}
            className="h-7 w-[9.5rem] rounded-full border-cream-300 bg-white px-2.5 text-xs"
          />
        </label>
        <span className="text-ink-soft" aria-hidden="true">
          –
        </span>
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="sr-only">Custom range end date</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            min={customFrom || undefined}
            className="h-7 w-[9.5rem] rounded-full border-cream-300 bg-white px-2.5 text-xs"
          />
        </label>
        <Button size="sm" className="h-7 rounded-full" disabled={!canApply} onClick={applyCustom}>
          Apply
        </Button>
      </div>
    </div>
  );
}
