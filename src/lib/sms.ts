// Twilio SMS helper. Tier-gated to Studio + Scale.
// Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
// Falls back to no-op if env vars not configured (graceful degrade).

type SendSmsParams = {
  to: string;
  body: string;
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
 * Send an SMS via Twilio REST API (no SDK to keep bundle small).
 * Returns silently when Twilio isn't configured — the caller can
 * always call this; it's a no-op until env vars are added.
 */
export async function sendSms({ to, body }: SendSmsParams): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (!hasTwilioCreds()) {
    return { ok: false, reason: "twilio_not_configured" };
  }

  // Normalize phone to E.164 (+1 prefix for US if missing)
  const phone = normalizeToE164(to);
  if (!phone) return { ok: false, reason: "invalid_phone" };

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: from,
          Body: body,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Twilio SMS failed:", res.status, err);
      return { ok: false, reason: `twilio_error_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("SMS send error:", err);
    return { ok: false, reason: "network_error" };
  }
}

/**
 * Normalize a US-style phone number to E.164. Returns null if invalid.
 */
function normalizeToE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
