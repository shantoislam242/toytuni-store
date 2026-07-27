import { describe, it, expect } from "vitest";
import { pointsFromSpend } from "./loyalty";

describe("pointsFromSpend", () => {
  it("is 0 for no/negative spend", () => {
    expect(pointsFromSpend(0)).toBe(0);
    expect(pointsFromSpend(-500)).toBe(0);
  });
  it("earns 1 point per ৳100, floored", () => {
    expect(pointsFromSpend(1000)).toBe(10);
    expect(pointsFromSpend(1099)).toBe(10); // floor
    expect(pointsFromSpend(999)).toBe(9);
    expect(pointsFromSpend(50)).toBe(0);
  });
});
