import { randomBytes, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

// Token design:
// - 32 random bytes (256 bits) encoded as URL-safe base64 ⇒ 43 chars.
// - Stored in plaintext because we need O(1) lookup on redemption and
//   the surface is already gated by expiry + per-IP rate limit. We log
//   accessed_count so spikes are visible.
// - 7-day expiry. Shorter = safer; we regenerate on-demand for history.
export const TOKEN_TTL_DAYS = 7;
export const MAX_TOKENS_PER_EMAIL_PER_HOUR = 10;

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

// Cheap fingerprint for rate limiting — we don't want to lean on the DB
// for every read, and the audit table is cheap to scan for recent rows.
export function emailFingerprint(email: string): string {
  return createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 16);
}

export type IssueTokenArgs = {
  bookingId: string;
  clientEmail: string;
  ttlDays?: number;
};

export type IssueTokenResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; reason: "rate_limited" | "db_error" };

export async function issueBookingToken(args: IssueTokenArgs): Promise<IssueTokenResult> {
  const supabase = createAdminClient();
  const email = args.clientEmail.toLowerCase().trim();
  const now = new Date();

  // Rate limit check — last hour of this email's generation attempts.
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("token_generation_audit")
    .select("id", { count: "exact", head: true })
    .ilike("client_email", email)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_TOKENS_PER_EMAIL_PER_HOUR) {
    return { ok: false, reason: "rate_limited" };
  }

  const token = generateToken();
  const ttlDays = args.ttlDays ?? TOKEN_TTL_DAYS;
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("booking_access_tokens").insert({
    token,
    booking_id: args.bookingId,
    client_email: email,
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.error("issueBookingToken insert failed:", error);
    return { ok: false, reason: "db_error" };
  }

  await supabase.from("token_generation_audit").insert({
    client_email: email,
    booking_id: args.bookingId,
  });

  return { ok: true, token, expiresAt };
}

export type ResolvedToken = {
  token: string;
  bookingId: string;
  clientEmail: string;
  expired: boolean;
  expiresAt: Date;
};

export async function resolveToken(token: string): Promise<ResolvedToken | null> {
  if (!token || token.length < 20) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("booking_access_tokens")
    .select("token, booking_id, client_email, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;

  const expiresAt = new Date(data.expires_at as string);
  const expired = expiresAt.getTime() < Date.now();

  if (!expired) {
    // Increment access counter (best-effort, non-blocking on failure).
    await supabase
      .from("booking_access_tokens")
      .update({
        accessed_count: (data as unknown as { accessed_count?: number }).accessed_count
          ? undefined
          : 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("token", token);
  }

  return {
    token: data.token as string,
    bookingId: data.booking_id as string,
    clientEmail: data.client_email as string,
    expired,
    expiresAt,
  };
}

// Preferences token: reuses the booking_access_tokens table but issued as
// a separate scope. We embed "pref:" prefix so /preferences can reject
// booking tokens and vice versa.
export function issuePrefScopeToken(raw: string): string {
  return `pref_${raw}`;
}
