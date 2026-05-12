"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/admin";
import { CONFIRMATION_COPY_VERSION } from "./confirmation-copy";
import { sendRemovalCancelledByAdmin } from "./emails";

/**
 * Phase 8 PR 5 — Admin escape hatch for in-grace businesses.
 *
 * Mirrors restoreRemoval (lib/remove-brand/actions.ts) but:
 *   - Takes business_id explicitly rather than reading the active
 *     business off the user session (admin doesn't own the business)
 *   - Skips the owner_id check (admin bypass)
 *   - Writes event_type='cancelled_by_admin' to business_removal_events
 *   - Uses the admin's user.id as actor_user_id, not the pro's
 *   - Sends sendRemovalCancelledByAdmin to the pro instead of the
 *     pro-initiated restore email
 *
 * Gated by requireAdmin() — the env-driven email allowlist that's
 * the existing admin convention (lib/admin.ts). No new table, no
 * per-user role flag.
 *
 * Function-only for PR 5: no admin UI page. Admins call this via
 * the POST /api/admin/remove-brand/cancel route handler (curl during
 * incident response). A future PR can add a UI surface that reuses
 * this function unchanged.
 */

type Result = { ok: true } | { ok: false; error: string };

function readIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

function readUserAgent(h: Headers): string | null {
  return h.get("user-agent")?.slice(0, 500) ?? null;
}

export async function cancelRemovalAsAdmin(
  businessId: string,
): Promise<Result> {
  if (!businessId || typeof businessId !== "string") {
    return { ok: false, error: "business_id is required" };
  }

  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const admin = createAdminClient();

  // Load the row directly (no owner check — admin override).
  const { data: bizRow, error: bizLoadErr } = await admin
    .from("businesses")
    .select(
      "id, business_name, slug, owner_id, contact_email, removal_initiated_at, removal_scheduled_for, removal_pre_initiation_is_published, removal_pre_initiation_is_listed, stripe_subscription_id",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (bizLoadErr) {
    console.error("cancelRemovalAsAdmin load failed:", bizLoadErr);
    return { ok: false, error: "Could not load business." };
  }
  if (!bizRow) {
    return { ok: false, error: "Business not found." };
  }
  if (!bizRow.removal_initiated_at) {
    return {
      ok: false,
      error: "Business is not in a removal grace period.",
    };
  }

  const h = await headers();
  const ip = readIp(h);
  const ua = readUserAgent(h);

  const restoreIsPublished =
    (bizRow.removal_pre_initiation_is_published as boolean | null) ?? false;
  const restoreIsListed =
    (bizRow.removal_pre_initiation_is_listed as boolean | null) ?? false;

  // ── Write 1: businesses ────────────────────────────────────────────
  // Clear all nine removal columns and restore is_published to the
  // pre-state. Filtered by `removal_initiated_at IS NOT NULL` so a
  // race against the pro's own restoreRemoval can't double-write.
  const { error: bizError, data: updatedBiz } = await admin
    .from("businesses")
    .update({
      is_published: restoreIsPublished,
      removal_initiated_at: null,
      removal_initiated_by_user_id: null,
      removal_scheduled_for: null,
      removal_grace_period_days: null,
      removal_initiated_ip: null,
      removal_initiated_user_agent: null,
      removal_confirmation_version: null,
      removal_pre_initiation_is_published: null,
      removal_pre_initiation_is_listed: null,
    })
    .eq("id", businessId)
    .not("removal_initiated_at", "is", null)
    .select("id");

  if (bizError || !updatedBiz || updatedBiz.length === 0) {
    console.error("cancelRemovalAsAdmin businesses update failed", {
      business_id: businessId,
      admin_user_id: gate.user.id,
      error: bizError,
    });
    return { ok: false, error: "Couldn't cancel removal — try again." };
  }

  // ── Write 2: directory_listings ────────────────────────────────────
  if (restoreIsListed) {
    const { error: dirError } = await admin
      .from("directory_listings")
      .update({ is_listed: true })
      .eq("user_id", bizRow.owner_id);
    if (dirError) {
      console.error("cancelRemovalAsAdmin directory restore failed", {
        owner_id: bizRow.owner_id,
        error: dirError,
      });
    }
  }

  // ── Write 3: event row ─────────────────────────────────────────────
  // event_type already accepted by the check constraint (mig 055).
  // actor_user_id is the ADMIN's user id, IP/UA captured from the
  // route handler's request headers.
  const { error: eventError } = await admin
    .from("business_removal_events")
    .insert({
      business_id: businessId,
      event_type: "cancelled_by_admin",
      actor_user_id: gate.user.id,
      ip: ip === "unknown" ? null : ip,
      user_agent: ua,
      copy_version: CONFIRMATION_COPY_VERSION,
    });
  if (eventError) {
    console.error("cancelRemovalAsAdmin event insert failed", {
      business_id: businessId,
      admin_user_id: gate.user.id,
      error: eventError,
    });
  }

  // ── Stripe undo ────────────────────────────────────────────────────
  // Best-effort. Same logic as restoreRemoval: flip the existing sub
  // back to cancel_at_period_end=false. Skip when no sub id.
  try {
    if (bizRow.stripe_subscription_id) {
      await stripe.subscriptions.update(bizRow.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
    }
  } catch (err) {
    console.error("cancelRemovalAsAdmin Stripe undo failed:", err);
  }

  // ── Pro notification ───────────────────────────────────────────────
  // Resolve via contact_email first; fall back to auth email.
  try {
    let email = bizRow.contact_email as string | null;
    if (!email) {
      const { data } = await admin.auth.admin.getUserById(bizRow.owner_id);
      email = data?.user?.email ?? null;
    }
    if (email) {
      await sendRemovalCancelledByAdmin({
        to: email,
        businessName: bizRow.business_name,
      });
    }
  } catch (err) {
    console.error("cancelRemovalAsAdmin email send failed:", err);
  }

  // Refresh layout banner (mounts off the user's removal state) and
  // the storefront which just came back live.
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/s/${bizRow.slug}`);

  console.log(
    `[admin-cancel] business=${businessId} cancelled by admin=${gate.user.email}`,
  );

  return { ok: true };
}
