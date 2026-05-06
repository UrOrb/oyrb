"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  sendDisputeResolved,
  sendStrikeIssued,
  sendStrikeApproachingThreshold,
  sendStorefrontAutoPaused,
} from "@/lib/email";
import { recordStrike } from "@/lib/strikes";

type Outcome = "strike" | "dismissed";
type ActionResult = { success: true } | { error: string };

/**
 * Admin resolves a dispute. Flips status to resolved_strike or
 * resolved_dismissed, stamps resolved_at + admin_notes, sends
 * resolution emails to both sides.
 *
 * Auth-gated by ADMIN_EMAILS env var via requireAdmin(). Strike
 * consequences (auto-pause storefronts on N strikes) are NOT
 * implemented in this PR — that's PR 2.2. This action just records
 * the outcome.
 */
export async function resolveDispute(
  disputeId: string,
  outcome: Outcome,
  adminNotes: string,
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  if (outcome !== "strike" && outcome !== "dismissed") {
    return { error: "Invalid outcome" };
  }
  const trimmedNotes = (adminNotes ?? "").trim().slice(0, 2000);

  const admin = createAdminClient();

  const { data: dispute } = await admin
    .from("dispute_inquiries")
    .select(`
      id, business_id, booking_id, reporter_type, reporter_email, status,
      businesses(contact_email, owner_id, business_name),
      bookings(client_id, clients(email))
    `)
    .eq("id", disputeId)
    .maybeSingle();

  const row = dispute as unknown as {
    id: string;
    business_id: string;
    booking_id: string;
    reporter_type: "client" | "pro";
    reporter_email: string;
    status: string;
    businesses: {
      contact_email: string | null;
      owner_id: string;
      business_name: string;
    } | null;
    bookings: {
      client_id: string;
      clients: { email: string | null } | { email: string | null }[] | null;
    } | null;
  } | null;

  if (!row || !row.businesses) {
    return { error: "Dispute not found." };
  }
  // Idempotent: already resolved? No-op so duplicate clicks don't
  // re-send emails.
  if (row.status === "resolved_strike" || row.status === "resolved_dismissed") {
    return { error: "Already resolved." };
  }
  // Only under_review (or awaiting_counter — admin can resolve early
  // if obviously frivolous) can be resolved.
  if (row.status !== "under_review" && row.status !== "awaiting_counter") {
    return { error: "Only inquiries in review can be resolved." };
  }

  const newStatus = outcome === "strike" ? "resolved_strike" : "resolved_dismissed";

  const { error: updErr } = await admin
    .from("dispute_inquiries")
    .update({
      status: newStatus,
      resolved_at: new Date().toISOString(),
      admin_notes: trimmedNotes || null,
    })
    .eq("id", disputeId);

  if (updErr) {
    console.error("resolveDispute update failed:", updErr);
    return { error: "Couldn't save the resolution." };
  }

  // ── Phase 2.2 strike accumulation ────────────────────────────────
  // Only client-filed disputes resolved as 'strike' accumulate against
  // the pro. Pro-filed disputes resolved as 'strike' are the admin's
  // way of agreeing the pro's complaint was credible — there's no
  // client-strike system yet (Phase 2.3 may surface this), so they're
  // a no-op for the pause logic.
  //
  // recordStrike() is fire-and-monitor: if it throws, we log but don't
  // fail the resolve action — the dispute outcome is already saved and
  // the pro/client emails should still go out. The strike accumulation
  // can be retried by re-running resolve (idempotent under the hood
  // because strike_paused_at filter prevents double-pauses).
  let strikeStanding: Awaited<ReturnType<typeof recordStrike>> | null = null;
  if (outcome === "strike" && row.reporter_type === "client") {
    try {
      strikeStanding = await recordStrike(row.business_id);
    } catch (err) {
      console.error("recordStrike failed (continuing with resolution):", err);
    }
  }

  // Resolve pro email — prefer business.contact_email, fall back to auth.
  let proEmail = row.businesses.contact_email;
  if (!proEmail) {
    const { data: auth } = await admin.auth.admin.getUserById(row.businesses.owner_id);
    proEmail = auth?.user?.email ?? null;
  }

  // Resolve client email — prefer the join, fall back to reporter_email
  // if the dispute was client-filed (reporter_email was the client's).
  const clientObj = Array.isArray(row.bookings?.clients)
    ? row.bookings?.clients[0] ?? null
    : row.bookings?.clients ?? null;
  const clientEmail =
    clientObj?.email ??
    (row.reporter_type === "client" ? row.reporter_email : null);

  // Email both sides. The reporter_type drives which copy variant
  // each recipient gets — see sendDisputeResolved.
  if (clientEmail) {
    await sendDisputeResolved({
      to: clientEmail,
      recipientType: "client",
      businessId: row.business_id,
      bookingId: row.booking_id,
      outcome,
      adminNotes: trimmedNotes || null,
    }).catch((err) => console.error("dispute resolved client email failed:", err));
  }
  if (proEmail) {
    await sendDisputeResolved({
      to: proEmail,
      recipientType: "pro",
      businessId: row.business_id,
      bookingId: row.booking_id,
      outcome,
      adminNotes: trimmedNotes || null,
    }).catch((err) => console.error("dispute resolved pro email failed:", err));
  }

  // Strike-consequence email — exactly one of three based on the
  // post-strike standing. sendDisputeResolved (above) communicated the
  // OUTCOME; this communicates the STANDING. Skipped entirely for
  // dismissed resolutions and for pro-filed strikes (which don't
  // accumulate against the pro).
  if (strikeStanding && proEmail) {
    const { standing, triggeredPause } = strikeStanding;
    const baseParams = {
      to: proEmail,
      businessId: row.business_id,
      count: standing.count,
      weightedTotal: standing.weightedTotal,
      thresholdCount: standing.thresholdCount,
      thresholdWeighted: standing.thresholdWeighted,
      windowDays: standing.windowDays,
    };
    if (triggeredPause) {
      await sendStorefrontAutoPaused(baseParams).catch((err) =>
        console.error("storefront-auto-paused email failed:", err),
      );
    } else if (standing.approachingThreshold) {
      await sendStrikeApproachingThreshold(baseParams).catch((err) =>
        console.error("strike-approaching-threshold email failed:", err),
      );
    } else {
      await sendStrikeIssued(baseParams).catch((err) =>
        console.error("strike-issued email failed:", err),
      );
    }
  }

  revalidatePath(`/dashboard/admin/disputes/${disputeId}`);
  revalidatePath(`/dashboard/admin/disputes`);
  return { success: true };
}
