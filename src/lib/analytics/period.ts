export type PeriodKey = "7d" | "30d" | "90d" | "12mo" | "custom";
export type Period = { key: PeriodKey; from: Date; to: Date; bucket: "day" | "month" };

const DAY = 864e5;
const MAX_CUSTOM_MS = 2 * 365 * DAY; // clamp custom ranges to ~2 years
const PRESET_DAYS: Record<"7d" | "30d" | "90d", number> = { "7d": 7, "30d": 30, "90d": 90 };

const bucketFor = (from: Date, to: Date): "day" | "month" =>
  to.getTime() - from.getTime() <= 90 * DAY ? "day" : "month";

function daysPreset(key: "7d" | "30d" | "90d", now: Date): Period {
  const from = new Date(now.getTime() - PRESET_DAYS[key] * DAY);
  return { key, from, to: now, bucket: "day" };
}

function parseDay(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolvePeriod(
  params: { period?: string; from?: string; to?: string },
  now: Date,
): Period {
  const key = params.period;
  if (key === "7d" || key === "30d" || key === "90d") return daysPreset(key, now);
  if (key === "12mo") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    return { key: "12mo", from, to: now, bucket: "month" };
  }
  if (key === "custom") {
    let from = parseDay(params.from);
    let to = parseDay(params.to);
    if (!from || !to) return daysPreset("30d", now);
    if (from.getTime() > to.getTime()) [from, to] = [to, from];
    if (to.getTime() - from.getTime() > MAX_CUSTOM_MS) from = new Date(to.getTime() - MAX_CUSTOM_MS);
    return { key: "custom", from, to, bucket: bucketFor(from, to) };
  }
  return daysPreset("30d", now);
}
