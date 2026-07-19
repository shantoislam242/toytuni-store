import { ageTiers } from "./age-tiers";
import { categories } from "./categories";

export type NavLink = { labelBn: string; href: string };

/** Top-level nav links (excluding the Age/Category mega dropdowns). */
export const mainNav: NavLink[] = [
  { labelBn: "Home", href: "/" },
  { labelBn: "All Products", href: "/collections/all" },
  { labelBn: "Bulk", href: "/bulk" },
  { labelBn: "Gift", href: "/gift" },
  { labelBn: "Loyalty", href: "/loyalty" },
  { labelBn: "Blog", href: "/blog" },
  { labelBn: "Contact", href: "/contact" },
];

/** Mega-dropdown sources (reused by header dropdown + mobile drawer). */
export const ageNav: NavLink[] = ageTiers.map((t) => ({
  labelBn: t.labelBn,
  href: t.href,
}));

export const categoryNav: NavLink[] = categories.map((c) => ({
  labelBn: c.nameBn,
  href: c.href,
}));

/** A titled column of links for the "By Category" desktop mega-menu. */
export type NavGroup = { heading: string; links: NavLink[] };

/** Resolve a category slug to its nav link (keeps labels/hrefs in sync with the
 *  categories source; unknown slugs still resolve to a /collections stub page). */
const catLink = (slug: string): NavLink => {
  const c = categories.find((x) => x.slug === slug);
  return { labelBn: c?.nameBn ?? slug, href: c?.href ?? `/collections/${slug}` };
};

/**
 * Grouped taxonomy for the desktop "By Category" mega-menu. The existing eight
 * category collections are organised under a few headings; every link points at
 * a real (or graceful-stub) /collections page. The mobile drawer keeps the flat
 * `categoryNav` list.
 */
export const categoryGroups: NavGroup[] = [
  {
    heading: "Toys",
    links: [catLink("teethers"), catLink("rattles"), catLink("blocks")],
  },
  {
    heading: "Puzzles & Sorting",
    links: [catLink("stacking-sorting-puzzles")],
  },
  {
    heading: "Developmental Aids",
    links: [catLink("toddler-walking"), catLink("push-pull"), catLink("ride-on")],
  },
  {
    heading: "Montessori & Learning",
    links: [catLink("montessori")],
  },
];

/** Footer "Information" column. */
export const footerInfo: NavLink[] = [
  { labelBn: "Search", href: "/search" },
  { labelBn: "Refund Policy", href: "/policy/refund" },
  { labelBn: "Privacy Policy", href: "/policy/privacy" },
  { labelBn: "Terms & Conditions", href: "/policy/terms" },
  { labelBn: "Shipping Policy", href: "/policy/shipping" },
  { labelBn: "FAQs", href: "/faqs" },
];

/** Footer link columns. Unknown /collections and /policy slugs render graceful
 *  stub pages, so every link resolves without a 404. */
export const footerShop: NavLink[] = [
  { labelBn: "All Products", href: "/collections/all" },
  { labelBn: "Shop by Age", href: "/collections/by-age" },
  { labelBn: "Shop by Category", href: "/collections/by-category" },
  { labelBn: "New Arrivals", href: "/collections/new-arrivals" },
  { labelBn: "Gift Ideas", href: "/gift" },
  { labelBn: "Bulk Orders", href: "/bulk" },
];

export const footerCustomerCare: NavLink[] = [
  { labelBn: "My Account", href: "/account" },
  { labelBn: "Track Order", href: "/track-order" },
  { labelBn: "Sign In", href: "/signin" },
  { labelBn: "Create Account", href: "/signin" },
  { labelBn: "Wishlist", href: "/wishlist" },
  { labelBn: "Cart", href: "/cart" },
  { labelBn: "Shipping", href: "/policy/shipping" },
  { labelBn: "FAQs", href: "/faqs" },
  { labelBn: "Contact Us", href: "/contact" },
];

export const footerAbout: NavLink[] = [
  { labelBn: "About Us", href: "/about" },
  { labelBn: "Blog", href: "/blog" },
  { labelBn: "Safety Standards", href: "/policy/safety-standards" },
  { labelBn: "Sustainability", href: "/policy/sustainability" },
];

export const footerSupport: NavLink[] = [
  { labelBn: "Privacy Policy", href: "/policy/privacy" },
  { labelBn: "Terms & Conditions", href: "/policy/terms" },
  { labelBn: "Returns & Refund Policy", href: "/policy/returns" },
  { labelBn: "Contact Information", href: "/contact" },
];

/** Policy links shown in the bottom copyright bar. */
export const policyLinks: NavLink[] = [
  { labelBn: "Privacy Policy", href: "/policy/privacy" },
  { labelBn: "Terms & Conditions", href: "/policy/terms" },
  { labelBn: "Refund Policy", href: "/policy/refund" },
];

export type Social = {
  label: string;
  href: string;
  icon: "facebook" | "instagram" | "tiktok" | "youtube" | "globe";
};

/** "Follow us" socials — Facebook, Instagram, TikTok, YouTube. */
export const socials: Social[] = [
  { label: "Facebook", href: "#", icon: "facebook" },
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "TikTok", href: "#", icon: "tiktok" },
  { label: "YouTube", href: "#", icon: "youtube" },
];

/** Mobile bottom navigation bar. */
export const bottomNav = [
  { labelBn: "Home", href: "/", icon: "home" as const },
  { labelBn: "Products", href: "/collections/all", icon: "grid" as const },
  { labelBn: "Cart", href: "/cart", icon: "cart" as const },
  { labelBn: "Profile", href: "/signin", icon: "user" as const },
];
