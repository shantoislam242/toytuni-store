import { describe, it, expect } from "vitest";
import { normalizePhone, phoneMatches } from "./phone-match";

describe("normalizePhone", () => {
  it("strips spaces, dashes, plus", () => {
    expect(normalizePhone("+880 1712-345678")).toBe("01712345678");
    expect(normalizePhone("01712 345 678")).toBe("01712345678");
  });
  it("collapses the 88 country prefix to local 01…", () => {
    expect(normalizePhone("8801712345678")).toBe("01712345678");
    expect(normalizePhone("+8801712345678")).toBe("01712345678");
  });
  it("leaves an already-local number", () => {
    expect(normalizePhone("01712345678")).toBe("01712345678");
  });
});
describe("phoneMatches", () => {
  it("matches across formats", () => {
    expect(phoneMatches("+8801712345678", "01712 345678")).toBe(true);
    expect(phoneMatches("01712345678", "8801712345678")).toBe(true);
  });
  it("rejects different numbers", () => {
    expect(phoneMatches("01712345678", "01998765432")).toBe(false);
  });
  it("is false on empty", () => {
    expect(phoneMatches("", "01712345678")).toBe(false);
  });
});
