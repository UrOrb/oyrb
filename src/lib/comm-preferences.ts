import { createAdminClient } from "@/lib/supabase/server";

// Suppression model — a single row per email address. Every outbound
// email to clients passes through `isSuppressed()` (for rebook/marketing)
// or uses the stored per-type flag. Booking confirmations always send
// (transactional), but they include an unsubscribe link.

export type CommPreferences = {
  email: string;
  rebookRemindersEnabled: boolean;
  marketingEnabled: boolean;
  dataDeletionRequestedAt: string | null;
  unsubscribedAt: string | null;
};

export async function getPreferences(email: string): Promise<CommPreferences> {
  const supabase = createAdminClient();
  const key = email.toLowerCase().trim();
  const { data } = await supabase
    .from("communication_preferences")
    .select("email, rebook_reminders_enabled, marketing_enabled, data_deletion_requested_at, unsubscribed_at")
    .eq("email", key)
    .maybeSingle();

  return {
    email: key,
    rebookRemindersEnabled: (data?.rebook_reminders_enabled as boolean | undefined) ?? true,
    marketingEnabled: (data?.marketing_enabled as boolean | undefined) ?? false,
    dataDeletionRequestedAt: (data?.data_deletion_requested_at as string | null | undefined) ?? null,
    unsubscribedAt: (data?.unsubscribed_at as string | null | undefined) ?? null,
  };
}

export async function canSendRebookReminder(email: string): Promise<boolean> {
  const pref = await getPreferences(email);
  if (pref.unsubscribedAt) return false;
  if (pref.dataDeletionRequestedAt) return false;
  return pref.rebookRemindersEnabled;
}

export type UpdatePrefPatch = {
  rebookRemindersEnabled?: boolean;
  marketingEnabled?: boolean;
  unsubscribeAll?: boolean;
  requestDataDeletion?: boolean;
};

export async function upsertPreferences(email: string, patch: UpdatePrefPatch): Promise<CommPreferences> {
  const supabase = createAdminClient();
  const key = email.toLowerCase().trim();
  const nowIso = new Date().toISOString();

  const row: Record<string, unknown> = { email: key };
  if (patch.rebookRemindersEnabled !== undefined) row.rebook_reminders_enabled = patch.rebookRemindersEnabled;
  if (patch.marketingEnabled !== undefined) row.marketing_enabled = patch.marketingEnabled;
  if (patch.unsubscribeAll) {
    row.unsubscribed_at = nowIso;
    row.rebook_reminders_enabled = false;
    row.marketing_enabled = false;
  }
  if (patch.requestDataDeletion) row.data_deletion_requested_at = nowIso;

  await supabase.from("communication_preferences").upsert(row, { onConflict: "email" });
  return getPreferences(key);
}
