import { createAdminClient } from "@/lib/supabase/server";

export type BanTrigger =
  | "duplicate_phone"
  | "duplicate_email"
  | "duplicate_payment_method_fingerprint"
  | "device_fingerprint_threshold"
  | "manual";

/**
 * Insert a single ban row, idempotently. Skips if the (email or phone)
 * is already on the list — re-running the detector or replaying a
 * webhook never double-bans.
 */
export async function addBan(input: {
  email?: string | null;
  phone?: string | null;
  reason: string;
  trigger: BanTrigger;
  triggeringAttemptIds?: string[];
}): Promise<{ inserted: boolean; reason?: string }> {
  const admin = createAdminClient();
  const email = input.email?.toLowerCase().trim() || null;
  const phone = input.phone?.trim() || null;
  if (!email && !phone) return { inserted: false, reason: "no_identifier" };

  // Idempotency: skip if either identifier is already banned.
  if (email) {
    const { data: existing } = await admin
      .from("trial_ban_list")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) return { inserted: false, reason: "email_already_banned" };
  }
  if (phone) {
    const { data: existing } = await admin
      .from("trial_ban_list")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (existing) return { inserted: false, reason: "phone_already_banned" };
  }

  const { error } = await admin.from("trial_ban_list").insert({
    email,
    phone,
    reason: input.reason,
    trigger_reason: input.trigger,
    triggering_attempt_ids: input.triggeringAttemptIds ?? null,
  });
  if (error) return { inserted: false, reason: error.message };
  return { inserted: true };
}
