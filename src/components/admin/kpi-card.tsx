import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Trend } from "@/lib/analytics/transforms";

const TREND_STYLES: Record<Trend["direction"], string> = {
  up: "bg-neem-soft/30 text-neem-deep",
  down: "bg-destructive/10 text-destructive",
  neutral: "bg-cream-200 text-ink-muted",
};

const TREND_ICONS: Record<Trend["direction"], LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

function trendLabel(trend: Trend): string {
  if (trend.pct === null) return "New";
  return `${trend.pct > 0 ? "+" : ""}${trend.pct}%`;
}

/**
 * Presentational KPI stat card matching the current admin dashboard's Card
 * styling (Analytics AN-1, Task 3). Server-safe: no "use client", no
 * recharts. Renders an optional month-over-month trend badge next to the
 * icon/label row.
 */
export function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend?: Trend;
  icon?: LucideIcon;
}) {
  const TrendIcon = trend ? TREND_ICONS[trend.direction] : null;

  return (
    <Card className="border-cream-300">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-ink-muted">
            {Icon && <Icon className="size-4" />}
            <span className="text-sm">{label}</span>
          </div>
          {trend && TrendIcon && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                TREND_STYLES[trend.direction],
              )}
            >
              <TrendIcon className="size-3" />
              {trendLabel(trend)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-bold text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
