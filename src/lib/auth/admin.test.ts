import { describe, it, expect, beforeEach } from "vitest";
import { isAdmin } from "@/lib/auth/admin";

beforeEach(() => { process.env.ADMIN_EMAILS = "boss@toytuni.com, Admin@Shop.com"; });

describe("isAdmin", () => {
  it("matches an allowlisted email", () => expect(isAdmin("boss@toytuni.com")).toBe(true));
  it("is case-insensitive and trims", () => expect(isAdmin("  ADMIN@shop.com ")).toBe(true));
  it("rejects a non-admin", () => expect(isAdmin("someone@else.com")).toBe(false));
  it("rejects null / empty", () => { expect(isAdmin(null)).toBe(false); expect(isAdmin("")).toBe(false); });
  it("false when ADMIN_EMAILS unset", () => { delete process.env.ADMIN_EMAILS; expect(isAdmin("boss@toytuni.com")).toBe(false); });
});
