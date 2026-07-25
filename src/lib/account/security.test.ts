import { describe, it, expect } from "vitest";
import { validatePasswordChange, MIN_PASSWORD_LEN } from "./security";

describe("validatePasswordChange", () => {
  it("rejects a too-short password", () => {
    expect(validatePasswordChange("short", "short")).toMatch(/at least/);
  });
  it("rejects a mismatch", () => {
    expect(validatePasswordChange("longenough1", "longenough2")).toBe("Passwords do not match.");
  });
  it("accepts a valid matching pair at the boundary", () => {
    expect(validatePasswordChange("x".repeat(MIN_PASSWORD_LEN), "x".repeat(MIN_PASSWORD_LEN))).toBeNull();
  });
});
