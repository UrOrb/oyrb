import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

/**
 * Robots policy:
 *   · Googlebot, Bingbot, DuckDuckBot — allowed across the site.
 *   · /dashboard, /admin — disallowed for every bot (sensitive).
 *   · /find — allowed (individual listings still carry their own
 *     `noindex` meta unless the pro opted in to indexing, so scrapers
 *     that honor robots find the list page but not non-consented
 *     detail pages).
 *   · Known aggressive scrapers are explicitly disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api/", "/dashboard/admin", "/booking/", "/preferences/", "/b/"],
      },
      // Aggressive commercial scrapers — directory content is not for resale.
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "ClaudeBot",
          "anthropic-ai",
          "Amazonbot",
          "Bytespider",
          "Google-Extended",
          "PerplexityBot",
        ],
        disallow: "/find",
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
