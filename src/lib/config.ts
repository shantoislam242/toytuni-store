// Brand name. Use BRAND_NAME everywhere — never hardcode a name.
export const BRAND_NAME = "Toytuni";

// Canonical site origin, used for metadataBase, canonical URLs, sitemap, robots
// and absolute OG image URLs. Override with NEXT_PUBLIC_SITE_URL in the
// deployment when a custom domain is attached. No trailing slash.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://toytuni-store.vercel.app";

// One-line brand descriptor, reused in headers/meta/footer.
export const BRAND_TAGLINE = "Neem-wood, non-toxic, handmade toys for little ones";

// Short paragraph used in the footer brand block.
export const BRAND_DESCRIPTION =
  "Handmade, non-toxic neem-wood toys — thoughtfully crafted for little hands and big imaginations. Safe play, built to last and loved.";
