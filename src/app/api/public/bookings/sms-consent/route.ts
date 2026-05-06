import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

/**
 * Magic-link SMS consent toggle. Mirrors the cancel/reschedule pattern:
 *
 *   - Token-gated (the resolved booking token IS the auth — no Supabase
 *     session needed; clients aren't OYRB users).
 *   - Rate-limited 10/min per IP, matching cancel + reschedule.
 *   - Service-role admin client writes the consent row; clients table
 *     RLS allows owner SELECT but writes always go through the admin
 *     path.
 *
 * Documented consent: every accepted opt-in (and every opt-out) writes
 * IP + user-agent + timestamp + source='magic_link'. Opt-outs flip
 * sms_consent=false but keep the timestamp/IP/UA — we want the audit
 * trail to record the opt-out as well as the opt-in.
 *
 * Phone fallback: if the client has no phone on file, the body may
 * include a phone string; we save it on the same write so they don't
 * need a second round-trip. We don't validate phone format strictly
 * (Twilio normalizes at send time via normalizeToE164) — just ensure
 * it has digits.
 */
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const limit = rateLimit(`smscon:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let body: { token?: string; consent?: boolean; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token || typeof body.consent !== "boolean") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Link expired or invalid." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Look up the client row (id) via the booking → client_id join. The
  // token is bound to a booking; we use that to find the right client
  // row to update.
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("client_id, business_id")
    .eq("id", resolved.bookingId)
    .maybeSingle();
  if (!bookingRow?.client_id) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const ua = request.headers.get("user-agent") || null;
  const nowIso = new Date().toISOString();

  // Optional phone update — only when supplied AND non-empty. Twilio
  // does the E.164 normalization at send time, so we just store the
  // raw input here.
  const phoneTrimmed = (body.phone ?? "").trim();
  const phoneDigits = phoneTrimmed.replace(/\D/g, "");
  const phonePatch: { phone?: string } = {};
  if (phoneTrimmed.length > 0) {
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: "That phone number doesn't look right." },
        { status: 400 },
      );
    }
    phonePatch.phone = phoneTrimmed;
  }

  const { error: updateErr } = await supabase
    .from("clients")
    .update({
      ...phonePatch,
      sms_consent: body.consent,
      sms_consent_at: nowIso,
      sms_consent_ip: ip ?? null,
      sms_consent_user_agent: ua,
      sms_consent_source: "magic_link",
    })
    .eq("id", bookingRow.client_id);

  if (updateErr) {
    console.error("sms-consent update failed:", updateErr);
    return NextResponse.json(
      { error: "Couldn't save your preference. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
