import { describe, it, expect } from "vitest";
import { pointsFromSpend } from "./loyalty";

describe("pointsFromSpend", () => {
  it("is 0 for no/negative spend", () => {
    expect(pointsFromSpend(0)).toBe(0);
    expect(pointsFromSpend(-500)).toBe(0);
  });
  it("earns 1 point per ৳10, floored", () => {
    expect(pointsFromSpend(1000)).toBe(100);
    expect(pointsFromSpend(720)).toBe(72);
    expect(pointsFromSpend(725)).toBe(72); // floor
    expect(pointsFromSpend(9)).toBe(0);
  });
});
