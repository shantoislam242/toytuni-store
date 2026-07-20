"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { StatusSlice } from "@/lib/admin/analytics";

/** Mirrors the order-status badge palette in `orders-table.tsx` for
 *  pending/delivered/cancelled; confirmed/shipped get distinct hues here
 *  (blue vs indigo) since a donut needs every slice to read apart, whereas
 *  the badges can share dusty-blue for both. */
const STATUS_COLORS: Record<string, string> = {
  pending: "var(--mustard)",
  confirmed: "var(--dusty-blue)",
  shipped: "#6366f1",
  delivered: "var(--neem-deep)",
  cancelled: "var(--danger)",
};
const FALLBACK_COLOR = "var(--ink-muted)";

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function formatTooltipValue(value: unknown, _name: unknown, item: { payload?: StatusSlice }): [string, string] {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  const label = capitalize(item.payload?.status ?? "");
  return [num.toLocaleString("en-US"), label];
}

/**
 * Order-status donut (Analytics AN-2, Task 3). Client-only: recharts is not
 * server-renderable, so this file — like `RevenueOrdersChart` — is the sole
 * "use client" boundary for this chart.
 */
export function StatusDonut({ data }: { data: StatusSlice[] }) {
  const total = data.reduce((sum, slice) => sum + slice.count, 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-cream-300 bg-cream-100 text-sm text-ink-muted">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((slice) => (
            <Cell key={slice.status} fill={STATUS_COLORS[slice.status] ?? FALLBACK_COLOR} />
          ))}
        </Pie>
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
            <span className="text-xs text-ink-muted">{capitalize(value)}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
