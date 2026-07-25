import { describe, it, expect } from "vitest";
import { rowToNav, DEFAULT_NAV } from "./nav-shape";

describe("rowToNav", () => {
  it("returns defaults for empty/garbage input", () => {
    expect(rowToNav(null)).toEqual(DEFAULT_NAV);
    expect(rowToNav({})).toEqual(DEFAULT_NAV);
  });
  it("keeps valid links and drops rows missing a label or href", () => {
    const c = rowToNav({ main: [{ labelBn: "Home", href: "/" }, { labelBn: "", href: "/x" }, { labelBn: "No href" }] });
    expect(c.main).toEqual([{ labelBn: "Home", href: "/" }]);
  });
  it("empty link list → default", () => {
    expect(rowToNav({ footerShop: [] }).footerShop).toEqual(DEFAULT_NAV.footerShop);
  });
  it("sanitizes socials (bad icon → globe, blank href → #)", () => {
    const c = rowToNav({ socials: [{ label: "FB", href: "", icon: "weird" }] });
    expect(c.socials[0]).toEqual({ label: "FB", href: "#", icon: "globe" });
  });
});
