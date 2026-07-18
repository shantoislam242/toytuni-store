import { BRAND_TAGLINE, BRAND_DESCRIPTION } from "@/lib/config";

export type Settings = {
  shipping: { insideDhakaFee: number; outsideDhakaFee: number; freeShippingThreshold: number };
  codFee: number;
  contact: { phone: string; whatsapp: string; email: string; address: string };
  brand: { tagline: string; description: string };
};

/** Current hardcoded values become the defaults + fail-soft fallback. */
export const DEFAULT_SETTINGS: Settings = {
  shipping: { insideDhakaFee: 80, outsideDhakaFee: 150, freeShippingThreshold: 2000 },
  codFee: 0,
  contact: {
    phone: "+880 1234-567890",
    whatsapp: "+880 1234-567890",
    email: "hello@toytuni.com",
    address: "Dhaka, Bangladesh",
  },
  brand: { tagline: BRAND_TAGLINE, description: BRAND_DESCRIPTION },
};

const nnInt = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;
const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;

/** Shape any stored jsonb into a full Settings, filling every missing/invalid
 *  field from DEFAULT_SETTINGS. Pure — never throws. */
export function rowToSettings(value: unknown): Settings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const sh = (v.shipping && typeof v.shipping === "object" ? v.shipping : {}) as Record<string, unknown>;
  const c = (v.contact && typeof v.contact === "object" ? v.contact : {}) as Record<string, unknown>;
  const b = (v.brand && typeof v.brand === "object" ? v.brand : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    shipping: {
      insideDhakaFee: nnInt(sh.insideDhakaFee, d.shipping.insideDhakaFee),
      outsideDhakaFee: nnInt(sh.outsideDhakaFee, d.shipping.outsideDhakaFee),
      freeShippingThreshold: nnInt(sh.freeShippingThreshold, d.shipping.freeShippingThreshold),
    },
    codFee: nnInt(v.codFee, d.codFee),
    contact: {
      phone: str(c.phone, d.contact.phone),
      whatsapp: str(c.whatsapp, d.contact.whatsapp),
      email: str(c.email, d.contact.email),
      address: str(c.address, d.contact.address),
    },
    brand: {
      tagline: str(b.tagline, d.brand.tagline),
      description: str(b.description, d.brand.description),
    },
  };
}
