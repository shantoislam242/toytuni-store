import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins headers + rows with CRLF", () => {
    expect(toCsv(["A", "B"], [["1", "2"], ["3", "4"]])).toBe("A,B\r\n1,2\r\n3,4");
  });
  it("blanks null/undefined and stringifies numbers", () => {
    expect(toCsv(["A", "B", "C"], [[null, undefined, 5]])).toBe("A,B,C\r\n,,5");
  });
  it("quotes cells with commas, quotes, or newlines (doubling inner quotes)", () => {
    expect(toCsv(["X"], [["a,b"]])).toBe('X\r\n"a,b"');
    expect(toCsv(["X"], [['say "hi"']])).toBe('X\r\n"say ""hi"""');
    expect(toCsv(["X"], [["line1\nline2"]])).toBe('X\r\n"line1\nline2"');
  });
});
