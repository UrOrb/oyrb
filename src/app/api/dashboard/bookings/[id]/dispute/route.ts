import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  REASON_LABELS,
  REASON_WEIGHTS,
  PRO_REASON_CODES,
  MIN_OTHER_DETAIL_CHARS,
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
 * Pro-initiated Dispute Inquiry filing. Auth-gated to the booking
 * owner. Mirrors the client-side filing route's logic but uses
 * Supabase auth instead of a magic-link token. v1 doesn't include
 * evidence file upload from the pro filing surface — pros can email
 * support@oyrb.space with attachments or use the counter-evidence
 * upload UI on the dispute detail page after filing.
 *
 * Notification fan-out: the "filed-to-pro" email goes to the CLIENT
 * (the respondent in a pro-filed inquiry), and the "filed-confirmation"
 * goes to the pro (the reporter). The email helpers were named for
 * the typical client-filed case but the recipients flip when the pro
 * files.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: bookingId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { reason_code?: string; reason_detail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.reason_code) {
    return NextResponse.json({ error: "Missing reason_code" }, { status: 400 });
  }

  const reasonCode = body.reason_code as ReasonCode;
  if (!PRO_REASON_CODES.includes(reasonCode)) {
    return NextResponse.json({ error: "Invalid reason code for pro filing" }, { status: 400 });
  }

  const reasonDetail = (body.reason_detail ?? "").trim();
  if (reasonRequiresDetail(reasonCode) && reasonDetail.length < MIN_OTHER_DETAIL_CHARS) {
    return NextResponse.json(
      { error: `Please describe what happened (at least ${MIN_OTHER_DETAIL_CHARS} characters).` },
      { status: 400 },
    );
  }
  if (reasonDetail.length > 1000) {
    return NextResponse.json({ error: "Description is too long (max 1000 characters)." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Look up booking, verify ownership.
  const { data: bookingRow } = await admin
    .from("bookings")
    .select(`
      id, business_id, status,
      clients(id, name, email),
      businesses(id, owner_id, business_name)
    `)
    .eq("id", bookingId)
    .maybeSingle();

  const booking = bookingRow as unknown as {
    id: string;
    business_id: string;
    status: string;
    clients: { id: string; name: string; email: string | null } | null;
    businesses: { id: string; owner_id: string; business_name: string } | null;
  } | null;

  if (!booking || !booking.businesses || booking.businesses.owner_id !== user.id) {
    // 404 (not 403) on owner mismatch — match detail-page pattern.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!booking.clients) {
    return NextResponse.json({ error: "Booking has no client to file against" }, { status: 400 });
  }
  if (!FILEABLE_BOOKING_STATUSES.includes(booking.status)) {
    return NextResponse.json(
      { error: "This booking isn't eligible for a Dispute Inquiry." },
      { status: 400 },
    );
  }

  // One pro-filed dispute per booking.
  const { data: existing } = await admin
    .from("dispute_inquiries")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("reporter_type", "pro")
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "You've already filed an inquiry for this booking." },
      { status: 409 },
    );
  }

  // Anti-revenge cross-check: has the CLIENT filed against this pro
  // within the last 14 days? If so, flag this pro-filed inquiry as
  // priority for admin review.
  const cutoff = new Date(Date.now() - ANTI_REVENGE_WINDOW_MS).toISOString();
  const { data: recentClientFilings } = await admin
    .from("dispute_inquiries")
    .select("id, bookings!inner(client_id)")
    .eq("business_id", booking.business_id)
    .eq("reporter_type", "client")
    .gte("filed_at", cutoff)
    .limit(50);
  const reverseRow = (recentClientFilings ?? []) as unknown as Array<{
    id: string;
    bookings: { client_id: string } | { client_id: string }[];
  }>;
  const priorityFlag = reverseRow.some((r) => {
    const cid = Array.isArray(r.bookings) ? r.bookings[0]?.client_id : r.bookings?.client_id;
    return cid === booking.clients!.id;
  });

  const weight = REASON_WEIGHTS[reasonCode];
  const counterDeadline = new Date(Date.now() + COUNTER_DEADLINE_MS);

  const { data: created, error: insertErr } = await admin
    .from("dispute_inquiries")
    .insert({
      booking_id: booking.id,
      business_id: booking.business_id,
      reporter_type: "pro",
      reporter_email: user.email,
      reason_code: reasonCode,
      reason_detail: reasonDetail || null,
      evidence_urls: [],
      counter_evidence_urls: [],
      status: "awaiting_counter",
      weight,
      counter_deadline: counterDeadline.toISOString(),
      priority_review_flag: priorityFlag,
    })
    .select("id")
    .single();

  if (insertErr || !created) {
    console.error("Pro dispute insert failed:", insertErr);
    return NextResponse.json({ error: "Couldn't file the inquiry." }, { status: 500 });
  }

  // Notify the client (the respondent in a pro-filed inquiry).
  const reasonLabel = REASON_LABELS[reasonCode];
  const dashboardUrl = `${APP_URL}/dashboard/disputes/${created.id}`;

  if (booking.clients.email) {
    await sendDisputeFiledToPro({
      to: booking.clients.email,
      businessId: booking.business_id,
      bookingId: booking.id,
      reporterDisplay: booking.businesses.business_name,
      reasonLabel,
      counterDeadline,
      dashboardUrl: `${APP_URL}/booking`, // Clients don't have a dashboard URL — placeholder; spec acknowledges client respondent flow is v1-deferred.
    }).catch((err) => console.error("pro dispute notify-respondent failed:", err));
  }

  // Confirmation to the filing pro.
  await sendDisputeFiledConfirmation({
    to: user.email,
    businessId: booking.business_id,
    bookingId: booking.id,
    reasonLabel,
    proName: booking.clients.name,
    counterDeadline,
  }).catch((err) => console.error("pro dispute filed-confirmation failed:", err));

  return NextResponse.json({ ok: true, id: created.id, dashboardUrl });
}
