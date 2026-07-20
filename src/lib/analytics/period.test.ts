import { describe, it, expect } from "vitest";
import { resolvePeriod } from "./period";

const now = new Date("2026-07-20T12:00:00.000Z");

describe("resolvePeriod", () => {
  it("defaults to 30d (daily) when nothing is given", () => {
    const p = resolvePeriod({}, now);
    expect(p.key).toBe("30d");
    expect(p.bucket).toBe("day");
    expect(p.to.getTime()).toBe(now.getTime());
    expect(Math.round((p.to.getTime() - p.from.getTime()) / 864e5)).toBe(30);
  });
  it("7d and 90d are daily", () => {
    expect(resolvePeriod({ period: "7d" }, now).bucket).toBe("day");
    expect(Math.round((now.getTime() - resolvePeriod({ period: "7d" }, now).from.getTime()) / 864e5)).toBe(7);
    expect(resolvePeriod({ period: "90d" }, now).bucket).toBe("day");
  });
  it("12mo is month-aligned + monthly bucket", () => {
    const p = resolvePeriod({ period: "12mo" }, now);
    expect(p.bucket).toBe("month");
    // from = start of the month 11 months back (Aug 2025)
    expect(p.from.toISOString()).toBe("2025-08-01T00:00:00.000Z");
  });
  it("garbage period → 30d default", () => {
    expect(resolvePeriod({ period: "bogus" }, now).key).toBe("30d");
  });
  it("custom parses from/to (daily when <= 90d)", () => {
    const p = resolvePeriod({ period: "custom", from: "2026-07-01", to: "2026-07-15" }, now);
    expect(p.key).toBe("custom");
    expect(p.from.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(p.bucket).toBe("day");
  });
  it("custom with a long span → monthly bucket", () => {
    const p = resolvePeriod({ period: "custom", from: "2025-01-01", to: "2026-01-01" }, now);
    expect(p.bucket).toBe("month");
  });
  it("custom with from>to is normalized (swapped)", () => {
    const p = resolvePeriod({ period: "custom", from: "2026-07-15", to: "2026-07-01" }, now);
    expect(p.from.getTime()).toBeLessThan(p.to.getTime());
  });
  it("custom with invalid dates → 30d default", () => {
    expect(resolvePeriod({ period: "custom", from: "nope", to: "nah" }, now).key).toBe("30d");
  });
  it("clamps an absurdly long custom range to <= ~2 years", () => {
    const p = resolvePeriod({ period: "custom", from: "2000-01-01", to: "2026-07-20" }, now);
    const years = (p.to.getTime() - p.from.getTime()) / (365 * 864e5);
    expect(years).toBeLessThanOrEqual(2.01);
    expect(p.bucket).toBe("month");
  });
});
