import { NextRequest, NextResponse } from "next/server";
import { updateNotificationStatusByProviderId } from "@/lib/notification-log";
import type { NotificationStatus } from "@/lib/notification-purposes";
import { verifyTwilioSignature } from "@/lib/twilio-sig";

/**
 * Twilio status callback receiver. Twilio POSTs a form-encoded payload
 * here every time the lifecycle of an outbound message advances
 * (queued → sent → delivered, or sent → undelivered/failed). Production
 * sends register this URL via the StatusCallback param in src/lib/sms.ts;
 * preview deploys deliberately skip the param so they never feed into the
 * production log.
 *
 * Idempotency: providers replay callbacks under transient network
 * conditions; updateNotificationStatusByProviderId only advances rows
 * when the incoming status outranks the current one (sent → terminal).
 *
 * Signature validation: Twilio signs every callback with HMAC-SHA1 over
 * (url + sorted form params concatenated) using TWILIO_AUTH_TOKEN as
 * the key. Mismatch is a hard 401 — non-negotiable per the spec.
 */
export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("/api/twilio/status: TWILIO_AUTH_TOKEN missing");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const signatureHeader = request.headers.get("x-twilio-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Read body as form data. Twilio sends application/x-www-form-urlencoded.
  const rawBody = await request.text();
  const formData = new URLSearchParams(rawBody);

  // Reconstruct the URL Twilio used to call us. NEXT_PUBLIC_APP_URL is
  // the canonical production host; we never sign against the request's
  // own host header (it can be spoofed).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl.includes("oyrb.space")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = `${appUrl.replace(/\/$/, "")}/api/twilio/status`;

  if (!verifyTwilioSignature(authToken, signatureHeader, url, formData)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const messageSid = formData.get("MessageSid");
  const messageStatus = formData.get("MessageStatus");
  const errorCode = formData.get("ErrorCode");
  if (!messageSid || !messageStatus) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const mapped = mapTwilioStatus(messageStatus);
  if (!mapped) {
    // queued / sent / accepted are pre-terminal noise — ack and move on.
    return NextResponse.json({ ok: true, mapped: null });
  }

  const statusDetail = errorCode
    ? `twilio_error_${errorCode}`
    : `twilio_status_${messageStatus}`;

  const result = await updateNotificationStatusByProviderId({
    providerMessageId: messageSid,
    status: mapped,
    statusDetail,
  });

  return NextResponse.json({ ok: true, result });
}

function mapTwilioStatus(s: string): NotificationStatus | null {
  switch (s) {
    case "delivered":
      return "delivered";
    case "undelivered":
      return "undelivered";
    case "failed":
      return "failed";
    // queued / accepted / sending / sent are pre-terminal — log row already
    // sits at status='sent' from the send-time insert.
    default:
      return null;
  }
}

// Twilio signature validation lives in src/lib/twilio-sig.ts — shared
// with the inbound SMS handler at /api/twilio/sms/inbound.
