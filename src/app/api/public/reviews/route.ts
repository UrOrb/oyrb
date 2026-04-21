import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { sanitizePublicText } from "@/lib/directory";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

const HOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Review submit endpoint. Accepts either a `token` (magic-link flow) or
 * `booking_id` (legacy in-flight emails). Both paths verify:
 *   · booking exists + is not cancelled
 *   · appointment has ended (end_at <= now) — we don't let clients
 *     review before their service happens.
 *   · no existing review for this booking (one per booking)
 *
 * Sanitization catches email/phone/address patterns. When the sanitizer
 * flags a field we don't reject the submit — instead the review goes to
 * the admin queue (status='flagged'), so the client isn't stuck
 * rewording and admin gets a look. Otherwise the review enters a 24h
 * hold; a cron flips it live when the hold expires.
 */
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const hit = rateLimit(`review:${ip}`, 6, 60_000);
  if (!hit.ok) {
    return NextResponse.json(
      { error: "Too many attempts — slow down." },
      { status: 429 },
    );
  }

  let body: { booking_id?: string; token?: string; rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating ?? 0))));
  if (!rating) {
    return NextResponse.json({ error: "Rating is required (1–5)." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Resolve bookingId — token takes precedence, falls back to raw id.
  let bookingId: string | null = null;
  if (body.token) {
    const resolved = await resolveToken(body.token);
    if (!resolved || resolved.expired) {
      return NextResponse.json({ error: "Invalid or expired review link." }, { status: 403 });
    }
    bookingId = resolved.bookingId;
  } else if (body.booking_id) {
    bookingId = body.booking_id.trim() || null;
  }
  if (!bookingId) {
    return NextResponse.json({ error: "Missing review link." }, { status: 400 });
  }

  const { data: bookingRow } = await supabase
    .from("bookings")
    .select(`
      id, business_id, client_id, status, end_at,
      clients(name, email),
      businesses(owner_id)
    `)
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingRow as unknown as {
    id: string;
    business_id: string;
    client_id: string | null;
    status: string;
    end_at: string;
    clients: { name: string; email: string | null } | null;
    businesses: { owner_id: string } | null;
  } | null;

  if (!booking || !booking.businesses) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "This booking was cancelled, so it can't be reviewed." },
      { status: 409 },
    );
  }
  if (new Date(booking.end_at).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "You can leave a review once your appointment has happened." },
      { status: 409 },
    );
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "You already submitted a review for this appointment." },
      { status: 409 },
    );
  }

  // Sanitize the comment. When sanitizer rejects we don't kick the user
  // back — we flag the review for admin review instead. This keeps happy
  // paths fast and gives abuse a human-in-the-loop.
  const rawComment = (body.comment ?? "").trim().slice(0, 500);
  let comment: string | null = null;
  let autoFlagReason: "inappropriate" | null = null;
  if (rawComment) {
    const s = sanitizePublicText(rawComment);
    if (s.ok) {
      comment = s.value || null;
    } else {
      comment = rawComment;
      autoFlagReason = "inappropriate";
    }
  }

  // Build reviewer display name: "First L." — never full surname.
  const fullName = booking.clients?.name?.trim() ?? "";
  const parts = fullName.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Anonymous";
  const lastInitial = parts[1] ? parts[1][0].toUpperCase() : "";
  const displayName = lastInitial ? `${first} ${lastInitial}.` : first;

  const now = new Date();
  const status = autoFlagReason ? "flagged" : "pending_24h_hold";
  const publishedAt =
    status === "flagged" ? null : new Date(now.getTime() + HOLD_MS).toISOString();

  const { error } = await supabase.from("reviews").insert({
    business_id: booking.business_id,
    booking_id: booking.id,
    client_id: booking.client_id,
    client_email: booking.clients?.email ?? null,
    client_name: displayName,
    reviewer_first_name: first,
    reviewer_last_initial: lastInitial,
    pro_user_id: booking.businesses.owner_id,
    rating,
    comment,
    status,
    // Dual-write `approved` for back-compat with any reader still using
    // the old boolean filter. Sanitizer-flagged reviews are NOT approved;
    // pending holds are not either.
    approved: false,
    flagged_at: autoFlagReason ? now.toISOString() : null,
    flagged_reason: autoFlagReason,
    published_at: publishedAt,
  });

  if (error) {
    console.error("Review insert error:", error);
    return NextResponse.json(
      { error: "Could not save review right now." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    status,
    goes_live_at: publishedAt,
  });
}
