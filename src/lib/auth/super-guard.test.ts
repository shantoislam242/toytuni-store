import { describe, it, expect } from "vitest";
import { wouldOrphanSupers } from "./super-guard";

describe("wouldOrphanSupers", () => {
  it("removing the only DB super (no env supers) orphans → true", () => {
    expect(wouldOrphanSupers([], ["solo@x.com"], "solo@x.com")).toBe(true);
  });

  it("an env super keeps the store covered → false (a DB super can always leave)", () => {
    expect(wouldOrphanSupers(["owner@x.com"], ["solo@x.com"], "solo@x.com")).toBe(false);
  });

  it("removing one of two DB supers leaves the other → false", () => {
    expect(wouldOrphanSupers([], ["a@x.com", "b@x.com"], "a@x.com")).toBe(false);
  });

  it("demoting a super while a peer super remains → false", () => {
    expect(wouldOrphanSupers([], ["boss@x.com", "peer@x.com"], "boss@x.com")).toBe(false);
  });

  it("case-insensitive and trimmed matching", () => {
    expect(wouldOrphanSupers([], ["Solo@X.com"], " solo@x.com ")).toBe(true);
    expect(wouldOrphanSupers([" Owner@X.com "], ["solo@x.com"], "solo@x.com")).toBe(false);
  });

  it("target not among the supers (e.g. an admin row) → count unchanged", () => {
    expect(wouldOrphanSupers([], ["a@x.com"], "staff@x.com")).toBe(false);
    expect(wouldOrphanSupers([], [], "staff@x.com")).toBe(true);
  });

  it("env and DB overlap dedupes (same email seeded both places)", () => {
    // owner is env AND a DB super row; removing an unrelated target still leaves owner
    expect(wouldOrphanSupers(["owner@x.com"], ["owner@x.com"], "other@x.com")).toBe(false);
  });
});
