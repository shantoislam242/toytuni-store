import { BRAND_NAME } from "@/lib/config";
import type { Tone } from "@/lib/types";
import {
  aboutStory,
  aboutMissionVision,
  aboutWhyChooseUs,
  aboutValues,
  aboutPhilosophy,
  aboutJourney,
  aboutStats,
  aboutTestimonials,
  type AboutIcon,
  type AboutFeature,
  type AboutMilestone,
  type AboutStat,
  type AboutTestimonial,
} from "@/lib/mock/about";

export type { AboutIcon, AboutFeature, AboutMilestone, AboutStat, AboutTestimonial } from "@/lib/mock/about";

/** Editable About-page content, stored as a jsonb blob in `site_settings` under
 *  key `about`. Mirrors the mock (which becomes the defaults + fail-soft
 *  fallback). The gallery isn't rendered, so it's omitted. Section eyebrows /
 *  titles stay structural (not editable) — only the content lists + the page
 *  header, story, and CTA copy are editable. */
export type AboutContent = {
  header: { title: string; subtitle: string };
  story: { heading: string; paragraphs: string[] };
  missionVision: AboutFeature[];
  whyChooseUs: AboutFeature[];
  values: AboutFeature[];
  philosophy: AboutFeature[];
  journey: AboutMilestone[];
  stats: AboutStat[];
  testimonials: AboutTestimonial[];
  cta: {
    heading: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
};

/** Selectable icon keys (map to lucide in the view) + tones for the pickers. */
export const ABOUT_ICONS: AboutIcon[] = [
  "target", "compass", "shield-check", "graduation-cap", "leaf", "badge-check",
  "book-open", "heart", "blocks", "shield", "palette", "recycle",
  "person-standing", "puzzle", "hand",
];
export const ABOUT_TONES: Tone[] = [
  "cream", "neem", "neem-soft", "wood", "terracotta", "mustard", "dusty-blue", "blush",
];

export const DEFAULT_ABOUT: AboutContent = {
  header: {
    title: "Creating meaningful play experiences for every child.",
    subtitle:
      "We design and handcraft natural, Montessori-inspired wooden toys that help children learn, grow, and imagine — one joyful moment of play at a time.",
  },
  story: { heading: "It began with a search for better play", paragraphs: aboutStory },
  missionVision: aboutMissionVision,
  whyChooseUs: aboutWhyChooseUs,
  values: aboutValues,
  philosophy: aboutPhilosophy,
  journey: aboutJourney,
  stats: aboutStats,
  testimonials: aboutTestimonials,
  cta: {
    heading: "Start your child's learning journey today",
    subtitle: `Discover handmade toys made to spark curiosity, from ${BRAND_NAME}.`,
    primaryLabel: "Shop Collection",
    primaryHref: "/collections/all",
    secondaryLabel: "Contact Us",
    secondaryHref: "/contact",
  },
};

// ── normalizers ──────────────────────────────────────────────────────────────
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const str = (v: unknown, fb: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.replace(/^\s+|\s+$/g, "") : fb;
const optStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
const icon = (v: unknown): AboutIcon => (ABOUT_ICONS.includes(v as AboutIcon) ? (v as AboutIcon) : "heart");
const tone = (v: unknown): Tone => (ABOUT_TONES.includes(v as Tone) ? (v as Tone) : "neem-soft");
const posInt = (v: unknown, fb: number): number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : fb;

/** Map an array field: sanitize each item, or fall back to the default list when
 *  it's missing/empty (never render an empty section). */
function list<T>(v: unknown, fb: T[], map: (r: Record<string, unknown>, i: number) => T): T[] {
  if (!Array.isArray(v) || v.length === 0) return fb;
  return v.map((item, i) => map(rec(item), i));
}

const feature = (r: Record<string, unknown>, i: number): AboutFeature => ({
  id: str(r.id, `f${i}`),
  icon: icon(r.icon),
  title: str(r.title, "Untitled"),
  desc: str(r.desc, ""),
});

/** Shape any stored jsonb into a full `AboutContent`, filling every
 *  missing/invalid field from `DEFAULT_ABOUT`. Pure — never throws. */
export function rowToAbout(value: unknown): AboutContent {
  const v = rec(value);
  const d = DEFAULT_ABOUT;
  const header = rec(v.header);
  const story = rec(v.story);
  const cta = rec(v.cta);
  const paragraphs = Array.isArray(story.paragraphs)
    ? story.paragraphs.filter((p): p is string => typeof p === "string" && p.trim() !== "").map((p) => p.trim())
    : d.story.paragraphs;
  return {
    header: { title: str(header.title, d.header.title), subtitle: str(header.subtitle, d.header.subtitle) },
    story: {
      heading: str(story.heading, d.story.heading),
      paragraphs: paragraphs.length ? paragraphs : d.story.paragraphs,
    },
    missionVision: list(v.missionVision, d.missionVision, feature),
    whyChooseUs: list(v.whyChooseUs, d.whyChooseUs, feature),
    values: list(v.values, d.values, feature),
    philosophy: list(v.philosophy, d.philosophy, feature),
    journey: list(v.journey, d.journey, (r, i) => ({
      year: str(r.year, `${2023 + i}`),
      title: str(r.title, "Milestone"),
      desc: str(r.desc, ""),
    })),
    stats: list(v.stats, d.stats, (r, i) => ({
      id: str(r.id, `s${i}`),
      target: posInt(r.target, 0),
      prefix: optStr(r.prefix),
      suffix: optStr(r.suffix),
      label: str(r.label, ""),
    })),
    testimonials: list(v.testimonials, d.testimonials, (r, i) => ({
      id: str(r.id, `t${i}`),
      name: str(r.name, "Anonymous"),
      location: str(r.location, ""),
      quote: str(r.quote, ""),
      rating: Math.min(5, Math.max(1, posInt(r.rating, 5))),
      tone: tone(r.tone),
    })),
    cta: {
      heading: str(cta.heading, d.cta.heading),
      subtitle: str(cta.subtitle, d.cta.subtitle),
      primaryLabel: str(cta.primaryLabel, d.cta.primaryLabel),
      primaryHref: str(cta.primaryHref, d.cta.primaryHref),
      secondaryLabel: str(cta.secondaryLabel, d.cta.secondaryLabel),
      secondaryHref: str(cta.secondaryHref, d.cta.secondaryHref),
    },
  };
}
