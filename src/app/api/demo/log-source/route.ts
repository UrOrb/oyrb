import { NextRequest, NextResponse } from "next/server";

/**
 * Ultra-light source tracking for the demo. The client posts once per
 * visit with ?src=ig|tiktok|x|linkedin|email|direct. We log it server-
 * side so you can grep deploy logs to count traffic by source without
 * standing up a full analytics stack.
 */
export async function POST(request: NextRequest) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const src = request.nextUrl.searchParams.get("src") ?? "unknown";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const ua = request.headers.get("user-agent") ?? "?";
  console.log(`[demo-src] ${new Date().toISOString()} src=${src} ip=${ip} ua="${ua.slice(0, 80)}"`);
  return NextResponse.json({ ok: true });
}
