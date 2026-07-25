import { describe, it, expect } from "vitest";
import { shippingFeeFor, priceDelivery, zoneForDistrict, isInsideDhaka, EXPRESS_FEE, type ShippingConfig } from "./shipping";

const cfg: ShippingConfig = {
  insideDhakaFee: 80,
  outsideDhakaFee: 150,
  freeShippingThreshold: 2000,
  insideDistricts: ["Dhaka", "Narayanganj"],
};

describe("zoneForDistrict / isInsideDhaka", () => {
  it("classifies by the admin inside-district list (not hardcoded)", () => {
    expect(zoneForDistrict("Dhaka", cfg.insideDistricts).id).toBe("inside_dhaka");
    expect(zoneForDistrict("Narayanganj", cfg.insideDistricts).id).toBe("inside_dhaka");
    expect(zoneForDistrict("Chattogram", cfg.insideDistricts).id).toBe("outside_dhaka");
    expect(isInsideDhaka("Narayanganj", cfg.insideDistricts)).toBe(true);
    expect(isInsideDhaka("Sylhet", cfg.insideDistricts)).toBe(false);
  });
  it("trims and treats unlisted/unknown as outside", () => {
    expect(zoneForDistrict("  Dhaka  ", cfg.insideDistricts).id).toBe("inside_dhaka");
    expect(zoneForDistrict("Nowhere", cfg.insideDistricts).id).toBe("outside_dhaka");
  });
});

describe("shippingFeeFor", () => {
  it("inside-Dhaka fee for a listed district", () => {
    expect(shippingFeeFor("Dhaka", cfg)).toBe(80);
    expect(shippingFeeFor("Narayanganj", cfg)).toBe(80);
  });
  it("outside-Dhaka fee otherwise", () => {
    expect(shippingFeeFor("Chattogram", cfg)).toBe(150);
    expect(shippingFeeFor("Unknown", cfg)).toBe(150);
  });
});

describe("priceDelivery", () => {
  it("standard, below threshold → zone fee", () => {
    expect(priceDelivery("standard", 1000, "Dhaka", cfg)).toBe(80);
    expect(priceDelivery("standard", 1000, "Narayanganj", cfg)).toBe(80);
    expect(priceDelivery("standard", 1000, "Chattogram", cfg)).toBe(150);
  });
  it("free selected, subtotal >= threshold → 0", () => {
    expect(priceDelivery("free", 2000, "Dhaka", cfg)).toBe(0);
    expect(priceDelivery("free", 2000, "Chattogram", cfg)).toBe(0);
  });
  it("free selected, subtotal < threshold → falls back to standard", () => {
    expect(priceDelivery("free", 1000, "Dhaka", cfg)).toBe(80);
    expect(priceDelivery("free", 1000, "Chattogram", cfg)).toBe(150);
  });
  it("express, inside Dhaka (listed) → EXPRESS_FEE", () => {
    expect(priceDelivery("express", 1000, "Narayanganj", cfg)).toBe(EXPRESS_FEE);
    expect(EXPRESS_FEE).toBe(120);
  });
  it("express, outside Dhaka → falls back to standard (outside fee)", () => {
    expect(priceDelivery("express", 1000, "Chattogram", cfg)).toBe(150);
  });
});
