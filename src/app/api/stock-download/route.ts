import { NextRequest, NextResponse } from "next/server";

// Unsplash requires clients to hit the photo's download_location endpoint
// whenever a photo is "downloaded" (meaning a user picks it / saves it).
// This is a required attribution step for Production-tier approval.
// Reference: https://help.unsplash.com/en/articles/2511315-guideline-triggering-a-download

export async function POST(request: NextRequest) {
  const { downloadLocation } = (await request.json().catch(() => ({}))) as {
    downloadLocation?: string;
  };

  if (!downloadLocation) {
    return NextResponse.json({ ok: true }); // silent no-op
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ ok: true }); // nothing to track
  }

  // Validate this is actually an Unsplash API URL to prevent misuse
  if (!downloadLocation.startsWith("https://api.unsplash.com/")) {
    return NextResponse.json({ ok: true });
  }

  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
  } catch {
    // best-effort, don't fail the user's pick
  }

  return NextResponse.json({ ok: true });
}
