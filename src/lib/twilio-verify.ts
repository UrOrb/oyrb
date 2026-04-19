// Twilio Verify wrappers — 6-digit SMS OTP verification.
// Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

export function verifyConfigured() {
  return !!(ACCOUNT_SID && AUTH_TOKEN && SERVICE_SID);
}

function auth() {
  return "Basic " + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
}

// Normalize US phone input to E.164 (+1...)
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

export async function sendVerificationCode(phone: string): Promise<{ ok: boolean; error?: string }> {
  if (!verifyConfigured()) {
    return { ok: false, error: "Verification not configured." };
  }
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { ok: false, error: "Invalid phone number — please include area code." };
  }

  const body = new URLSearchParams({ To: normalized, Channel: "sms" });
  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${SERVICE_SID}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: auth(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.message ?? "Couldn't send code." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network issue reaching Twilio." };
  }
}

export async function checkVerificationCode(
  phone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  if (!verifyConfigured()) {
    return { ok: false, error: "Verification not configured." };
  }
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { ok: false, error: "Invalid phone number." };
  }

  const body = new URLSearchParams({ To: normalized, Code: code });
  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${SERVICE_SID}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: auth(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.message ?? "Verification failed." };
    }
    if (data.status === "approved") {
      return { ok: true };
    }
    return { ok: false, error: "That code isn't right. Double-check and try again." };
  } catch {
    return { ok: false, error: "Network issue reaching Twilio." };
  }
}
