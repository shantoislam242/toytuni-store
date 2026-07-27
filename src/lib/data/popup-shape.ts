/** Editable newsletter pop-up content. Stored as a jsonb blob in `site_settings`
 *  under key `popup`; the hardcoded copy becomes the defaults + fail-soft
 *  fallback, exactly like the other CMS shapes. */

export type PopupContent = {
  /** Master switch — off hides the pop-up entirely. */
  enabled: boolean;
  /** Seconds on the site before it appears (clamped 3–300). */
  delaySeconds: number;
  eyebrow: string;
  heading: string;
  subheading: string;
  buttonLabel: string;
  finePrint: string;
  successHeading: string;
  successBody: string;
  /** Uploaded image URL, or null → bundled default. */
  image: string | null;
};

/** Bundled pop-up image — used when no custom image is uploaded. */
export const DEFAULT_POPUP_IMAGE = "/images/marketing/newsletter.webp";

export const DEFAULT_POPUP: PopupContent = {
  enabled: true,
  delaySeconds: 30,
  eyebrow: "Toytuni family",
  heading: "Join our little community",
  subheading:
    "Be first to hear about new arrivals, sales, and members-only offers — thoughtfully made, straight to your inbox.",
  buttonLabel: "Join Now",
  finePrint: "No spam — just the good stuff. Unsubscribe anytime.",
  successHeading: "You're in! 🎉",
  successBody:
    "Keep an eye on your inbox — new arrivals, sales, and members-only offers are on the way.",
  image: null,
};

/** Trimmed string, or the fallback when missing/blank. */
const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;

/** An uploaded image URL (https) or null (→ bundled default). */
const imageUrl = (v: unknown): string | null =>
  typeof v === "string" && v.startsWith("http") ? v : null;

/** Shape any stored jsonb into a full `PopupContent`, filling every
 *  missing/invalid field from `DEFAULT_POPUP`. Pure — never throws. */
export function rowToPopup(value: unknown): PopupContent {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const d = DEFAULT_POPUP;
  const rawDelay = typeof v.delaySeconds === "number" ? v.delaySeconds : d.delaySeconds;
  const delaySeconds = Math.min(300, Math.max(3, Math.round(rawDelay)));
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : d.enabled,
    delaySeconds,
    eyebrow: str(v.eyebrow, d.eyebrow),
    heading: str(v.heading, d.heading),
    subheading: str(v.subheading, d.subheading),
    buttonLabel: str(v.buttonLabel, d.buttonLabel),
    finePrint: str(v.finePrint, d.finePrint),
    successHeading: str(v.successHeading, d.successHeading),
    successBody: str(v.successBody, d.successBody),
    image: imageUrl(v.image),
  };
}
