import { describe, it, expect } from "vitest";
import { rowToBulk, DEFAULT_BULK } from "./bulk-shape";

describe("rowToBulk", () => {
  it("returns defaults for empty/garbage input", () => {
    expect(rowToBulk(null)).toEqual(DEFAULT_BULK);
    expect(rowToBulk({})).toEqual(DEFAULT_BULK);
  });
  it("keeps provided header + sanitizes stats list", () => {
    const c = rowToBulk({ header: { title: "Hi", stats: ["a", " ", "b"] } });
    expect(c.header.title).toBe("Hi");
    expect(c.header.subtitle).toBe(DEFAULT_BULK.header.subtitle);
    expect(c.header.stats).toEqual(["a", "b"]);
  });
  it("sanitizes tier items (bad icon → tag, tone fallback, points cleaned)", () => {
    const c = rowToBulk({ tiers: [{ titleBn: "T", descBn: "d", icon: "x", tone: "z", points: ["p", ""] }] });
    expect(c.tiers[0].icon).toBe("tag");
    expect(c.tiers[0].tone).toBe("neem-soft");
    expect(c.tiers[0].points).toEqual(["p"]);
  });
  it("empty list → default", () => {
    expect(rowToBulk({ steps: [] }).steps).toEqual(DEFAULT_BULK.steps);
  });
});
