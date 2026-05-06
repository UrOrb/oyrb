"use server";

import { headers } from "next/headers";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { TOS_VERSION } from "@/lib/tos-version";

/**
 * Records the current user's re-acceptance of the Terms of Service when
 * the public version is bumped. Mirrors recordSignupConsent's pattern
 * but writes a single 'tos' row (Privacy is unchanged in this phase)
 * and returns { error } on failure so the modal can surface a retry.
 *
 * Append-only: this inserts a NEW user_consents row at the bumped
 * version. The previous (v1.2 etc.) row stays intact — the column-
 * level audit trail records each acceptance event the user has clicked
 * through, not just the latest.
 */
export async function recordTosReacceptance(): Promise<
  { success: true } | { error: string }
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const h = await headers();
    const fwd = h.get("x-forwarded-for") ?? "";
    const ip = fwd.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const ua = h.get("user-agent") || null;

    const admin = createAdminClient();
    const { error } = await admin.from("user_consents").insert({
      user_id: user.id,
      consent_type: "tos",
      version: TOS_VERSION,
      ip_address: ip,
      user_agent: ua,
    });

    if (error) {
      console.error("recordTosReacceptance insert failed:", error);
      return { error: "Couldn't save your acceptance — please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("recordTosReacceptance threw:", err);
    return { error: "Something went wrong — please try again." };
  }
}
