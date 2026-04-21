import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

// Client-initiated cancellation via a magic-link token. No auth beyond
// the token itself — the token IS the auth, scoped to this booking only.
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const limit = rateLimit(`cancel:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let body: { token?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, start_at")
    .eq("id", resolved.bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json({ ok: true, already_cancelled: true });
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "client",
      cancel_reason: (body.reason ?? "").slice(0, 500) || null,
    })
    .eq("id", resolved.bookingId);

  if (error) {
    console.error("Cancel update failed:", error);
    return NextResponse.json({ error: "Couldn't cancel — try contacting the pro directly." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
