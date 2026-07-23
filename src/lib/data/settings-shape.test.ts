import { describe, it, expect } from "vitest";
import { rowToSettings, DEFAULT_SETTINGS } from "./settings-shape";

describe("rowToSettings", () => {
  it("returns defaults for null/garbage", () => {
    expect(rowToSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(rowToSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(rowToSettings({ shipping: 5 })).toEqual(DEFAULT_SETTINGS);
  });

  it("merges valid fields over defaults, filling the rest", () => {
    const s = rowToSettings({
      shipping: { insideDhakaFee: 100, outsideDhakaFee: 200, freeShippingThreshold: 3000 },
      codFee: 30,
      contact: { phone: "01711", whatsapp: "wa", email: "a@b.com", address: "Dhaka" },
      brand: { tagline: "T", description: "D" },
    });
    expect(s.shipping.insideDhakaFee).toBe(100);
    expect(s.codFee).toBe(30);
    expect(s.contact.email).toBe("a@b.com");
    expect(s.brand.tagline).toBe("T");
  });

  it("fills partial/invalid subfields from defaults", () => {
    const s = rowToSettings({ shipping: { insideDhakaFee: -5, outsideDhakaFee: 200 }, codFee: "x" });
    expect(s.shipping.insideDhakaFee).toBe(DEFAULT_SETTINGS.shipping.insideDhakaFee); // -5 invalid → default
    expect(s.shipping.outsideDhakaFee).toBe(200);
    expect(s.shipping.freeShippingThreshold).toBe(DEFAULT_SETTINGS.shipping.freeShippingThreshold);
    expect(s.codFee).toBe(DEFAULT_SETTINGS.codFee); // "x" invalid → default
  });
});

describe("customerTiers", () => {
  it("defaults present", () => {
    expect(DEFAULT_SETTINGS.customerTiers).toEqual({ silver: 3000, gold: 10000 });
    expect(rowToSettings({}).customerTiers).toEqual({ silver: 3000, gold: 10000 });
  });
  it("reads valid stored thresholds", () => {
    expect(rowToSettings({ customerTiers: { silver: 5000, gold: 20000 } }).customerTiers).toEqual({ silver: 5000, gold: 20000 });
  });
  it("falls back to defaults when gold < silver (inverted)", () => {
    expect(rowToSettings({ customerTiers: { silver: 9000, gold: 1000 } }).customerTiers).toEqual({ silver: 3000, gold: 10000 });
  });
  it("coerces invalid/negative to defaults per field", () => {
    expect(rowToSettings({ customerTiers: { silver: -5, gold: 20000 } }).customerTiers).toEqual({ silver: 3000, gold: 20000 });
  });
});

describe("preorder policy", () => {
  it("defaults present", () => {
    expect(DEFAULT_SETTINGS.preorder).toEqual({ enabled: true, thresholdQty: 3, leadDays: 7, advancePct: 20 });
    expect(rowToSettings({}).preorder).toEqual({ enabled: true, thresholdQty: 3, leadDays: 7, advancePct: 20 });
  });
  it("reads valid stored values", () => {
    expect(rowToSettings({ preorder: { enabled: false, thresholdQty: 5, leadDays: 10, advancePct: 30 } }).preorder)
      .toEqual({ enabled: false, thresholdQty: 5, leadDays: 10, advancePct: 30 });
  });
  it("coerces invalid subfields to defaults", () => {
    expect(rowToSettings({ preorder: { enabled: "yes", thresholdQty: -1, leadDays: "x", advancePct: 25 } }).preorder)
      .toEqual({ enabled: true, thresholdQty: 3, leadDays: 7, advancePct: 25 });
  });
  it("clamps advance pct to 100", () => {
    expect(rowToSettings({ preorder: { advancePct: 250 } }).preorder.advancePct).toBe(100);
  });
});
