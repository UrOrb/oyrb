import { NextRequest, NextResponse } from "next/server";
import { resolveToken } from "@/lib/booking-tokens";
import { upsertPreferences } from "@/lib/comm-preferences";

// One-click unsubscribe endpoint. Referenced in List-Unsubscribe headers
// and in email footers. Must respond to both GET (link click) and POST
// (one-click per RFC 8058). Scope can be "rebook", "marketing", or "all".
async function handle(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const scope = (url.searchParams.get("scope") ?? "all").toLowerCase();

  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const resolved = await resolveToken(token);
  if (!resolved) {
    return new NextResponse("Invalid link", { status: 404 });
  }
  if (resolved.expired) {
    return new NextResponse("Link expired — use the unsubscribe link in a more recent email.", { status: 410 });
  }

  if (scope === "rebook") {
    await upsertPreferences(resolved.clientEmail, { rebookRemindersEnabled: false });
  } else if (scope === "marketing") {
    await upsertPreferences(resolved.clientEmail, { marketingEnabled: false });
  } else {
    await upsertPreferences(resolved.clientEmail, { unsubscribeAll: true });
  }

  if (request.method === "POST") {
    return NextResponse.json({ ok: true });
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta name="robots" content="noindex"><title>Unsubscribed</title><style>body{font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:24px;color:#0A0A0A;text-align:center;}a{color:#B8896B;}</style></head><body><h1>Unsubscribed</h1><p>Your preferences have been updated. It may take up to 10 minutes to apply across all emails.</p><p><a href="/preferences/${token}">Manage more preferences</a></p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export const GET = handle;
export const POST = handle;
