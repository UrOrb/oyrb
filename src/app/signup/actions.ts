"use server";

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// Versioned consent strings — bump when the corresponding document materially
// changes so a fresh acceptance is required. The same constants live on the
// /terms and /privacy pages (TOS_VERSION / PRIVACY_VERSION); keep them in
// sync if the legal docs change.
const TOS_VERSION = "v1.1";
const PRIVACY_VERSION = "v1.1";

/**
 * Records the current user's acceptance of the Terms of Service and Privacy
 * Policy. Called from the signup form immediately after a successful
 * supabase.auth.signUp(). Safe to call multiple times — each call inserts a
 * fresh log row with the current timestamp + version, which is exactly what
 * we want for an immutable audit trail.
 *
 * Returns silently on any error so a logging hiccup never blocks the user
 * from completing signup; the click-through itself is the legal contract,
 * the log is supporting evidence.
 */
export async function recordSignupConsent(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    const h = await headers();
    const fwd = h.get("x-forwarded-for") ?? "";
    const ip = fwd.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const ua = h.get("user-agent") || null;

    const admin = createAdminClient();
    await admin.from("user_consents").insert([
      { user_id: user.id, consent_type: "tos", version: TOS_VERSION, ip_address: ip, user_agent: ua },
      { user_id: user.id, consent_type: "privacy", version: PRIVACY_VERSION, ip_address: ip, user_agent: ua },
    ]);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
