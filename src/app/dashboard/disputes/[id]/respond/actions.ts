"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { MAX_FILES_PER_SIDE } from "@/lib/disputes";

type ActionResult = { success: true } | { error: string };

/**
 * Pro counter-evidence commit. Called after the browser has uploaded
 * files via signed-URL pattern; this action takes the resulting paths
 * and stamps them on the dispute row's counter_evidence_urls.
 *
 * Auth-gated to the dispute owner; returns "not_found" framing for
 * other users to match the detail-page existence-leak protection from
 * PR #20.
 *
 * Submitting counter-evidence does NOT auto-flip the dispute status —
 * the cron sweeper handles that when the 48h window closes (or the
 * pro can manually mark themselves done if we add that affordance
 * later). This action just persists the file paths.
 */
export async function submitCounterEvidence(
  disputeId: string,
  paths: string[],
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!Array.isArray(paths)) return { error: "Invalid evidence paths" };
  if (paths.length > MAX_FILES_PER_SIDE) {
    return { error: `Too many files (max ${MAX_FILES_PER_SIDE}).` };
  }

  const admin = createAdminClient();

  const { data: dispute } = await admin
    .from("dispute_inquiries")
    .select("id, business_id, booking_id, status, businesses(owner_id)")
    .eq("id", disputeId)
    .maybeSingle();
  const row = dispute as unknown as {
    id: string;
    business_id: string;
    booking_id: string;
    status: string;
    businesses: { owner_id: string } | null;
  } | null;

  if (!row || !row.businesses || row.businesses.owner_id !== user.id) {
    return { error: "Inquiry not found." };
  }
  if (row.status !== "awaiting_counter") {
    return { error: "Counter-evidence window has closed for this inquiry." };
  }

  // Path sanity — every path must be under bookings/{this-booking}/pro/
  const expectedPrefix = `bookings/${row.booking_id}/pro/`;
  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith(expectedPrefix)) {
      return { error: "Invalid evidence path" };
    }
  }

  const { error: updErr } = await admin
    .from("dispute_inquiries")
    .update({ counter_evidence_urls: paths })
    .eq("id", disputeId);

  if (updErr) {
    console.error("submitCounterEvidence update failed:", updErr);
    return { error: "Couldn't save your evidence. Please try again." };
  }

  revalidatePath(`/dashboard/disputes/${disputeId}`);
  return { success: true };
}
