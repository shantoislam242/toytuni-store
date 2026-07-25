import { describe, it, expect } from "vitest";
import { addressToDraft, normalizeBdPhone, validateDraft, emptyDraft } from "./address-fields";
import type { Address } from "@/lib/types";

const base: Address = {
  id: "a1",
  fullName: "Ayesha Rahman",
  phone: "+8801712345678",
  altPhone: "+8801898765432",
  email: "ayesha@example.com",
  division: "Dhaka",
  district: "Dhaka",
  area: "Banani",
  addressLine: "House 42, Road 7",
  landmark: "Beside the park",
  isDefault: true,
};

describe("addressToDraft", () => {
  it("strips the +880 prefix so the form's addon isn't doubled", () => {
    const d = addressToDraft(base);
    expect(d.phone).toBe("1712345678");
    expect(d.altPhone).toBe("1898765432");
  });
  it("round-trips back to the stored phone via normalizeBdPhone", () => {
    expect(normalizeBdPhone(addressToDraft(base).phone)).toBe("+8801712345678");
  });
  it("maps optional nulls to empty strings", () => {
    const d = addressToDraft({ ...base, altPhone: undefined, email: undefined, landmark: undefined });
    expect(d.altPhone).toBe("");
    expect(d.email).toBe("");
    expect(d.landmark).toBe("");
  });
});

describe("validateDraft", () => {
  it("flags an empty draft's required fields", () => {
    const e = validateDraft(emptyDraft());
    expect(e.fullName).toBeTruthy();
    expect(e.division).toBeTruthy();
    expect(e.addressLine).toBeTruthy();
  });
  it("passes a complete draft", () => {
    expect(Object.keys(validateDraft(addressToDraft(base)))).toHaveLength(0);
  });
});
