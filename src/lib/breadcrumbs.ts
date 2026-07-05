import type { Crumb } from "@/components/breadcrumb";

/**
 * Central breadcrumb configuration + builders.
 *
 * Every trail is rooted at Home, and the <Breadcrumb> component renders the
 * final item as the current page (no link, `aria-current="page"`). Keep all
 * breadcrumb data flowing through here so labels/hrefs stay consistent and the
 * canonical <Breadcrumb> component is the single implementation site-wide.
 */

/** The root crumb — always the first entry of every trail. */
export const HOME_CRUMB: Crumb = { label: "Home", href: "/" };

/**
 * Meaningful, human-readable labels for known route segments, so breadcrumbs
 * surface page titles instead of raw slugs. Extend as routes are added.
 */
export const ROUTE_LABELS: Record<string, string> = {
  about: "About Us",
  bulk: "Bulk / B2B",
  faqs: "FAQs",
  gift: "Gifts",
  loyalty: "Loyalty Rewards",
  blog: "Blog",
  wishlist: "Wishlist",
  contact: "Contact",
  account: "My Account",
  policy: "Policies",
  // shop / collections taxonomy
  collections: "Shop",
  all: "Shop",
  "new-arrivals": "New Arrivals",
  "best-sellers": "Best Sellers",
  "neem-wood": "Neem Wood",
  gifts: "Gifts",
  "by-age": "Shop by Age",
  "by-category": "Shop by Category",
};

/** Title-case a slug as a last resort when no explicit label is configured. */
function titleCaseSlug(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Build a breadcrumb trail rooted at Home. Pass the crumbs that come AFTER Home
 * (top level → current). The last entry is the current page; its `href` is
 * ignored by <Breadcrumb>, so it's optional.
 *
 *   crumbs({ label: "Gifts" })
 *   crumbs({ label: "Shop", href: "/collections/all" }, { label: category.nameBn })
 */
export function crumbs(...trail: Crumb[]): Crumb[] {
  return [HOME_CRUMB, ...trail];
}

/**
 * Auto-generate a trail from a route `pathname`, mapping each segment through
 * ROUTE_LABELS (falling back to a title-cased slug) and building cumulative
 * hrefs so every ancestor is clickable. Dynamic segments (a product/post title)
 * can't be derived from their slug, so pass `leafLabel` to give the final crumb
 * a meaningful title.
 *
 *   crumbsFromPath("/blog/my-post", post.title)
 *     → Home / Blog / <post.title>
 */
export function crumbsFromPath(pathname: string, leafLabel?: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  let href = "";
  const trail: Crumb[] = segments.map((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const label =
      isLast && leafLabel
        ? leafLabel
        : ROUTE_LABELS[segment] ?? titleCaseSlug(segment);
    return { label, href };
  });
  return [HOME_CRUMB, ...trail];
}
