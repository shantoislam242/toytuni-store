"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTk } from "@/lib/format";
import type { SeriesPoint } from "@/lib/analytics/transforms";

const ORDERS_COLOR = "var(--neem)";
const REVENUE_COLOR = "var(--ink)";

function formatTooltipValue(value: unknown, name: unknown): [string, string] {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  const label = String(name);
  if (label === "Revenue") return [formatTk(num), label];
  return [Math.round(num).toLocaleString("en-US"), label];
}

/**
 * Dual-axis orders/revenue chart (Analytics AN-1, Task 3). Orders render as
 * a bar against the left axis, revenue as a line against the right axis.
 * Client-only: recharts is not server-renderable, so this file is the sole
 * "use client" boundary for the chart — `KpiCard` stays dependency-light.
 */
export function RevenueOrdersChart({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-cream-300 bg-cream-100 text-sm text-ink-muted">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--cream-300)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--cream-300)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="orders"
          orientation="left"
          allowDecimals={false}
          tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--cream-300)" }}
          tickLine={false}
        />
        <YAxis
          yAxisId="revenue"
          orientation="right"
          tickFormatter={(value: number) => formatTk(value)}
          tick={{ fill: "var(--ink-muted)", fontSize: 12 }}
          axisLine={{ stroke: "var(--cream-300)" }}
          tickLine={false}
        />
        <Tooltip
          formatter={formatTooltipValue}
          contentStyle={{
            backgroundColor: "var(--cream-50)",
            border: "1px solid var(--cream-300)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--ink)" }}
        />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-ink-muted">{value}</span>
          )}
        />
        <Bar
          yAxisId="orders"
          dataKey="orders"
          name="Orders"
          fill={ORDERS_COLOR}
          radius={[4, 4, 0, 0]}
          barSize={24}
        />
        <Line
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={REVENUE_COLOR}
          strokeWidth={2}
          dot={{ r: 3, fill: REVENUE_COLOR }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
