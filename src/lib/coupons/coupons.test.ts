import { describe, it, expect } from "vitest";
import { normalizeCode } from "./normalize";
import { computeCouponDiscount } from "./discount";
import { validateCoupon, type CouponRow } from "./validate";

describe("normalizeCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeCode("  save15 ")).toBe("SAVE15");
    expect(normalizeCode("Eid-2026")).toBe("EID-2026");
  });
});

describe("computeCouponDiscount", () => {
  it("rounds to whole Taka", () => {
    expect(computeCouponDiscount(1000, 15)).toBe(150);
    expect(computeCouponDiscount(999, 10)).toBe(100); // 99.9 → 100
    expect(computeCouponDiscount(720, 20)).toBe(144);
  });
  it("caps at the subtotal and floors non-positive inputs at 0", () => {
    expect(computeCouponDiscount(500, 100)).toBe(500);
    expect(computeCouponDiscount(0, 20)).toBe(0);
    expect(computeCouponDiscount(500, 0)).toBe(0);
  });
});

const base: CouponRow = {
  discount_pct: 15,
  active: true,
  min_subtotal: 0,
  expires_at: null,
  usage_limit: null,
  used_count: 0,
};
const now = new Date("2026-07-23T00:00:00Z");

describe("validateCoupon", () => {
  it("happy path returns the pct", () => {
    expect(validateCoupon(base, 1000, now)).toEqual({ ok: true, discountPct: 15 });
  });
  it("not_found for a null coupon", () => {
    expect(validateCoupon(null, 1000, now)).toEqual({ ok: false, reason: "not_found" });
  });
  it("inactive", () => {
    expect(validateCoupon({ ...base, active: false }, 1000, now)).toEqual({ ok: false, reason: "inactive" });
  });
  it("expired (past) and boundary (exactly now = expired)", () => {
    expect(validateCoupon({ ...base, expires_at: "2020-01-01T00:00:00Z" }, 1000, now))
      .toEqual({ ok: false, reason: "expired" });
    expect(validateCoupon({ ...base, expires_at: "2026-07-23T00:00:00Z" }, 1000, now))
      .toEqual({ ok: false, reason: "expired" });
  });
  it("future expiry passes", () => {
    expect(validateCoupon({ ...base, expires_at: "2099-01-01T00:00:00Z" }, 1000, now))
      .toEqual({ ok: true, discountPct: 15 });
  });
  it("below_min (and boundary: exactly min passes)", () => {
    expect(validateCoupon({ ...base, min_subtotal: 1000 }, 999, now)).toEqual({ ok: false, reason: "below_min" });
    expect(validateCoupon({ ...base, min_subtotal: 1000 }, 1000, now)).toEqual({ ok: true, discountPct: 15 });
  });
  it("usage_exhausted when used_count reaches the limit", () => {
    expect(validateCoupon({ ...base, usage_limit: 2, used_count: 2 }, 1000, now))
      .toEqual({ ok: false, reason: "usage_exhausted" });
    expect(validateCoupon({ ...base, usage_limit: 2, used_count: 1 }, 1000, now))
      .toEqual({ ok: true, discountPct: 15 });
  });
});
