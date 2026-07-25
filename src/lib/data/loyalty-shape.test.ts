import { describe, it, expect } from "vitest";
import { rowToLoyalty, DEFAULT_LOYALTY } from "./loyalty-shape";

describe("rowToLoyalty", () => {
  it("returns defaults for empty/garbage input", () => {
    expect(rowToLoyalty(null)).toEqual(DEFAULT_LOYALTY);
    expect(rowToLoyalty({})).toEqual(DEFAULT_LOYALTY);
  });
  it("keeps hero fields and fills the rest", () => {
    const c = rowToLoyalty({ hero: { title: "Rewards" } });
    expect(c.hero.title).toBe("Rewards");
    expect(c.hero.subtitle).toBe(DEFAULT_LOYALTY.hero.subtitle);
    expect(c.benefits).toEqual(DEFAULT_LOYALTY.benefits);
  });
  it("sanitizes tiers (bad icon → star, perks cleaned, featured coerced)", () => {
    const c = rowToLoyalty({ tiers: [{ name: "Gold", icon: "x", perks: ["p", ""], featured: "yes" }] });
    expect(c.tiers[0].icon).toBe("star");
    expect(c.tiers[0].perks).toEqual(["p"]);
    expect(c.tiers[0].featured).toBe(false); // only boolean true counts
  });
  it("sanitizes rewards points + testimonial tone", () => {
    const c = rowToLoyalty({
      rewards: [{ title: "R", points: -5, icon: "gift" }],
      testimonials: [{ name: "A", quote: "q", tone: "weird" }],
    });
    expect(c.rewards[0].points).toBe(0);
    expect(c.testimonials[0].tone).toBe("neem-soft");
  });
});
