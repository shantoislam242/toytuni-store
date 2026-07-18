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
