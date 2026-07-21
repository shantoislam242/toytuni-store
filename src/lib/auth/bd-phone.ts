import { normalizePhone } from "@/lib/orders/phone-match";

export { normalizePhone };

/** True iff `raw` is a valid Bangladeshi mobile number. Normalises first
 *  (digits only, `880…`→`0…`), then requires the canonical local form
 *  `01[3-9]XXXXXXXX` — 11 digits, `01`, a valid operator digit (3–9), then 8
 *  more. Accepts `01712345678`, `+8801712345678`, `880 1712-345678`, etc. */
export function isValidBdMobile(raw: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizePhone(raw));
}
