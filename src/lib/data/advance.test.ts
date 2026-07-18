import { describe, it, expect } from "vitest";
import { computeAdvance } from "./advance";

describe("computeAdvance", () => {
  it("returns 0 when no pct is set", () => {
    expect(computeAdvance(720, null)).toBe(0);
    expect(computeAdvance(720, 0)).toBe(0);
    expect(computeAdvance(720, -5)).toBe(0);
  });

  it("computes a rounded percentage of the amount", () => {
    expect(computeAdvance(720, 20)).toBe(144);
    expect(computeAdvance(850, 30)).toBe(255);
    expect(computeAdvance(999, 33)).toBe(330); // 329.67 → 330
    expect(computeAdvance(1000, 50)).toBe(500);
  });
});
