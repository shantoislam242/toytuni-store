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
  it("returns the same reference on a no-op, a new array on a move", () => {
    const a = ["a", "b"];
    expect(moveInArray(a, 0, -1)).toBe(a);      // clamp = same ref
    expect(moveInArray(a, 0, 1)).not.toBe(a);   // move = new array
  });
});
