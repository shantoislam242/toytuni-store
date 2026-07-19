import { describe, it, expect } from "vitest";
import { validateBlogCategory } from "./blog-taxonomy";

describe("validateBlogCategory", () => {
  it("accepts a valid create", () => expect(validateBlogCategory({ slug: "play", name: "Play", sort: 0 }, { requireSlug: true })).toEqual({ ok: true }));
  it("rejects bad slug / empty name / negative sort", () => {
    expect(validateBlogCategory({ slug: "Bad Slug", name: "P", sort: 0 }, { requireSlug: true }).ok).toBe(false);
    expect(validateBlogCategory({ name: " ", sort: 0 }, { requireSlug: false }).ok).toBe(false);
    expect(validateBlogCategory({ name: "P", sort: -1 }, { requireSlug: false }).ok).toBe(false);
  });
  it("skips slug check on edit", () => expect(validateBlogCategory({ name: "P", sort: 1 }, { requireSlug: false })).toEqual({ ok: true }));
});
