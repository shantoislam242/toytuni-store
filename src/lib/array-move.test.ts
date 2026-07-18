import { describe, it, expect } from "vitest";
import { moveInArray } from "./array-move";

describe("moveInArray", () => {
  it("moves an item by delta, returning a new array", () => {
    expect(moveInArray(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveInArray(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
  });
  it("clamps at the ends (no-op)", () => {
    expect(moveInArray(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveInArray(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
