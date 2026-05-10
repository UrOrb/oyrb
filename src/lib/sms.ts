// Twilio SMS helper. Tier-gated to Studio + Scale.
// Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// Falls back to no-op if env vars not configured (graceful degrade).

import { logNotification, type LogRecipientType } from "@/lib/notification-log";
import { normalizeToE164 } from "@/lib/phone";

// Re-exported here so existing server-side callers (route handlers,
// cron jobs, server actions, the imports row-parser) don't need to
// update their imports. The function definition lives in phone.ts so
// client components can import it without dragging in this module's
// transitive next/headers dependency. See phone.ts for context.
export { normalizeToE164 };

type SendSmsParams = {
  to: string;
  body: string;
  // ── Optional logging context (Phase 1.3) ─────────────────────────────
  // When supplied, sendSms writes a notification_log row at send time
  // (status='sent' on success, 'failed' on Twilio error). Callers without
  // a booking/business context can omit; the row gets NULL for those
  // fields. Purpose defaults to "sms_generic" — pass a KNOWN_PURPOSES
  // value (see src/lib/notification-purposes.ts) when known.
  businessId?: string | null;
  bookingId?: string | null;
  purpose?: string;
  recipientType?: LogRecipientType;
};

export type SubscriptionTier = "starter" | "studio" | "scale";

const SMS_ENABLED_TIERS: SubscriptionTier[] = ["studio", "scale"];

export function tierAllowsSms(tier: SubscriptionTier | string | null | undefined): boolean {
  if (!tier) return false;
  return SMS_ENABLED_TIERS.includes(tier as SubscriptionTier);
}

function hasTwilioCreds() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

/**
 * Production callback URL for Twilio status updates. We only set
 * StatusCallback on production hostnames — preview deploys point at
 * branch-specific URLs that Twilio's outbound POST won't reach (and
 * even if they did, they'd skip our signature check). Production sends
 * get the full delivery-status round trip; preview sends just stay at
 * status='sent' in the log.
 */
function statusCallbackUrl(): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl.includes("oyrb.space")) return null;
  return `${appUrl.replace(/\/$/, "")}/api/twilio/status`;
}

/**
 * Send an SMS via Twilio REST API (no SDK to keep bundle small).
 * Returns silently when Twilio isn't configured — the caller can
 * always call this; it's a no-op until env vars are added.
 *
 * Phase 1.3: writes a notification_log row at send time. Log failures
 * never block the send (logNotification swallows its own errors and
 * returns null).
 */
export async function sendSms(params: SendSmsParams): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const { to, body } = params;

  if (!hasTwilioCreds()) {
    return { ok: false, reason: "twilio_not_configured" };
  }

  // Normalize phone to E.164 (+1 prefix for US if missing)
  const phone = normalizeToE164(to);
  if (!phone) return { ok: false, reason: "invalid_phone" };

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  const form = new URLSearchParams({
    To: phone,
    From: from,
    Body: body,
  });
  const callbackUrl = statusCallbackUrl();
  if (callbackUrl) form.set("StatusCallback", callbackUrl);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Twilio SMS failed:", res.status, errText);
      // Log the failed-at-send-time attempt so pros see the reach attempt
      // even when Twilio rejects it. Fire-and-forget — no await on the
      // log result blocking the caller.
      await logNotification({
        businessId: params.businessId ?? null,
        bookingId: params.bookingId ?? null,
        recipientType: params.recipientType ?? "client",
        channel: "sms",
        purpose: params.purpose ?? "sms_generic",
        providerMessageId: null,
        recipientAddress: phone,
        status: "failed",
        statusDetail: `twilio_${res.status}: ${errText.slice(0, 240)}`,
      });
      return { ok: false, reason: `twilio_error_${res.status}` };
    }

    // Capture the message SID — Twilio returns it in the JSON response.
    // Status callbacks (Phase 1.3) reference rows by provider_message_id.
    let providerMessageId: string | null = null;
    try {
      const payload = (await res.json()) as { sid?: string };
      providerMessageId = payload.sid ?? null;
    } catch {
      // If parsing fails the SMS still went out — we just can't tie a
      // status callback to this row later. Logged as a soft warning.
      console.warn("Twilio response JSON parse failed; SID not captured");
    }

    await logNotification({
      businessId: params.businessId ?? null,
      bookingId: params.bookingId ?? null,
      recipientType: params.recipientType ?? "client",
      channel: "sms",
      purpose: params.purpose ?? "sms_generic",
      providerMessageId,
      recipientAddress: phone,
      status: "sent",
    });

    return { ok: true };
  } catch (err) {
    console.error("SMS send error:", err);
    return { ok: false, reason: "network_error" };
  }
}

// normalizeToE164 lives in src/lib/phone.ts (a deps-free file) and is
// re-exported at the top of this module for back-compat. Client-side
// callers (e.g. the client edit form's phone-normalization preview)
// import it from @/lib/phone directly to avoid dragging in this
// module's notification-log → supabase/server → next/headers chain.
