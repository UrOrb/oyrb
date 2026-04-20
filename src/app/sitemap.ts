import type { MetadataRoute } from "next";
import { getIndexableSlugs } from "@/lib/directory";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

/**
 * Sitemap includes:
 *   · The public marketing routes (home, pricing, templates, /find)
 *   · Only directory listings where the pro explicitly enabled indexing
 *
 * When a pro delists or disables indexing, they fall out of the sitemap
 * on the next request — no separate "remove from Google" step needed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/pricing`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/templates`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/features`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/find`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const slugs = await getIndexableSlugs();
    const listingUrls: MetadataRoute.Sitemap = slugs.map((slug) => ({
      url: `${BASE_URL}/find/${slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
    return [...staticUrls, ...listingUrls];
  } catch {
    // If the DB query fails (migration not applied yet, etc.), return the
    // static URLs — better than a broken sitemap.
    return staticUrls;
  }
}
