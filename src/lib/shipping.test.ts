import { describe, it, expect } from "vitest";
import { shippingFeeFor } from "./shipping";

describe("shippingFeeFor", () => {
  const fees = { insideDhakaFee: 80, outsideDhakaFee: 150 };
  it("uses the inside-Dhaka fee for Dhaka", () => expect(shippingFeeFor("Dhaka", fees)).toBe(80));
  it("uses the outside-Dhaka fee otherwise", () => {
    expect(shippingFeeFor("Chattogram", fees)).toBe(150);
    expect(shippingFeeFor("Unknown", fees)).toBe(150);
  });
});
