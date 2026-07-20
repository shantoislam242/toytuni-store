import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentSlice } from "@/lib/admin/analytics";

/** Mirrors `paymentBadgeClass` in `orders-table.tsx` so payment-status colour
 *  stays consistent across the order list and this analytics breakdown. */
const PAYMENT_BAR_COLORS: Record<string, string> = {
  paid: "bg-emerald-500",
  pending: "bg-amber-500",
  refunded: "bg-slate-400",
};
const FALLBACK_BAR_COLOR = "bg-cream-300";

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

/**
 * Payment-status breakdown (Analytics AN-2, Task 3). Payment slices carry
 * amounts, not just counts, so this renders a compact table with a
 * proportional bar per row instead of a donut. Pure presentational — no
 * client hooks, so no "use client" (mirrors `KpiCard`'s server-safe pattern).
 */
export function PaymentBreakdown({ data }: { data: PaymentSlice[] }) {
  if (data.length === 0 || data.every((slice) => slice.count === 0)) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-cream-300 bg-cream-100 text-sm text-ink-muted">
        No data yet
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((slice) => slice.amount));

  return (
    <div className="flex flex-col gap-4">
      {data.map((slice) => {
        const widthPct = maxAmount > 0 ? (slice.amount / maxAmount) * 100 : 0;
        return (
          <div key={slice.paymentStatus} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-ink">{capitalize(slice.paymentStatus)}</span>
              <span className="text-ink-muted">
                {slice.count.toLocaleString("en-US")} · {formatTk(slice.amount)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
              <div
                className={cn(
                  "h-full rounded-full",
                  PAYMENT_BAR_COLORS[slice.paymentStatus] ?? FALLBACK_BAR_COLOR,
                )}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
