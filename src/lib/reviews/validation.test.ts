import { describe, it, expect } from "vitest";
import { validateReviewInput, validateQuestion, ratingDistribution } from "./validation";

describe("validateReviewInput", () => {
  it("accepts a valid review, trims, nulls empty title", () => {
    const r = validateReviewInput({ rating: 5, title: "  ", body: "  Great toy  " });
    expect(r).toEqual({ ok: true, value: { rating: 5, title: null, body: "Great toy" } });
  });
  it("keeps a real title", () => {
    const r = validateReviewInput({ rating: 4, title: " Nice ", body: "b" });
    expect(r.ok && r.value.title).toBe("Nice");
  });
  it("rejects out-of-band or non-integer ratings", () => {
    expect(validateReviewInput({ rating: 0, body: "x" }).ok).toBe(false);
    expect(validateReviewInput({ rating: 6, body: "x" }).ok).toBe(false);
    expect(validateReviewInput({ rating: 4.5, body: "x" }).ok).toBe(false);
  });
  it("rejects empty or over-long body", () => {
    expect(validateReviewInput({ rating: 3, body: "   " }).ok).toBe(false);
    expect(validateReviewInput({ rating: 3, body: "x".repeat(2001) }).ok).toBe(false);
  });
  it("rejects an over-long title", () => {
    expect(validateReviewInput({ rating: 3, title: "t".repeat(121), body: "x" }).ok).toBe(false);
  });
});

describe("validateQuestion", () => {
  it("accepts + trims", () => {
    expect(validateQuestion("  Is it BPA free?  ")).toEqual({ ok: true, value: "Is it BPA free?" });
  });
  it("rejects empty and over-long", () => {
    expect(validateQuestion("  ").ok).toBe(false);
    expect(validateQuestion("q".repeat(1001)).ok).toBe(false);
  });
});

describe("ratingDistribution", () => {
  it("counts per star 1..5", () => {
    expect(ratingDistribution([5, 5, 4, 1])).toEqual([1, 0, 0, 1, 2]);
  });
  it("ignores out-of-band values and handles empty", () => {
    expect(ratingDistribution([])).toEqual([0, 0, 0, 0, 0]);
    expect(ratingDistribution([0, 6, 3])).toEqual([0, 0, 1, 0, 0]);
  });
});
