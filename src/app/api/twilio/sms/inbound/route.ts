import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { logNotification } from "@/lib/notification-log";
import { normalizeToE164 } from "@/lib/sms";
import { verifyTwilioSignature } from "@/lib/twilio-sig";

/**
 * Twilio inbound SMS receiver. Twilio POSTs a form-encoded payload here
 * every time a client texts OYRB's toll-free number. Branches on the
 * message body:
 *
 *   STOP-family (STOP, STOPALL, STOP ALL, UNSUBSCRIBE, CANCEL, QUIT, END):
 *     Cross-business consent withdrawal — every clients row whose phone
 *     normalizes to the inbound `From` gets sms_consent=false. Logged
 *     to notification_log with purpose='inbound_stop'. No auto-reply
 *     (Twilio's carrier-level handler already sent the legally-required
 *     confirmation; we don't double-send).
 *
 *   HELP-family (HELP, INFO):
 *     Logged with purpose='inbound_help'. Replies with a branded
 *     OYRB help message under 160 chars (single SMS segment).
 *
 *   Anything else:
 *     Logged with purpose='inbound_other' and the body truncated to
 *     500 chars in status_detail. No auto-reply — clients texting a
 *     pro conversationally shouldn't get a robot back.
 *
 * Keyword matching is exact-match-on-trimmed-uppercase-body per TCPA
 * convention: "STOP NOW please" doesn't count; "stop" lowercased does.
 *
 * Idempotency: Twilio replays under transient network conditions. We
 * pre-check notification_log.provider_message_id and skip already-
 * processed MessageSids.
 *
 * Always returns 200 (or 401 for invalid signatures) — even on
 * internal failures we return empty TwiML so Twilio doesn't retry-storm.
 * Internal errors go to console.error for diagnostics.
 *
 * Security: signature validation against TWILIO_AUTH_TOKEN is required
 * on every request. Without it, anyone could spoof inbound messages and
 * force opt-outs on arbitrary phone numbers.
 */

// Exact-match keyword sets per TCPA convention.
const STOP_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "STOP ALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "QUIT",
  "END",
]);
const HELP_KEYWORDS = new Set(["HELP", "INFO"]);

// Single SMS segment is 160 GSM-7 chars. Branded reply must fit.
const HELP_REPLY =
  "OYRB: Reply STOP to unsubscribe. For booking help, contact your beauty pro directly. Visit oyrb.space for more info.";

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>';

function emptyTwiml(): NextResponse {
  return new NextResponse(TWIML_EMPTY, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function twimlMessage(body: string): NextResponse {
  // XML-escape just to be safe — the body is a hardcoded constant
  // today, but if it ever takes a dynamic input we don't want a raw
  // ampersand to break the response.
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escaped}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("/api/twilio/sms/inbound: TWILIO_AUTH_TOKEN missing");
    // Can't validate the signature without the token; replying empty
    // 200 is safer than 500 (avoids Twilio retry storm) and skipping
    // the body entirely is safer than trusting an unverified payload.
    return emptyTwiml();
  }

  const signatureHeader = request.headers.get("x-twilio-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const formData = new URLSearchParams(rawBody);

  // Reconstruct the URL Twilio called from a trusted source. Never
  // trust request.url — host header is spoofable.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl.includes("oyrb.space")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = `${appUrl.replace(/\/$/, "")}/api/twilio/sms/inbound`;

  if (!verifyTwilioSignature(authToken, signatureHeader, url, formData)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Past the security boundary — every code path below returns 200.
  try {
    const messageSid = formData.get("MessageSid") ?? "";
    const fromRaw = formData.get("From") ?? "";
    const body = formData.get("Body") ?? "";

    if (!messageSid || !fromRaw) {
      console.warn("/api/twilio/sms/inbound: missing MessageSid or From");
      return emptyTwiml();
    }

    const admin = createAdminClient();

    // Idempotency: Twilio retries replay the same MessageSid. If we've
    // already logged this SID, skip — the previous run's effects
    // (consent updates, log row) already happened. Mirrors the
    // SELECT-then-skip pattern in updateNotificationStatusByProviderId.
    const { data: existing } = await admin
      .from("notification_log")
      .select("id")
      .eq("provider_message_id", messageSid)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return emptyTwiml();
    }

    const fromPhone = normalizeToE164(fromRaw);
    if (!fromPhone) {
      // Malformed inbound number — still log the event so the audit
      // trail captures every Twilio-validated inbound, even when the
      // From field doesn't normalize.
      console.warn(
        "/api/twilio/sms/inbound: malformed From phone:",
        fromRaw.slice(0, 32),
      );
      await logNotification({
        recipientType: "client",
        channel: "sms",
        purpose: "inbound_other",
        providerMessageId: messageSid,
        recipientAddress: null,
        status: "received",
        statusDetail: "malformed_from",
      });
      return emptyTwiml();
    }

    const keyword = body.trim().toUpperCase();

    if (STOP_KEYWORDS.has(keyword)) {
      await handleStop(admin, fromPhone, messageSid);
      // No auto-reply — Twilio's carrier-level STOP handler already
      // sent the legally-required confirmation.
      return emptyTwiml();
    }

    if (HELP_KEYWORDS.has(keyword)) {
      await logNotification({
        recipientType: "client",
        channel: "sms",
        purpose: "inbound_help",
        providerMessageId: messageSid,
        recipientAddress: fromPhone,
        status: "received",
      });
      return twimlMessage(HELP_REPLY);
    }

    // Anything else: log, no auto-reply.
    await logNotification({
      recipientType: "client",
      channel: "sms",
      purpose: "inbound_other",
      providerMessageId: messageSid,
      recipientAddress: fromPhone,
      status: "received",
      // Truncate to 500 chars — guards against pathological message
      // bodies pumping the audit-log column. The full message lives in
      // Twilio's logs if ever needed.
      statusDetail: body.slice(0, 500),
    });
    return emptyTwiml();
  } catch (err) {
    console.error("/api/twilio/sms/inbound: unexpected error:", err);
    // Always 200 — Twilio retries on 5xx, and a transient error
    // (DB blip, etc.) shouldn't trigger a retry storm that re-fires
    // every successful side effect.
    return emptyTwiml();
  }
}

/**
 * Cross-business STOP handling. Pulls every client with a phone on
 * file, normalizes each via normalizeToE164, and updates the matching
 * rows. Performance note: with thousands of clients across dozens of
 * pros this is a O(n) memory scan. Acceptable for inbound-STOP
 * volume; a normalized-phone index is future work if needed.
 *
 * The logNotification row is written with no business_id — the STOP
 * is cross-business by design. Auditors looking for "did this client
 * opt out of pro X's SMS?" should query clients.sms_consent on the
 * specific client row, not the notification_log entry.
 */
async function handleStop(
  admin: ReturnType<typeof createAdminClient>,
  fromPhone: string,
  messageSid: string,
): Promise<void> {
  const { data: candidates, error: fetchErr } = await admin
    .from("clients")
    .select("id, phone")
    .not("phone", "is", null);

  if (fetchErr) {
    console.error("/api/twilio/sms/inbound: clients fetch failed:", fetchErr.message);
    // Still log the inbound event so the STOP itself is on record even
    // if the consent updates didn't land. Pro-side reconciliation is
    // a manual ops process today.
    await logNotification({
      recipientType: "client",
      channel: "sms",
      purpose: "inbound_stop",
      providerMessageId: messageSid,
      recipientAddress: fromPhone,
      status: "received",
      statusDetail: "clients_fetch_failed",
    });
    return;
  }

  const matchIds: string[] = [];
  for (const c of (candidates ?? []) as Array<{ id: string; phone: string | null }>) {
    if (!c.phone) continue;
    if (normalizeToE164(c.phone) === fromPhone) {
      matchIds.push(c.id);
    }
  }

  if (matchIds.length > 0) {
    const nowIso = new Date().toISOString();
    const { error: updErr } = await admin
      .from("clients")
      .update({
        sms_consent: false,
        sms_consent_at: nowIso,
        sms_consent_source: "inbound_stop",
      })
      .in("id", matchIds);
    if (updErr) {
      console.error(
        "/api/twilio/sms/inbound: clients update failed:",
        updErr.message,
      );
    }
  }

  await logNotification({
    recipientType: "client",
    channel: "sms",
    purpose: "inbound_stop",
    providerMessageId: messageSid,
    recipientAddress: fromPhone,
    status: "received",
    statusDetail:
      matchIds.length > 0
        ? `clients_updated=${matchIds.length}`
        : "no_matching_clients",
  });
}
