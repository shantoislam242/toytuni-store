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

/** Footer "Information" column. */
export const footerInfo: NavLink[] = [
  { labelBn: "Search", href: "/search" },
  { labelBn: "Refund Policy", href: "/policy/refund" },
  { labelBn: "Privacy Policy", href: "/policy/privacy" },
  { labelBn: "Terms & Conditions", href: "/policy/terms" },
  { labelBn: "Shipping Policy", href: "/policy/shipping" },
  { labelBn: "FAQs", href: "/faqs" },
];

export type Social = { label: string; href: string; icon: "facebook" | "instagram" | "youtube" | "globe" };

export const socials: Social[] = [
  { label: "Facebook", href: "#", icon: "facebook" },
  { label: "Instagram", href: "#", icon: "instagram" },
  { label: "YouTube", href: "#", icon: "youtube" },
  { label: "Website", href: "#", icon: "globe" },
];

/** Mobile bottom navigation bar. */
export const bottomNav = [
  { labelBn: "Home", href: "/", icon: "home" as const },
  { labelBn: "Category", href: "/collections/all", icon: "grid" as const },
  { labelBn: "Cart", href: "/cart", icon: "cart" as const },
  { labelBn: "Profile", href: "/signin", icon: "user" as const },
];
