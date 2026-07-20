export type Trend = { pct: number | null; direction: "up" | "down" | "neutral" };
export type SeriesPoint = { label: string; orders: number; revenue: number };

export function computeTrend(current: number, previous: number): Trend {
  if (previous === 0) {
    return current > 0 ? { pct: null, direction: "up" } : { pct: 0, direction: "neutral" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const direction = current > previous ? "up" : current < previous ? "down" : "neutral";
  return { pct, direction };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Contiguous, 0-filled, chronological series over [from, to) by month or day.
 *  `rows` are keyed by their bucket start (ISO); missing buckets become zeros. */
export function fillBuckets(
  rows: { bucket: string; orders: number; revenue: number }[],
  from: Date, to: Date, bucket: "month" | "day",
): SeriesPoint[] {
  // Index the rows by a UTC period key.
  const key = (d: Date) =>
    bucket === "month"
      ? `${d.getUTCFullYear()}-${d.getUTCMonth()}`
      : `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  const byKey = new Map<string, { orders: number; revenue: number }>();
  for (const r of rows) {
    const d = new Date(r.bucket);
    byKey.set(key(d), { orders: r.orders, revenue: r.revenue });
  }
  const out: SeriesPoint[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), bucket === "month" ? 1 : from.getUTCDate()));
  while (cur < to) {
    const hit = byKey.get(key(cur)) ?? { orders: 0, revenue: 0 };
    const label = bucket === "month"
      ? MONTHS[cur.getUTCMonth()]
      : `${cur.getUTCDate()} ${MONTHS[cur.getUTCMonth()]}`;
    out.push({ label, orders: hit.orders, revenue: hit.revenue });
    if (bucket === "month") cur.setUTCMonth(cur.getUTCMonth() + 1);
    else cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
