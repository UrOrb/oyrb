import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import {
  REASON_CODES,
  REASON_LABELS,
  REASON_WEIGHTS,
  CLIENT_REASON_CODES,
  MIN_OTHER_DETAIL_CHARS,
  MAX_FILES_PER_SIDE,
  FILEABLE_BOOKING_STATUSES,
  ANTI_REVENGE_WINDOW_MS,
  COUNTER_DEADLINE_MS,
  reasonRequiresDetail,
  type ReasonCode,
} from "@/lib/disputes";
import {
  sendDisputeFiledToPro,
  sendDisputeFiledConfirmation,
} from "@/lib/email";

/**
 * Client-initiated Dispute Inquiry filing. Token-gated (no auth user).
 *
 * Validates: token, booking eligibility, reason code, evidence file
 * count, "other" reason has detail, no prior client-filed dispute on
 * the same booking. Sets priority_review_flag if the pro has filed an
 * anti-revenge candidate against this client in the last 14 days.
 *
 * On success: dispute row inserted, two emails fired (filed-to-pro +
 * filed-confirmation to client), 200 with the new dispute id.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const limit = rateLimit(`disp-file:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many filing attempts. Wait a minute." },
      { status: 429 },
    );
  }

  let body: {
    token?: string;
    reason_code?: string;
    reason_detail?: string;
    evidence_paths?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token || !body.reason_code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Link expired or invalid." }, { status: 401 });
  }

  // Reason code must be in the client-allowed subset.
  const reasonCode = body.reason_code as ReasonCode;
  if (!CLIENT_REASON_CODES.includes(reasonCode)) {
    return NextResponse.json({ error: "Invalid reason code" }, { status: 400 });
  }
  // 'other' requires a meaningful detail.
  const reasonDetail = (body.reason_detail ?? "").trim();
  if (reasonRequiresDetail(reasonCode) && reasonDetail.length < MIN_OTHER_DETAIL_CHARS) {
    return NextResponse.json(
      { error: `Please describe what happened (at least ${MIN_OTHER_DETAIL_CHARS} characters).` },
      { status: 400 },
    );
  }
  if (reasonDetail.length > 1000) {
    return NextResponse.json(
      { error: "Description is too long (max 1000 characters)." },
      { status: 400 },
    );
  }

  const evidencePaths = Array.isArray(body.evidence_paths) ? body.evidence_paths : [];
  if (evidencePaths.length > MAX_FILES_PER_SIDE) {
    return NextResponse.json(
      { error: `Too many files (max ${MAX_FILES_PER_SIDE}).` },
      { status: 400 },
    );
  }
  // Sanity check: every path must be under bookings/{this-bookingId}/client/
  // — ensures a malicious caller can't cite another booking's files.
  const expectedPrefix = `bookings/${resolved.bookingId}/client/`;
  for (const p of evidencePaths) {
    if (typeof p !== "string" || !p.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid evidence path" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();

  // Look up booking + business + client. Booking must be eligible
  // (status ∈ confirmed/completed/cancelled).
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select(`
      id, business_id, status,
      clients(id, name, email),
      businesses(id, owner_id, business_name, contact_email)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = bookingRow as unknown as {
    id: string;
    business_id: string;
    status: string;
    clients: { id: string; name: string; email: string | null } | null;
    businesses: {
      id: string;
      owner_id: string;
      business_name: string;
      contact_email: string | null;
    } | null;
  } | null;

  if (!booking || !booking.clients || !booking.businesses) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (!FILEABLE_BOOKING_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      { error: "This booking isn't eligible for a Dispute Inquiry." },
      { status: 400 },
    );
  }

  // Check uniqueness: one client-filed dispute per booking.
  const { data: existing } = await supabase
    .from("dispute_inquiries")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("reporter_type", "client")
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "You've already filed an inquiry for this booking." },
      { status: 409 },
    );
  }

  // Anti-revenge check: has the pro filed against this client (i.e., a
  // pro-side dispute on a booking belonging to this client) within the
  // last ANTI_REVENGE_WINDOW_DAYS? If yes, set priority_review_flag.
  const cutoff = new Date(Date.now() - ANTI_REVENGE_WINDOW_MS).toISOString();
  const { data: recentReverse } = await supabase
    .from("dispute_inquiries")
    .select("id, bookings!inner(client_id)")
    .eq("business_id", booking.business_id)
    .eq("reporter_type", "pro")
    .gte("filed_at", cutoff)
    .limit(50);
  const reverseRow = (recentReverse ?? []) as unknown as Array<{
    id: string;
    bookings: { client_id: string } | { client_id: string }[];
  }>;
  const priorityFlag = reverseRow.some((r) => {
    const cid = Array.isArray(r.bookings) ? r.bookings[0]?.client_id : r.bookings?.client_id;
    return cid === booking.clients!.id;
  });

  const reporterEmail = resolved.clientEmail;
  const weight = REASON_WEIGHTS[reasonCode];
  const counterDeadline = new Date(Date.now() + COUNTER_DEADLINE_MS);

  const { data: created, error: insertErr } = await supabase
    .from("dispute_inquiries")
    .insert({
      booking_id: booking.id,
      business_id: booking.business_id,
      reporter_type: "client",
      reporter_email: reporterEmail,
      reason_code: reasonCode,
      reason_detail: reasonDetail || null,
      evidence_urls: evidencePaths,
      counter_evidence_urls: [],
      status: "awaiting_counter",
      weight,
      counter_deadline: counterDeadline.toISOString(),
      priority_review_flag: priorityFlag,
    })
    .select("id")
    .single();

  if (insertErr || !created) {
    console.error("Dispute insert failed:", insertErr);
    return NextResponse.json({ error: "Couldn't file the inquiry." }, { status: 500 });
  }

  // Resolve pro email — prefer business.contact_email, fall back to auth.
  let proEmail = booking.businesses.contact_email;
  if (!proEmail) {
    const { data: auth } = await supabase.auth.admin.getUserById(booking.businesses.owner_id);
    proEmail = auth?.user?.email ?? null;
  }

  // Best-effort email fan-out. Failures don't roll back the filing.
  const dashboardUrl = `${APP_URL}/dashboard/disputes/${created.id}`;
  const reasonLabel = REASON_LABELS[reasonCode];

  if (proEmail) {
    await sendDisputeFiledToPro({
      to: proEmail,
      businessId: booking.business_id,
      bookingId: booking.id,
      reporterDisplay: booking.clients.name,
      reasonLabel,
      counterDeadline,
      dashboardUrl,
    }).catch((err) => console.error("dispute filed-to-pro email failed:", err));
  }

  await sendDisputeFiledConfirmation({
    to: reporterEmail,
    businessId: booking.business_id,
    bookingId: booking.id,
    reasonLabel,
    proName: booking.businesses.business_name,
    counterDeadline,
  }).catch((err) => console.error("dispute filed-confirmation email failed:", err));

  return NextResponse.json({ ok: true, id: created.id });
}
