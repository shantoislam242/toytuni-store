import { describe, it, expect } from "vitest";
import { rowToContent, DEFAULT_CONTENT } from "./content-shape";

describe("rowToContent", () => {
  it("returns defaults for empty/garbage input", () => {
    expect(rowToContent(null)).toEqual(DEFAULT_CONTENT);
    expect(rowToContent("nope")).toEqual(DEFAULT_CONTENT);
    expect(rowToContent({})).toEqual(DEFAULT_CONTENT);
  });
  it("keeps provided fields and fills the rest from defaults", () => {
    const c = rowToContent({ hero: { heading: "Hello", subheading: "  " } });
    expect(c.hero.heading).toBe("Hello");
    expect(c.hero.subheading).toBe(DEFAULT_CONTENT.hero.subheading); // blank → default
    expect(c.hero.primaryLabel).toBe(DEFAULT_CONTENT.hero.primaryLabel);
    expect(c.about).toEqual(DEFAULT_CONTENT.about);
  });
  it("preserves a two-line heading (inner newline, outer trim)", () => {
    expect(rowToContent({ hero: { heading: "  Line one\nLine two  " } }).hero.heading).toBe("Line one\nLine two");
  });
  it("accepts an http(s) image url and rejects anything else", () => {
    expect(rowToContent({ hero: { imageDesktop: "https://cdn/x.webp" } }).hero.imageDesktop).toBe("https://cdn/x.webp");
    expect(rowToContent({ hero: { imageDesktop: "/local.webp" } }).hero.imageDesktop).toBeNull();
    expect(rowToContent({ hero: { imageDesktop: 42 } }).hero.imageDesktop).toBeNull();
  });
});
