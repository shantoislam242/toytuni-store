import { describe, it, expect } from "vitest";
import { cleanTags } from "./tags";

describe("cleanTags", () => {
  it("trims whitespace", () => expect(cleanTags([" wood ", "eco "])).toEqual(["wood", "eco"]));
  it("drops empty entries", () => expect(cleanTags(["wood", "  ", ""])).toEqual(["wood"]));
  it("dedupes", () => expect(cleanTags(["wood", "wood", " wood "])).toEqual(["wood"]));
  it("defaults to an empty array when undefined", () => expect(cleanTags(undefined)).toEqual([]));
});
