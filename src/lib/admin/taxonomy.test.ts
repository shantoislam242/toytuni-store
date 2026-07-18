import { describe, it, expect } from "vitest";
import { validateTaxonomyInput, isPermutation, TONES, TAXONOMY_TABLES } from "./taxonomy";

describe("validateTaxonomyInput", () => {
  const base = { slug: "wooden-toys", title: "Wooden Toys", tone: "neem", sort: 0 };
  it("accepts a valid create input", () => {
    expect(validateTaxonomyInput(base, { requireSlug: true })).toEqual({ ok: true });
  });
  it("rejects a bad slug on create", () => {
    expect(validateTaxonomyInput({ ...base, slug: "Bad Slug" }, { requireSlug: true }).ok).toBe(false);
  });
  it("skips the slug check on edit", () => {
    expect(validateTaxonomyInput({ title: "T", tone: "neem", sort: 1 }, { requireSlug: false })).toEqual({ ok: true });
  });
  it("rejects empty title, bad tone, negative sort", () => {
    expect(validateTaxonomyInput({ ...base, title: "  " }, { requireSlug: true }).ok).toBe(false);
    expect(validateTaxonomyInput({ ...base, tone: "rainbow" }, { requireSlug: true }).ok).toBe(false);
    expect(validateTaxonomyInput({ ...base, sort: -1 }, { requireSlug: true }).ok).toBe(false);
  });
});

describe("isPermutation", () => {
  it("true for a reorder of the same set", () => expect(isPermutation(["b", "a"], ["a", "b"])).toBe(true));
  it("false for dup / missing / extra / wrong length", () => {
    expect(isPermutation(["a", "a"], ["a", "b"])).toBe(false);
    expect(isPermutation(["a", "c"], ["a", "b"])).toBe(false);
    expect(isPermutation(["a"], ["a", "b"])).toBe(false);
  });
});

describe("TAXONOMY_TABLES", () => {
  it("maps both kinds to their table + fk column", () => {
    expect(TAXONOMY_TABLES.category).toMatchObject({ table: "categories", fkColumn: "category_slug" });
    expect(TAXONOMY_TABLES.ageTier).toMatchObject({ table: "age_tiers", fkColumn: "age_tier_slug" });
    expect(TONES).toContain("neem");
  });
});
