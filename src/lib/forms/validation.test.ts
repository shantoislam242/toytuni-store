import { describe, it, expect } from "vitest";
import { validateContact, validateBulk, validateNewsletterEmail } from "./validation";

const contact = { name: " Rima ", email: "r@x.com", subject: "  ", message: " Hi there " };

describe("validateContact", () => {
  it("accepts, trims, nulls empty subject", () => {
    expect(validateContact(contact)).toEqual({
      ok: true, value: { name: "Rima", email: "r@x.com", subject: null, message: "Hi there" },
    });
  });
  it("keeps a real subject", () => {
    const r = validateContact({ ...contact, subject: " Order help " });
    expect(r.ok && r.value.subject).toBe("Order help");
  });
  it("rejects missing name/message and bad email", () => {
    expect(validateContact({ ...contact, name: " " }).ok).toBe(false);
    expect(validateContact({ ...contact, message: " " }).ok).toBe(false);
    expect(validateContact({ ...contact, email: "nope" }).ok).toBe(false);
  });
  it("rejects over-long fields", () => {
    expect(validateContact({ ...contact, name: "n".repeat(121) }).ok).toBe(false);
    expect(validateContact({ ...contact, subject: "s".repeat(201) }).ok).toBe(false);
    expect(validateContact({ ...contact, message: "m".repeat(3001) }).ok).toBe(false);
  });
});

const bulk = {
  business: " Toy Shop BD ", person: " Karim ", email: "k@x.com",
  phone: "01712345678", program: "", quantity: " 50+ ", message: " Bulk please ",
};

describe("validateBulk", () => {
  it("accepts, trims, nulls empty optionals", () => {
    expect(validateBulk(bulk)).toEqual({
      ok: true,
      value: {
        business: "Toy Shop BD", person: "Karim", email: "k@x.com", phone: "01712345678",
        program: null, quantity: "50+", message: "Bulk please",
      },
    });
  });
  it("rejects missing required fields", () => {
    expect(validateBulk({ ...bulk, business: " " }).ok).toBe(false);
    expect(validateBulk({ ...bulk, person: " " }).ok).toBe(false);
    expect(validateBulk({ ...bulk, message: " " }).ok).toBe(false);
  });
  it("rejects an invalid BD phone", () => {
    expect(validateBulk({ ...bulk, phone: "12345" }).ok).toBe(false);
  });
  it("accepts +880 phone forms", () => {
    expect(validateBulk({ ...bulk, phone: "+8801712345678" }).ok).toBe(true);
  });
});

describe("validateNewsletterEmail", () => {
  it("accepts, trims, lowercases", () => {
    expect(validateNewsletterEmail(" Rima@Example.COM ")).toEqual({ ok: true, value: "rima@example.com" });
  });
  it("rejects bad/empty/over-long", () => {
    expect(validateNewsletterEmail("nope").ok).toBe(false);
    expect(validateNewsletterEmail("  ").ok).toBe(false);
    expect(validateNewsletterEmail("a@" + "b".repeat(200) + ".com").ok).toBe(false);
  });
});
