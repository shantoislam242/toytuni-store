import type { Tone, BulkIcon, BulkTier, BulkBenefit, BulkStep } from "@/lib/types";
import { bulkTiers, bulkBenefits, bulkSteps, bulkContact } from "@/lib/mock/bulk";

export type { BulkIcon, BulkTier, BulkBenefit, BulkStep } from "@/lib/types";

/** Editable Bulk/Wholesale-page content, stored in `site_settings` key `bulk`.
 *  Mirrors the mock (defaults + fail-soft fallback). Section headings stay
 *  structural; the header copy, tiers, benefits, steps, and contact are
 *  editable. */
export type BulkContent = {
  header: { title: string; subtitle: string; stats: string[]; ctaLabel: string };
  tiers: BulkTier[];
  benefits: BulkBenefit[];
  steps: BulkStep[];
  contact: { phone: string; email: string; hours: string };
};

export const BULK_ICONS: BulkIcon[] = [
  "school", "store", "globe", "tag", "headset", "shield-check", "truck",
];
export const BULK_TONES: Tone[] = [
  "cream", "neem", "neem-soft", "wood", "terracotta", "mustard", "dusty-blue", "blush",
];

export const DEFAULT_BULK: BulkContent = {
  header: {
    title: "Wholesale & Bulk Orders",
    subtitle:
      "Partner with us to bring safe, natural neem-wood Montessori toys to your preschool, shop, or region — at wholesale pricing with dedicated support.",
    stats: ["250+ preschools", "10,000+ toys shipped", "Ships to 3 countries"],
    ctaLabel: "Request a quote",
  },
  tiers: bulkTiers,
  benefits: bulkBenefits,
  steps: bulkSteps,
  contact: { phone: bulkContact.phone, email: bulkContact.email, hours: bulkContact.hoursBn },
};

// ── normalizers ──────────────────────────────────────────────────────────────
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const str = (v: unknown, fb: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fb;
const icon = (v: unknown): BulkIcon => (BULK_ICONS.includes(v as BulkIcon) ? (v as BulkIcon) : "tag");
const tone = (v: unknown): Tone => (BULK_TONES.includes(v as Tone) ? (v as Tone) : "neem-soft");
const strList = (v: unknown, fb: string[]): string[] => {
  if (!Array.isArray(v)) return fb;
  const out = v.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim());
  return out.length ? out : fb;
};

function list<T>(v: unknown, fb: T[], map: (r: Record<string, unknown>, i: number) => T): T[] {
  if (!Array.isArray(v) || v.length === 0) return fb;
  return v.map((item, i) => map(rec(item), i));
}

/** Shape any stored jsonb into a full `BulkContent`, filling every
 *  missing/invalid field from `DEFAULT_BULK`. Pure — never throws. */
export function rowToBulk(value: unknown): BulkContent {
  const v = rec(value);
  const d = DEFAULT_BULK;
  const h = rec(v.header);
  const c = rec(v.contact);
  return {
    header: {
      title: str(h.title, d.header.title),
      subtitle: str(h.subtitle, d.header.subtitle),
      stats: strList(h.stats, d.header.stats),
      ctaLabel: str(h.ctaLabel, d.header.ctaLabel),
    },
    tiers: list(v.tiers, d.tiers, (r, i) => ({
      id: str(r.id, `tier${i}`),
      icon: icon(r.icon),
      titleBn: str(r.titleBn, "Untitled"),
      descBn: str(r.descBn, ""),
      points: strList(r.points, []),
      tone: tone(r.tone),
    })),
    benefits: list(v.benefits, d.benefits, (r, i) => ({
      id: str(r.id, `b${i}`),
      icon: icon(r.icon),
      titleBn: str(r.titleBn, "Untitled"),
      descBn: str(r.descBn, ""),
    })),
    steps: list(v.steps, d.steps, (r, i) => ({
      id: str(r.id, `s${i}`),
      titleBn: str(r.titleBn, "Untitled"),
      descBn: str(r.descBn, ""),
    })),
    contact: {
      phone: str(c.phone, d.contact.phone),
      email: str(c.email, d.contact.email),
      hours: str(c.hours, d.contact.hours),
    },
  };
}
