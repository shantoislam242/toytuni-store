import type { Address } from "@/lib/types";

/** Editable address fields (landmark optional). Kept separate from the saved
 *  `Address` type since a draft has no id / isDefault yet. Pure module (no
 *  "use client") so both the checkout form and the server-side address actions
 *  can share the shape + validation. */
export type AddressDraft = {
  fullName: string;
  phone: string;
  altPhone: string;
  email: string;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  landmark: string;
};

export type AddressErrors = Partial<Record<keyof AddressDraft, string>>;

/** BD mobile with separate +880 prefix: accepts 01712345678 or 1712345678. */
export const PHONE_RE = /^0?1\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("0") ? digits.slice(1) : digits;
  return `+880${local}`;
}

export function emptyDraft(): AddressDraft {
  return {
    fullName: "",
    phone: "",
    altPhone: "",
    email: "",
    division: "",
    district: "",
    area: "",
    addressLine: "",
    landmark: "",
  };
}

/** Map a saved `Address` back to an editable draft (for the edit form). The
 *  stored phone is already `+880…`; strip the prefix so the form's +880 addon
 *  isn't doubled. */
export function addressToDraft(a: Address): AddressDraft {
  const localPhone = (p: string) => p.replace(/^\+880/, "");
  return {
    fullName: a.fullName,
    phone: localPhone(a.phone),
    altPhone: a.altPhone ? localPhone(a.altPhone) : "",
    email: a.email ?? "",
    division: a.division,
    district: a.district,
    area: a.area,
    addressLine: a.addressLine,
    landmark: a.landmark ?? "",
  };
}

/** Build a confirmed `Address` from a draft: trims text, normalizes the +880
 *  phones, and drops empty optionals. `id` defaults to a checkout-local marker
 *  (a guest order doesn't persist the address). Mirror of `addressToDraft`. */
export function draftToAddress(d: AddressDraft, id = "guest"): Address {
  return {
    id,
    fullName: d.fullName.trim(),
    phone: normalizeBdPhone(d.phone),
    altPhone: d.altPhone.trim() ? normalizeBdPhone(d.altPhone) : undefined,
    email: d.email.trim() || undefined,
    division: d.division,
    district: d.district,
    area: d.area.trim(),
    addressLine: d.addressLine.trim(),
    landmark: d.landmark.trim() || undefined,
    isDefault: false,
  };
}

/** Validate required fields + phone shape. Returns a per-field error map. */
export function validateDraft(d: AddressDraft): AddressErrors {
  const e: AddressErrors = {};
  if (!d.fullName.trim()) e.fullName = "Full name is required.";
  if (!d.phone.trim()) e.phone = "Phone number is required.";
  else if (!PHONE_RE.test(d.phone.trim()))
    e.phone = "Enter a valid BD number, e.g. 01712345678 or 1712345678.";
  // Alternative phone is optional, but validate the shape when provided.
  if (d.altPhone.trim() && !PHONE_RE.test(d.altPhone.trim()))
    e.altPhone = "Enter a valid BD number, e.g. 01712345678 or 1712345678.";
  if (d.email.trim() && !EMAIL_RE.test(d.email.trim()))
    e.email = "Enter a valid email address.";
  if (!d.division) e.division = "Select a division.";
  if (!d.district) e.district = "Select a district.";
  if (!d.area.trim()) e.area = "Area / thana is required.";
  if (!d.addressLine.trim()) e.addressLine = "Full address is required.";
  return e;
}

export function isDraftValid(d: AddressDraft): boolean {
  return Object.keys(validateDraft(d)).length === 0;
}
