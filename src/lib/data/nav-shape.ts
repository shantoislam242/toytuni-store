import {
  mainNav, footerShop, footerCustomerCare, footerAbout, footerSupport, socials,
} from "@/lib/mock/nav";

export type NavLink = { labelBn: string; href: string };
export type SocialIcon = "facebook" | "instagram" | "tiktok" | "youtube" | "globe";
export type Social = { label: string; href: string; icon: SocialIcon };

/** Editable header/footer navigation, stored in `site_settings` key `nav`. The
 *  Age/Category mega-menus stay derived from the (already admin-editable)
 *  taxonomy; the mobile bottom bar stays structural. */
export type NavContent = {
  main: NavLink[];
  footerShop: NavLink[];
  footerCustomerCare: NavLink[];
  footerAbout: NavLink[];
  footerSupport: NavLink[];
  socials: Social[];
};

export const SOCIAL_ICONS: SocialIcon[] = ["facebook", "instagram", "tiktok", "youtube", "globe"];

export const DEFAULT_NAV: NavContent = {
  main: mainNav,
  footerShop,
  footerCustomerCare,
  footerAbout,
  footerSupport,
  socials,
};

// ── normalizers ──────────────────────────────────────────────────────────────
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const str = (v: unknown, fb: string): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fb;
const socialIcon = (v: unknown): SocialIcon =>
  SOCIAL_ICONS.includes(v as SocialIcon) ? (v as SocialIcon) : "globe";

/** Keep only rows with a non-blank label AND href; empty list → default. */
function linkList(v: unknown, fb: NavLink[]): NavLink[] {
  if (!Array.isArray(v)) return fb;
  const out = v
    .map((it) => rec(it))
    .filter((r) => typeof r.labelBn === "string" && r.labelBn.trim() && typeof r.href === "string" && r.href.trim())
    .map((r) => ({ labelBn: (r.labelBn as string).trim(), href: (r.href as string).trim() }));
  return out.length ? out : fb;
}

/** Shape any stored jsonb into a full `NavContent`. Pure — never throws. Social
 *  hrefs may be blank/"#" (a social with no link is just hidden by the footer). */
export function rowToNav(value: unknown): NavContent {
  const v = rec(value);
  const d = DEFAULT_NAV;
  const socialsOut = Array.isArray(v.socials)
    ? v.socials.map((it, i) => {
        const r = rec(it);
        return {
          label: str(r.label, d.socials[i]?.label ?? "Social"),
          href: str(r.href, "#"),
          icon: socialIcon(r.icon),
        };
      })
    : d.socials;
  return {
    main: linkList(v.main, d.main),
    footerShop: linkList(v.footerShop, d.footerShop),
    footerCustomerCare: linkList(v.footerCustomerCare, d.footerCustomerCare),
    footerAbout: linkList(v.footerAbout, d.footerAbout),
    footerSupport: linkList(v.footerSupport, d.footerSupport),
    socials: socialsOut.length ? socialsOut : d.socials,
  };
}
