import { describe, it, expect } from "vitest";
import { analyzeSeo } from "./seo-analysis";

const base = {
  title: "Best neem wood toys for babies",
  seoTitle: "Best neem wood toys for babies — safe & natural",
  metaDescription: "Discover the best neem wood toys for babies: safe, non-toxic and natural picks for teething, grasping and screen-free play at home.",
  slug: "best-neem-wood-toys",
  focusKeyword: "neem wood toys",
  bodyMarkdown: "## Why neem wood toys\n\nNeem wood toys are a safe, natural choice for babies. " + "word ".repeat(320) + "\n\nRead our [safety guide](/blog/safety).\n\n![A neem wood toy](/x.png)",
  excerpt: "Safe, natural neem wood toys for babies.",
};

describe("analyzeSeo", () => {
  it("scores a well-optimised post as good", () => {
    const r = analyzeSeo(base);
    expect(r.rating).toBe("good");
    expect(r.checks.find((c) => c.id === "kw-title")?.status).toBe("good");
    expect(r.checks.find((c) => c.id === "content-length")?.status).toBe("good");
    expect(r.checks.find((c) => c.id === "img-alt")?.status).toBe("good");
  });
  it("flags a missing focus keyword", () => {
    const r = analyzeSeo({ ...base, focusKeyword: "" });
    expect(r.checks.find((c) => c.id === "keyword-set")?.status).toBe("bad");
  });
  it("flags keyword absent from the title", () => {
    expect(analyzeSeo({ ...base, seoTitle: "Something else", title: "Other" }).checks.find((c) => c.id === "kw-title")?.status).toBe("bad");
  });
  it("flags an image without alt text", () => {
    expect(analyzeSeo({ ...base, bodyMarkdown: base.bodyMarkdown + "\n\n![](/noalt.png)" }).checks.find((c) => c.id === "img-alt")?.status).toBe("bad");
  });
  it("flags thin content", () => {
    expect(analyzeSeo({ ...base, bodyMarkdown: "## Hi\n\nneem wood toys are short." }).checks.find((c) => c.id === "content-length")?.status).toBe("bad");
  });
});
