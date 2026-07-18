import { describe, it, expect } from "vitest";
import { shippingFeeFor, priceDelivery, EXPRESS_FEE } from "./shipping";

describe("shippingFeeFor", () => {
  const fees = { insideDhakaFee: 80, outsideDhakaFee: 150 };
  it("uses the inside-Dhaka fee for Dhaka", () => expect(shippingFeeFor("Dhaka", fees)).toBe(80));
  it("uses the outside-Dhaka fee otherwise", () => {
    expect(shippingFeeFor("Chattogram", fees)).toBe(150);
    expect(shippingFeeFor("Unknown", fees)).toBe(150);
  });
});

describe("priceDelivery", () => {
  const fees = { insideDhakaFee: 80, outsideDhakaFee: 150, freeShippingThreshold: 2000 };

  it("standard, below threshold, Dhaka → insideDhakaFee", () => {
    expect(priceDelivery("standard", 1000, "Dhaka", fees)).toBe(80);
  });

  it("standard, below threshold, other district → outsideDhakaFee", () => {
    expect(priceDelivery("standard", 1000, "Chattogram", fees)).toBe(150);
  });

  it("free selected, subtotal >= threshold → 0", () => {
    expect(priceDelivery("free", 2000, "Dhaka", fees)).toBe(0);
    expect(priceDelivery("free", 2000, "Chattogram", fees)).toBe(0);
  });

  it("free selected, subtotal < threshold → falls back to standard fee", () => {
    expect(priceDelivery("free", 1000, "Dhaka", fees)).toBe(80);
    expect(priceDelivery("free", 1000, "Chattogram", fees)).toBe(150);
  });

  it("express selected, inside Dhaka → EXPRESS_FEE", () => {
    expect(priceDelivery("express", 1000, "Dhaka", fees)).toBe(EXPRESS_FEE);
    expect(EXPRESS_FEE).toBe(120);
  });

  it("express selected, outside Dhaka → falls back to standard (outside fee)", () => {
    expect(priceDelivery("express", 1000, "Chattogram", fees)).toBe(150);
  });
});
