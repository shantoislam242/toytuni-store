import { describe, it, expect } from "vitest";
import { normalizeSlugs, mergeWishlistSlugs } from "./merge";

describe("normalizeSlugs", () => {
  it("drops non-strings, blanks, and dupes; preserves first-seen order", () => {
    expect(normalizeSlugs(["a", "b", "a", "", "  ", 3, null, "c"])).toEqual(["a", "b", "c"]);
  });
  it("trims whitespace and drops over-long slugs", () => {
    expect(normalizeSlugs([" a ", "x".repeat(201)])).toEqual(["a"]);
  });
});

describe("mergeWishlistSlugs", () => {
  it("unions remote then local, remote order first, no dupes", () => {
    expect(mergeWishlistSlugs(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });
  it("handles empty sides", () => {
    expect(mergeWishlistSlugs([], ["x"])).toEqual(["x"]);
    expect(mergeWishlistSlugs(["y"], [])).toEqual(["y"]);
  });
});
