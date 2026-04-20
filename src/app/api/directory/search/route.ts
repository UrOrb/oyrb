import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import { searchPublicListings } from "@/lib/directory";

/**
 * JSON search endpoint used by bots, share links, and any future client-side
 * filtering UI. Hard rate-limited at 60/min/IP to prevent scraping.
 */
export async function GET(request: NextRequest) {
  const ip = ipFromRequest(request);
  const rl = rateLimit(`directory:search:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  const { searchParams } = request.nextUrl;
  const city = searchParams.get("city") ?? undefined;
  const specialty = searchParams.get("specialty") ?? undefined;
  const listings = await searchPublicListings({ city, specialty, limit: 60 });
  return NextResponse.json({ listings }, {
    headers: {
      // Shallow cache so repeat requests don't keep hitting Supabase.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
    },
  });
}
