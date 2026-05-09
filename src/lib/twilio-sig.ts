import crypto from "node:crypto";

// Shared Twilio webhook signature verifier. Used by both the outbound
// status-callback receiver (/api/twilio/status) and the inbound SMS
// handler (/api/twilio/sms/inbound). Living in one place keeps the
// HMAC math from drifting between the two surfaces.
//
// Twilio signs every webhook with HMAC-SHA1 over (url + sorted form
// params concatenated as key||value pairs) using TWILIO_AUTH_TOKEN as
// the HMAC key. The output is base64.
//
// Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
//
// Critical: callers must reconstruct the URL from a trusted source
// (NEXT_PUBLIC_APP_URL), NOT from request.url — the host header is
// spoofable, and signing against the wrong URL silently passes any
// signature an attacker computes against their own URL.

/**
 * Verify a Twilio webhook signature.
 *
 * @param authToken         TWILIO_AUTH_TOKEN env var
 * @param expectedSignature Value of the `X-Twilio-Signature` header
 * @param url               Reconstructed canonical URL Twilio called
 *                          (e.g. https://www.oyrb.space/api/twilio/sms/inbound)
 * @param form              Parsed form-encoded body as URLSearchParams
 * @returns                 true iff the computed HMAC matches the header
 */
export function verifyTwilioSignature(
  authToken: string,
  expectedSignature: string,
  url: string,
  form: URLSearchParams,
): boolean {
  const sortedKeys = Array.from(form.keys()).sort();
  let payload = url;
  for (const key of sortedKeys) {
    payload += key;
    payload += form.get(key) ?? "";
  }

  const computed = crypto
    .createHmac("sha1", authToken)
    .update(payload, "utf-8")
    .digest("base64");

  // Constant-time compare to defeat timing side channels.
  const a = Buffer.from(computed);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
