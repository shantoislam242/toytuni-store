import { describe, it, expect } from "vitest";
import { markdownHeadings } from "./markdown-headings";

describe("markdownHeadings", () => {
  it("extracts ## headings in order", () => {
    expect(markdownHeadings("## One\n\ntext\n\n## Two\n\n- x")).toEqual(["One", "Two"]);
  });
  it("ignores non-h2 and returns [] for none", () => {
    expect(markdownHeadings("# Title\ntext\n### Sub")).toEqual([]);
  });
});
