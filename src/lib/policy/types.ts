/**
 * Content model for the reusable premium Policy page template. A `PolicyContent`
 * object fully describes a policy page (hero, quick summary, content sections,
 * trust badges, and a closing CTA); the template renders it. To add a new policy
 * page, author a new `PolicyContent` and register it — no new components needed.
 */

/** Icon keys used across policy pages, mapped to lucide components in the view. */
export type PolicyIcon =
  | "sparkles"
  | "check-circle"
  | "x-circle"
  | "rotate-ccw"
  | "clock"
  | "shield-check"
  | "message-circle"
  | "mail"
  | "leaf"
  | "badge-check"
  | "truck"
  | "wallet"
  | "credit-card"
  | "package"
  | "info"
  | "alert-triangle"
  | "lock"
  | "file-text"
  | "eye"
  | "cookie"
  | "settings"
  | "scale"
  | "users"
  | "globe"
  | "refresh-cw"
  | "wrench";

export type CalloutTone = "info" | "success" | "warning";

/** A renderable block inside a policy section. Discriminated by `type`. */
export type PolicyBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "checklist"; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "timeline"; items: { title: string; text: string }[] }
  | { type: "callout"; tone?: CalloutTone; title?: string; text: string }
  | { type: "faq"; items: { q: string; a: string }[] };

/** One content card on the page. */
export type PolicySection = {
  id: string;
  icon: PolicyIcon;
  title: string;
  intro?: string;
  blocks: PolicyBlock[];
};

export type PolicySummaryItem = { icon: PolicyIcon; text: string };
export type PolicyTrustItem = { icon: PolicyIcon; label: string };
export type PolicyCtaLink = { label: string; href: string };

/** The full description of a policy page. */
export type PolicyContent = {
  slug: string;
  badge: string;
  title: string;
  intro: string;
  updated: string;
  summary?: PolicySummaryItem[];
  sections: PolicySection[];
  trust?: PolicyTrustItem[];
  cta: {
    title: string;
    text: string;
    primary: PolicyCtaLink;
    secondary?: PolicyCtaLink;
  };
};
