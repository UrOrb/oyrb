import { NextRequest, NextResponse } from "next/server";

// Proxies Unsplash's search API so the access key stays server-side.
// Add UNSPLASH_ACCESS_KEY env var to enable. Without it, returns empty + fallback flag.

type UnsplashPhoto = {
  id: string;
  urls: { regular: string; small: string; thumb: string };
  alt_description: string | null;
  user: { name: string; links: { html: string } };
  links: { download_location: string };
};

type UnsplashResponse = {
  results: UnsplashPhoto[];
  total_pages: number;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const orientation = searchParams.get("orientation") || "landscape";
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!query) {
    return NextResponse.json({ photos: [], fallback: true });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ photos: [], fallback: true, reason: "not_configured" });
  }

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "24");
  url.searchParams.set("page", String(page));
  if (orientation === "portrait" || orientation === "landscape" || orientation === "squarish") {
    url.searchParams.set("orientation", orientation);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) {
      return NextResponse.json({ photos: [], fallback: true, reason: "api_error" });
    }
    const data = (await res.json()) as UnsplashResponse;
    return NextResponse.json({
      photos: data.results.map((p) => ({
        id: p.id,
        url: p.urls.regular,
        thumb: p.urls.small,
        alt: p.alt_description ?? "",
        photographer: p.user.name,
        photographerUrl: p.user.links.html,
        downloadLocation: p.links.download_location,
      })),
      totalPages: data.total_pages,
      fallback: false,
    });
  } catch {
    return NextResponse.json({ photos: [], fallback: true, reason: "network_error" });
  }
}
