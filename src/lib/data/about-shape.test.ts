import { describe, it, expect } from "vitest";
import { rowToAbout, DEFAULT_ABOUT } from "./about-shape";

describe("rowToAbout", () => {
  it("returns defaults for empty/garbage input", () => {
    expect(rowToAbout(null)).toEqual(DEFAULT_ABOUT);
    expect(rowToAbout("x")).toEqual(DEFAULT_ABOUT);
    expect(rowToAbout({})).toEqual(DEFAULT_ABOUT);
  });
  it("keeps provided header/story and fills the rest", () => {
    const c = rowToAbout({ header: { title: "Hi" }, story: { paragraphs: ["one", " ", "two"] } });
    expect(c.header.title).toBe("Hi");
    expect(c.header.subtitle).toBe(DEFAULT_ABOUT.header.subtitle);
    expect(c.story.paragraphs).toEqual(["one", "two"]); // blanks dropped
    expect(c.values).toEqual(DEFAULT_ABOUT.values); // missing → default
  });
  it("sanitizes list items (bad icon → heart, rating clamped, tone fallback)", () => {
    const c = rowToAbout({
      values: [{ title: "V", desc: "d", icon: "nope" }],
      testimonials: [{ name: "A", quote: "q", rating: 9, tone: "weird" }],
    });
    expect(c.values[0].icon).toBe("heart");
    expect(c.testimonials[0].rating).toBe(5);
    expect(c.testimonials[0].tone).toBe("neem-soft");
  });
  it("falls back an empty list to the default (never blank section)", () => {
    expect(rowToAbout({ journey: [] }).journey).toEqual(DEFAULT_ABOUT.journey);
  });
});
