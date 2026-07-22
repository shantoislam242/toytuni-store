import { describe, it, expect } from "vitest";
import { resolveAdminRole } from "./resolve-role";

const ENV = ["owner@x.com", "boss@x.com"];

describe("resolveAdminRole", () => {
  it("env email → super_admin regardless of db", () => {
    expect(resolveAdminRole("owner@x.com", ENV, null)).toBe("super_admin");
    expect(resolveAdminRole("owner@x.com", ENV, "admin")).toBe("super_admin");
  });
  it("env match is case-insensitive and trimmed", () => {
    expect(resolveAdminRole(" Owner@X.com ", ENV, null)).toBe("super_admin");
  });
  it("db role passthrough when not in env", () => {
    expect(resolveAdminRole("staff@x.com", ENV, "admin")).toBe("admin");
    expect(resolveAdminRole("staff@x.com", ENV, "super_admin")).toBe("super_admin");
  });
  it("null for unknown/absent email or unknown role", () => {
    expect(resolveAdminRole("nobody@x.com", ENV, null)).toBeNull();
    expect(resolveAdminRole(null, ENV, "admin")).toBeNull();
    expect(resolveAdminRole("", ENV, null)).toBeNull();
    expect(resolveAdminRole("weird@x.com", ENV, "owner")).toBeNull();
  });
});
