import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { updateNotificationStatusByProviderId } from "@/lib/notification-log";
import type { NotificationStatus } from "@/lib/notification-purposes";

/**
 * Resend webhook receiver (Svix-signed). Resend POSTs an event envelope
 * for every state transition we subscribe to in the dashboard
 * (email.delivered, email.bounced, email.complained). The event's
 * data.email_id matches the Resend message id we captured at send time
 * into notification_log.provider_message_id.
 *
 * Idempotency: same as Twilio — updateNotificationStatusByProviderId
 * only advances rows when the incoming status outranks the current one,
 * so duplicate or out-of-order callbacks are no-ops.
 *
 * Signature validation: Svix HMAC-SHA256 over `${id}.${timestamp}.${body}`
 * keyed by RESEND_WEBHOOK_SECRET. Verified via the svix npm package
 * (Resend's recommended path). Mismatch returns 401 — non-negotiable.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("/api/resend/webhook: RESEND_WEBHOOK_SECRET missing");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();

  let event: ResendEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const messageId = event.data?.email_id;
  if (!messageId) {
    return NextResponse.json({ ok: true, mapped: null });
  }

  const mapped = mapResendEventType(event.type);
  if (!mapped) {
    // email.sent / email.opened / email.clicked are not lifecycle status
    // changes we track. Ack quickly so Resend stops retrying.
    return NextResponse.json({ ok: true, mapped: null });
  }

  const statusDetail = buildStatusDetail(event);

  const result = await updateNotificationStatusByProviderId({
    providerMessageId: messageId,
    status: mapped.status,
    statusDetail,
  });

  return NextResponse.json({ ok: true, result });
}

type ResendEvent = {
  type: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string; subType?: string; message?: string };
    complaint?: { type?: string; message?: string };
  };
};

/**
 * Spec maps email.complained → 'failed' (the spec enum is frozen).
 * status_detail preserves the nuance: support pulling rows where
 * statusDetail starts with "complained:" gets us the spam-complaints
 * subset without an enum extension.
 */
function mapResendEventType(t: string): { status: NotificationStatus } | null {
  switch (t) {
    case "email.delivered":
      return { status: "delivered" };
    case "email.bounced":
      return { status: "bounced" };
    case "email.complained":
      return { status: "failed" };
    default:
      return null;
  }
}

function buildStatusDetail(event: ResendEvent): string {
  if (event.type === "email.bounced" && event.data?.bounce) {
    const b = event.data.bounce;
    return `bounced ${b.type ?? ""}${b.subType ? `/${b.subType}` : ""}${b.message ? `: ${b.message.slice(0, 200)}` : ""}`.trim();
  }
  if (event.type === "email.complained") {
    const message = event.data?.complaint?.message ?? "";
    return `complained: marked as spam${message ? ` (${message.slice(0, 200)})` : ""}`;
  }
  return event.type;
}
