import { describe, it, expect } from "vitest";
import { customerTier } from "./customer-tier";
const T = { silver: 3000, gold: 10000 };
describe("customerTier", () => {
  it("bronze below silver", () => { expect(customerTier(0, T)).toBe("bronze"); expect(customerTier(2999, T)).toBe("bronze"); });
  it("silver at/above silver, below gold", () => { expect(customerTier(3000, T)).toBe("silver"); expect(customerTier(9999, T)).toBe("silver"); });
  it("gold at/above gold", () => { expect(customerTier(10000, T)).toBe("gold"); expect(customerTier(50000, T)).toBe("gold"); });
  it("honors custom thresholds (not hardcoded)", () => {
    expect(customerTier(600, { silver: 500, gold: 1000 })).toBe("silver");
    expect(customerTier(1000, { silver: 500, gold: 1000 })).toBe("gold");
  });
});
