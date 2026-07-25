import { describe, it, expect } from "vitest";
import { normalizeCode } from "./normalize";
import { computeCouponDiscount, couponKind, couponLabel, couponIsFreeShipping } from "./discount";
import { validateCoupon, type CouponRow } from "./validate";

describe("normalizeCode", () => {
  it("trims and uppercases", () => {
    expect(normalizeCode("  save15 ")).toBe("SAVE15");
    expect(normalizeCode("Eid-2026")).toBe("EID-2026");
  });
});

describe("computeCouponDiscount (percent)", () => {
  const pct = (p: number) => couponKind({ type: "percent", discountPct: p, discountAmount: 0 });
  it("rounds to whole Taka", () => {
    expect(computeCouponDiscount(pct(15), 1000)).toBe(150);
    expect(computeCouponDiscount(pct(10), 999)).toBe(100); // 99.9 → 100
    expect(computeCouponDiscount(pct(20), 720)).toBe(144);
  });
  it("caps at the subtotal and floors non-positive inputs at 0", () => {
    expect(computeCouponDiscount(pct(100), 500)).toBe(500);
    expect(computeCouponDiscount(pct(20), 0)).toBe(0);
    expect(computeCouponDiscount(pct(0), 500)).toBe(0);
  });
});

describe("computeCouponDiscount (fixed)", () => {
  const fixed = (a: number) => couponKind({ type: "fixed", discountPct: 0, discountAmount: a });
  it("takes the flat amount off, capped at the subtotal", () => {
    expect(computeCouponDiscount(fixed(100), 1000)).toBe(100);
    expect(computeCouponDiscount(fixed(500), 300)).toBe(300); // capped
    expect(computeCouponDiscount(fixed(0), 1000)).toBe(0);
  });
});

describe("computeCouponDiscount (free_shipping)", () => {
  it("gives no subtotal discount (delivery is waived elsewhere)", () => {
    const fs = couponKind({ type: "free_shipping", discountPct: 0, discountAmount: 0 });
    expect(computeCouponDiscount(fs, 1000)).toBe(0);
    expect(couponIsFreeShipping({ type: "free_shipping" })).toBe(true);
    expect(couponIsFreeShipping({ type: "percent" })).toBe(false);
  });
});

describe("couponLabel", () => {
  it("formats percent, fixed, and free shipping", () => {
    expect(couponLabel({ type: "percent", discountPct: 15, discountAmount: 0 })).toBe("15% off");
    expect(couponLabel({ type: "fixed", discountPct: 0, discountAmount: 100 })).toBe("৳100 off");
    expect(couponLabel({ type: "free_shipping", discountPct: 0, discountAmount: 0 })).toBe("Free shipping");
  });
});

const base: CouponRow = {
  type: "percent",
  discount_pct: 15,
  discount_amount: 0,
  active: true,
  min_subtotal: 0,
  expires_at: null,
  usage_limit: null,
  used_count: 0,
};
const now = new Date("2026-07-23T00:00:00Z");
const okPercent = { ok: true, kind: { type: "percent", pct: 15 } };

describe("validateCoupon", () => {
  it("happy path returns the percent kind", () => {
    expect(validateCoupon(base, 1000, now)).toEqual(okPercent);
  });
  it("returns a fixed kind for a fixed coupon", () => {
    expect(validateCoupon({ ...base, type: "fixed", discount_pct: 0, discount_amount: 100 }, 1000, now))
      .toEqual({ ok: true, kind: { type: "fixed", amount: 100 } });
  });
  it("returns a free_shipping kind for a free-shipping coupon", () => {
    expect(validateCoupon({ ...base, type: "free_shipping", discount_pct: 0, discount_amount: 0 }, 1000, now))
      .toEqual({ ok: true, kind: { type: "free_shipping" } });
  });
  it("treats a missing type as percent (pre-migration row)", () => {
    expect(validateCoupon({ ...base, type: undefined }, 1000, now)).toEqual(okPercent);
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
    expect(validateCoupon({ ...base, expires_at: "2099-01-01T00:00:00Z" }, 1000, now)).toEqual(okPercent);
  });
  it("below_min (and boundary: exactly min passes)", () => {
    expect(validateCoupon({ ...base, min_subtotal: 1000 }, 999, now)).toEqual({ ok: false, reason: "below_min" });
    expect(validateCoupon({ ...base, min_subtotal: 1000 }, 1000, now)).toEqual(okPercent);
  });
  it("usage_exhausted when used_count reaches the limit", () => {
    expect(validateCoupon({ ...base, usage_limit: 2, used_count: 2 }, 1000, now))
      .toEqual({ ok: false, reason: "usage_exhausted" });
    expect(validateCoupon({ ...base, usage_limit: 2, used_count: 1 }, 1000, now)).toEqual(okPercent);
  });
});
