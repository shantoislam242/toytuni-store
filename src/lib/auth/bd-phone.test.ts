import { describe, it, expect } from "vitest";
import { isValidBdMobile } from "./bd-phone";

describe("isValidBdMobile", () => {
  it("accepts canonical local numbers", () => {
    expect(isValidBdMobile("01712345678")).toBe(true);
    expect(isValidBdMobile("01912345678")).toBe(true);
    expect(isValidBdMobile("01312345678")).toBe(true);
  });
  it("accepts +880 / 880 / spaced / dashed forms", () => {
    expect(isValidBdMobile("+8801712345678")).toBe(true);
    expect(isValidBdMobile("8801712345678")).toBe(true);
    expect(isValidBdMobile("+880 1712-345678")).toBe(true);
  });
  it("rejects wrong length", () => {
    expect(isValidBdMobile("0171234567")).toBe(false); // 10 digits
    expect(isValidBdMobile("017123456789")).toBe(false); // 12 digits
  });
  it("rejects bad prefix / operator", () => {
    expect(isValidBdMobile("02712345678")).toBe(false); // not 01
    expect(isValidBdMobile("01212345678")).toBe(false); // operator 2 invalid
    expect(isValidBdMobile("11712345678")).toBe(false);
  });
  it("rejects empty / non-numeric", () => {
    expect(isValidBdMobile("")).toBe(false);
    expect(isValidBdMobile("hello")).toBe(false);
  });
});
