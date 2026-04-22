import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubEmail } from "@/lib/marketing-unsub";
import { upsertPreferences } from "@/lib/comm-preferences";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * One-click marketing unsubscribe. Link format:
 *   /api/public/marketing/unsubscribe?e=<email>&s=<hmac>
 *
 * Flips `communication_preferences.marketing_enabled = false` (the
 * platform-wide consent). Separately also sets clients.marketing_opt_in
 * to false on EVERY clients row for this email, so pros can't
 * accidentally re-email them via the per-pro opt-in either.
 *
 * Supports both GET (link click) and POST (RFC 8058 One-Click).
 */
async function handle(request: NextRequest) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const sig = url.searchParams.get("s") ?? "";

  if (!email || !sig) {
    return new NextResponse("Missing email or signature", { status: 400 });
  }
  if (!verifyUnsubEmail(email, sig)) {
    return new NextResponse("Invalid unsubscribe link", { status: 403 });
  }

  // 1. Platform-wide marketing OFF.
  await upsertPreferences(email, { marketingEnabled: false });

  // 2. Per-pro opt-in OFF on every clients row for this email — belt and
  //    suspenders against a crafted send that bypassed the comm-prefs
  //    check.
  const admin = createAdminClient();
  await admin
    .from("clients")
    .update({ marketing_opt_in: false })
    .ilike("email", email);

  if (request.method === "POST") {
    return NextResponse.json({ ok: true });
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta name="robots" content="noindex"><title>Unsubscribed</title><style>body{font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:24px;color:#0A0A0A;text-align:center;}a{color:#B8896B;}</style></head><body><h1>Unsubscribed</h1><p>You won't receive any more marketing emails from OYRB pros. This takes effect within 10 minutes across every pro account.</p><p style="color:#737373;font-size:12px;">Booking confirmations and other transactional messages will still be sent when you book a service.</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const GET = handle;
export const POST = handle;
