import { describe, it, expect } from "vitest";
import { blockToMarkdown } from "./block-to-markdown";

describe("blockToMarkdown", () => {
  it("converts h2/p/ul blocks to markdown", () => {
    const md = blockToMarkdown([
      { type: "h2", text: "Heading" },
      { type: "p", text: "A paragraph." },
      { type: "ul", items: ["one", "two"] },
    ]);
    expect(md).toBe("## Heading\n\nA paragraph.\n\n- one\n- two");
  });
  it("handles empty", () => expect(blockToMarkdown([])).toBe(""));
});
