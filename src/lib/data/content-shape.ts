/** Editable homepage content (hero + about teaser). Stored as a jsonb blob in
 *  `site_settings` under key `homepage`; the current hardcoded copy becomes the
 *  defaults + fail-soft fallback, exactly like `settings-shape.ts`. */

export type HeroContent = {
  /** May contain a newline for a two-line heading (rendered `whitespace-pre-line`). */
  heading: string;
  subheading: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  /** Uploaded image URL, or null to use the bundled default. */
  imageDesktop: string | null;
  imageMobile: string | null;
};

export type AboutTeaserContent = {
  heading: string;
  subheading: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type SiteContent = { hero: HeroContent; about: AboutTeaserContent };

/** Bundled hero images — used when no custom image is uploaded. */
export const DEFAULT_HERO_DESKTOP = "/images/hero/hero-v2.webp";
export const DEFAULT_HERO_MOBILE = "/images/hero/hero-mobile-43.webp";

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    heading: "Learning Begins\nwith Play",
    subheading:
      "Thoughtfully crafted Montessori toys that nurture creativity, confidence, and independent learning.",
    primaryLabel: "Shop Now",
    primaryHref: "/collections/all",
    secondaryLabel: "Explore by Age",
    secondaryHref: "/collections/by-age",
    imageDesktop: null,
    imageMobile: null,
  },
  about: {
    heading: "About Us",
    subheading: "Learning Through Play, Inspired by Montessori.",
    body:
      "We craft natural, non-toxic wooden toys designed the Montessori way — to nurture creativity, independence, and a lifelong love of learning. Every piece is made by hand, and made to be treasured.",
    primaryLabel: "Learn More",
    primaryHref: "/about",
    secondaryLabel: "Shop Collection",
    secondaryHref: "/collections/all",
  },
};

/** Trimmed string, or the fallback when missing/blank. Newlines are preserved
 *  (only outer whitespace trimmed) so a two-line hero heading survives. */
const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.replace(/^\s+|\s+$/g, "") : fallback;

/** An uploaded image URL (https) or null (→ bundled default). */
const imageUrl = (v: unknown): string | null =>
  typeof v === "string" && v.startsWith("http") ? v : null;

/** Shape any stored jsonb into a full `SiteContent`, filling every
 *  missing/invalid field from `DEFAULT_CONTENT`. Pure — never throws. */
export function rowToContent(value: unknown): SiteContent {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const h = (v.hero && typeof v.hero === "object" ? v.hero : {}) as Record<string, unknown>;
  const a = (v.about && typeof v.about === "object" ? v.about : {}) as Record<string, unknown>;
  const d = DEFAULT_CONTENT;
  return {
    hero: {
      heading: str(h.heading, d.hero.heading),
      subheading: str(h.subheading, d.hero.subheading),
      primaryLabel: str(h.primaryLabel, d.hero.primaryLabel),
      primaryHref: str(h.primaryHref, d.hero.primaryHref),
      secondaryLabel: str(h.secondaryLabel, d.hero.secondaryLabel),
      secondaryHref: str(h.secondaryHref, d.hero.secondaryHref),
      imageDesktop: imageUrl(h.imageDesktop),
      imageMobile: imageUrl(h.imageMobile),
    },
    about: {
      heading: str(a.heading, d.about.heading),
      subheading: str(a.subheading, d.about.subheading),
      body: str(a.body, d.about.body),
      primaryLabel: str(a.primaryLabel, d.about.primaryLabel),
      primaryHref: str(a.primaryHref, d.about.primaryHref),
      secondaryLabel: str(a.secondaryLabel, d.about.secondaryLabel),
      secondaryHref: str(a.secondaryHref, d.about.secondaryHref),
    },
  };
}
