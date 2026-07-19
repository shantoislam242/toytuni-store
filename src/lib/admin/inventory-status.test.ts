import { describe, it, expect } from "vitest";
import { stockStatus, clampAdjust } from "./inventory-status";

describe("stockStatus", () => {
  it("out at 0 or below", () => {
    expect(stockStatus(0, 5)).toBe("out");
    expect(stockStatus(-1, 5)).toBe("out");
  });
  it("low at or below threshold (but > 0)", () => {
    expect(stockStatus(5, 5)).toBe("low");
    expect(stockStatus(3, 5)).toBe("low");
    expect(stockStatus(1, 0)).toBe("in_stock"); // threshold 0 → nothing is 'low'
  });
  it("in_stock above threshold", () => expect(stockStatus(6, 5)).toBe("in_stock"));
});

describe("clampAdjust", () => {
  it("adds a positive delta", () => expect(clampAdjust(5, 3)).toBe(8));
  it("clamps a negative result to 0", () => {
    expect(clampAdjust(1, -3)).toBe(0);
    expect(clampAdjust(5, -5)).toBe(0);
  });
  it("subtracts within range", () => expect(clampAdjust(10, -4)).toBe(6));
});
