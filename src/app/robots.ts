import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/**
 * /robots.txt — allow crawling of content pages, keep utility/account/dev
 * routes out of the index, and point crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/cart",
        "/checkout",
        "/account",
        "/wishlist",
        "/signin",
        "/search",
        "/styleguide",
        "/bulk-order",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
