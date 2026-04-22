import { createHmac, timingSafeEqual } from "crypto";

// HMAC-signed marketing unsubscribe tokens. Sidesteps the per-booking
// magic-link flow because marketing recipients aren't always bookers yet
// (e.g. imported contacts, future forms). Each link carries the email
// plus a signature that the server recomputes to verify authenticity.
//
// Secret rotation: bump MARKETING_UNSUB_SECRET to invalidate all
// outstanding links at once. Old links return 403 on redemption but the
// user can still unsubscribe by replying or via their comm-preferences
// page under any other valid booking token.

function secret(): string {
  const s = process.env.MARKETING_UNSUB_SECRET;
  if (!s) {
    // Fall back to CRON_SECRET so we always have *some* secret in an
    // env that forgot to set MARKETING_UNSUB_SECRET. Still server-only;
    // never reused for client-visible purposes.
    const fallback = process.env.CRON_SECRET;
    if (!fallback) {
      throw new Error("MARKETING_UNSUB_SECRET (or CRON_SECRET) must be set");
    }
    return fallback;
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/**
 * Returns a signature for an email address. Used in unsubscribe URLs
 * like /api/public/marketing/unsubscribe?e=<email>&s=<sig>.
 */
export function signUnsubEmail(email: string): string {
  return sign(email.toLowerCase().trim());
}

export function verifyUnsubEmail(email: string, providedSig: string): boolean {
  const expected = signUnsubEmail(email);
  if (expected.length !== providedSig.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, "base64url"),
      Buffer.from(providedSig, "base64url"),
    );
  } catch {
    return false;
  }
}

/**
 * Build a marketing unsubscribe URL. Works for any email — no prior
 * booking or token issuance required.
 */
export function marketingUnsubUrl(email: string, appUrl?: string): string {
  const base = appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";
  const sig = signUnsubEmail(email);
  return `${base}/api/public/marketing/unsubscribe?e=${encodeURIComponent(email)}&s=${sig}`;
}
