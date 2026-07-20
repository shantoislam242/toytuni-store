import { describe, it, expect } from "vitest";
import { computeTrend, fillBuckets } from "./transforms";

describe("computeTrend", () => {
  it("up when current exceeds previous", () => {
    expect(computeTrend(150, 100)).toEqual({ pct: 50, direction: "up" });
  });
  it("down when current is below previous", () => {
    expect(computeTrend(80, 100)).toEqual({ pct: -20, direction: "down" });
  });
  it("neutral when equal", () => {
    expect(computeTrend(100, 100)).toEqual({ pct: 0, direction: "neutral" });
  });
  it("null pct + up when previous is zero and current positive", () => {
    expect(computeTrend(50, 0)).toEqual({ pct: null, direction: "up" });
  });
  it("neutral when both zero", () => {
    expect(computeTrend(0, 0)).toEqual({ pct: 0, direction: "neutral" });
  });
  it("rounds to a whole percent", () => {
    expect(computeTrend(133, 100).pct).toBe(33);
  });
});

describe("fillBuckets", () => {
  it("0-fills missing months across the range, chronological", () => {
    const rows = [{ bucket: "2026-03-01T00:00:00.000Z", orders: 2, revenue: 500 }];
    const out = fillBuckets(rows, new Date("2026-01-01T00:00:00Z"), new Date("2026-04-01T00:00:00Z"), "month");
    expect(out).toHaveLength(3); // Jan, Feb, Mar
    expect(out.map((p) => p.orders)).toEqual([0, 0, 2]);
    expect(out[2].revenue).toBe(500);
  });
  it("empty input → full 0-filled range", () => {
    const out = fillBuckets([], new Date("2026-01-01T00:00:00Z"), new Date("2026-03-01T00:00:00Z"), "month");
    expect(out).toHaveLength(2);
    expect(out.every((p) => p.orders === 0 && p.revenue === 0)).toBe(true);
  });
  it("day bucketing", () => {
    const out = fillBuckets([], new Date("2026-01-01T00:00:00Z"), new Date("2026-01-04T00:00:00Z"), "day");
    expect(out).toHaveLength(3);
  });
});
