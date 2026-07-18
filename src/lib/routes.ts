// Routes that render their page "bare" — no global chrome (header, desktop nav
// row, or mobile bottom bar). Auth surfaces (sign in / sign up) are focused
// screens, so the site navigation is hidden there. `/admin` is bare for a
// different reason: it renders its own shell (sidebar + header via
// `AdminShell`), so the storefront chrome would otherwise double up.
export const BARE_ROUTES = ["/signin", "/signup", "/admin"] as const;

/** Is `pathname` an exact match for, or a child of, a bare route? */
export const isBareRoute = (pathname: string): boolean =>
  BARE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

/**
 * Destination for a product's dedicated "Expert Insights" page. Placeholder for
 * now — change ONLY this function once the real URL is known and every "Learn
 * More" link updates automatically (the components read from here, not a literal
 * route). Return a function of the slug so per-product URLs stay possible.
 */
export const expertInsightsHref = (slug: string): string =>
  `/products/${slug}/expert-insights`;
