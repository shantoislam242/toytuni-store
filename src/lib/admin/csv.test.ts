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

  describe("formula-injection guard", () => {
    it("prefixes a string cell starting with a formula trigger with '", () => {
      expect(toCsv(["X"], [["=1+1"]])).toBe("X\r\n'=1+1");
      expect(toCsv(["X"], [["+cmd"]])).toBe("X\r\n'+cmd");
      expect(toCsv(["X"], [["-cmd"]])).toBe("X\r\n'-cmd");
      expect(toCsv(["X"], [["@SUM(1)"]])).toBe("X\r\n'@SUM(1)");
      expect(toCsv(["X"], [["\tfoo"]])).toBe("X\r\n'\tfoo");
    });
    it("still RFC-quotes a guarded value that also has a comma", () => {
      expect(toCsv(["X"], [["=A,B"]])).toBe(`X\r\n"'=A,B"`);
    });
    it("leaves ordinary strings untouched", () => {
      expect(toCsv(["Name"], [["Ayesha Rahman"]])).toBe("Name\r\nAyesha Rahman");
    });
    it("never corrupts numbers, including negatives", () => {
      expect(toCsv(["Amt"], [[-100]])).toBe("Amt\r\n-100");
      expect(toCsv(["Amt"], [[250]])).toBe("Amt\r\n250");
    });
  });
});
