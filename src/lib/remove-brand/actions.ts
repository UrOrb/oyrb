"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getCurrentBusiness } from "@/lib/current-site";
import {
  CONFIRMATION_COPY_VERSION,
  REMOVAL_GRACE_PERIOD_DAYS,
  businessNameMatches,
} from "./confirmation-copy";
import {
  sendRemovalInitiated,
  sendRemovalRestored,
} from "./emails";

/**
 * Phase 8 PR 4 — Remove Brand server actions.
 *
 *   initiateRemoval — pro confirms removal on /dashboard/settings/
 *                     remove-brand. Sets the removal_* columns,
 *                     snapshots pre-state, unpublishes the storefront
 *                     AND the directory tile, flips the Stripe sub
 *                     to cancel_at_period_end=true, writes an
 *                     `initiated` row to business_removal_events,
 *                     and emails the pro a receipt with a restore
 *                     link.
 *   restoreRemoval — pro clicks "Restore now" on the dashboard banner
 *                     or "Restore my brand" on the Remove Brand
 *                     page. Clears the removal_* columns, restores
 *                     visibility flags to their pre-initiation snapshot,
 *                     flips the Stripe sub to cancel_at_period_end=false,
 *                     writes a `restored` row, and emails a confirmation.
 *
 * The cron-driven finalization (cascade-delete after grace expires)
 * lands in Phase 8 PR 5. Until then, these two actions are the entire
 * state machine.
 *
 * Atomicity: Postgres doesn't support cross-table transactions through
 * PostgREST, so we sequence: (1) update businesses, (2) update
 * directory_listings, (3) insert event row. If step 2 or 3 fails after
 * step 1 succeeds, the businesses row is the source of truth — the
 * directory tile may stay visible for ~seconds until reconciliation,
 * which is acceptable for a destructive action that already has the
 * pro's confirmation. Stripe + email are explicitly best-effort and
 * never roll back the DB state.
 *
 * IP / UA captured from next/headers (server-action context) and
 * persisted to businesses + business_removal_events. ON DELETE
 * RESTRICT on the actor FKs guarantees the audit record outlives
 * out-of-band auth.users deletions.
 */

type Result = { ok: true } | { ok: false; error: string };

/** Best-effort IP extraction from server-action request headers. */
function readIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Stripe user-agent string is allowed up to 500 chars in audit. */
function readUserAgent(h: Headers): string | null {
  return h.get("user-agent")?.slice(0, 500) ?? null;
}

export async function initiateRemoval(
  formData: FormData,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const business = await getCurrentBusiness();
  if (!business) return { ok: false, error: "No business found" };

  // Already in grace? Refuse to re-initiate — the banner / page
  // should already be showing the restore UI. Idempotent: returning
  // ok:true would re-write the timestamp and shift the deletion date,
  // which is the opposite of what an accidental double-click should do.
  if (business.removal_initiated_at) {
    return {
      ok: false,
      error:
        "This brand is already in the removal grace period. Refresh the page.",
    };
  }

  // Three-way gate: both checkboxes + business name match. The form
  // disables the submit button until all three are true, so this is
  // defense-in-depth against a crafted POST.
  const dataDownloaded = formData.get("data_downloaded") === "on";
  const understandPermanent = formData.get("understand_permanent") === "on";
  const typedName = (formData.get("business_name") as string | null) ?? "";

  if (!dataDownloaded || !understandPermanent) {
    return {
      ok: false,
      error: "Both confirmations are required.",
    };
  }
  if (!businessNameMatches(typedName, business.business_name)) {
    return {
      ok: false,
      error: "Business name doesn't match. Type it exactly.",
    };
  }

  const h = await headers();
  const ip = readIp(h);
  const ua = readUserAgent(h);

  const now = new Date();
  const scheduledFor = new Date(
    now.getTime() + REMOVAL_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );

  // Read the pre-initiation directory state alongside the businesses
  // row that getCurrentBusiness already loaded. Single row (one
  // directory listing per pro user; user_id is the PK).
  const admin = createAdminClient();
  const { data: directoryRow } = await admin
    .from("directory_listings")
    .select("is_listed")
    .eq("user_id", user.id)
    .maybeSingle();
  const preIsListed = (directoryRow?.is_listed as boolean | undefined) ?? null;

  // ── Write 1: businesses ────────────────────────────────────────────
  // Flip is_published, set the eight removal columns, snapshot pre-state.
  // Guarded by `removal_initiated_at IS NULL` so two near-simultaneous
  // initiations can't double-stamp.
  const { error: bizError, data: updatedBiz } = await admin
    .from("businesses")
    .update({
      is_published: false,
      removal_initiated_at: now.toISOString(),
      removal_initiated_by_user_id: user.id,
      removal_scheduled_for: scheduledFor.toISOString(),
      removal_grace_period_days: REMOVAL_GRACE_PERIOD_DAYS,
      removal_initiated_ip: ip === "unknown" ? null : ip,
      removal_initiated_user_agent: ua,
      removal_confirmation_version: CONFIRMATION_COPY_VERSION,
      removal_pre_initiation_is_published: business.is_published,
      removal_pre_initiation_is_listed: preIsListed,
    })
    .eq("id", business.id)
    .eq("owner_id", user.id)
    .is("removal_initiated_at", null)
    .select("id");

  if (bizError || !updatedBiz || updatedBiz.length === 0) {
    console.error("initiateRemoval businesses update failed", {
      business_id: business.id,
      user_id: user.id,
      error: bizError,
    });
    return {
      ok: false,
      error: "Couldn't start the removal. Please try again.",
    };
  }

  // ── Write 2: directory_listings ────────────────────────────────────
  // Hide the /find tile too. Best-effort — if this fails the
  // storefront 404 is already in effect; the directory tile may stay
  // visible for ~seconds. The PR 5 cron will clean up on finalize
  // regardless.
  if (preIsListed) {
    const { error: dirError } = await admin
      .from("directory_listings")
      .update({ is_listed: false })
      .eq("user_id", user.id);
    if (dirError) {
      console.error("initiateRemoval directory_listings update failed", {
        user_id: user.id,
        error: dirError,
      });
    }
  }

  // ── Write 3: append to business_removal_events ─────────────────────
  // Cycle history. Append-only. Service-role insert.
  const { error: eventError } = await admin
    .from("business_removal_events")
    .insert({
      business_id: business.id,
      event_type: "initiated",
      actor_user_id: user.id,
      ip: ip === "unknown" ? null : ip,
      user_agent: ua,
      copy_version: CONFIRMATION_COPY_VERSION,
    });
  if (eventError) {
    console.error("initiateRemoval event insert failed", {
      business_id: business.id,
      user_id: user.id,
      error: eventError,
    });
  }

  // ── Stripe: cancel_at_period_end on the user's subscription ───────
  // Best-effort. The subscription holds the *account*-level plan; one
  // sub per user (mig 009), shared across every business the user
  // owns. We pull the sub id by user, not by business, to handle the
  // multi-site case correctly — though removing one of many sites
  // probably shouldn't cancel the account-level sub. Today the
  // dashboard is single-site-per-account in practice; v1's
  // deleteAccount also cancels the user-level sub indiscriminately,
  // so this matches existing behavior.
  try {
    const { data: subRow } = await admin
      .from("account_subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const subId =
      (subRow?.stripe_subscription_id as string | undefined) ?? null;
    if (subId) {
      await stripe.subscriptions.update(subId, {
        cancel_at_period_end: true,
      });
    }
  } catch (err) {
    console.error("initiateRemoval Stripe cancel_at_period_end failed", {
      user_id: user.id,
      error: err,
    });
  }

  // ── Email receipt with restore link ────────────────────────────────
  // Best-effort. The pro needs this in case they lose dashboard
  // access — the email carries the deletion date and a deep link to
  // the Remove Brand page where they can one-click restore.
  try {
    const ownerEmail =
      business.contact_email ??
      (await admin.auth.admin.getUserById(user.id)).data?.user?.email ??
      null;
    if (ownerEmail) {
      await sendRemovalInitiated({
        to: ownerEmail,
        businessName: business.business_name,
        scheduledFor,
      });
    }
  } catch (err) {
    console.error("initiateRemoval email send failed", {
      user_id: user.id,
      error: err,
    });
  }

  // Refresh everything that displays state — the layout banner mounts
  // off this user's removal state, and the storefront / Settings /
  // Remove Brand page all read business columns.
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/s/${business.slug}`);

  return { ok: true };
}

/**
 * Void-returning wrapper for direct use in `<form action={...}>`
 * from a Server Component (the dashboard banner). Next.js requires
 * the form action's return type to be `void | Promise<void>`;
 * `restoreRemoval` returns `Result` so the in-page Restore button
 * (which uses useTransition) can surface errors. The banner has no
 * error surface and just re-renders after the action runs, so
 * dropping the return value is fine. Failures are still logged
 * inside `restoreRemoval`.
 */
export async function restoreRemovalAction(formData: FormData): Promise<void> {
  await restoreRemoval(formData);
}

export async function restoreRemoval(
  _formData?: FormData,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const business = await getCurrentBusiness();
  if (!business) return { ok: false, error: "No business found" };

  // Idempotent: if not in grace, nothing to restore.
  if (!business.removal_initiated_at) {
    return {
      ok: false,
      error: "This brand is not in a removal grace period.",
    };
  }

  const h = await headers();
  const ip = readIp(h);
  const ua = readUserAgent(h);

  const admin = createAdminClient();

  // Snapshot the pre-initiation flags BEFORE we clear them — we
  // restore visibility to that exact prior state. A pro who was
  // intentionally unpublished/unlisted stays that way.
  const restoreIsPublished =
    (business.removal_pre_initiation_is_published as boolean | null) ?? false;
  const restoreIsListed =
    (business.removal_pre_initiation_is_listed as boolean | null) ?? false;

  // ── Write 1: businesses ────────────────────────────────────────────
  // Clear all nine removal columns and restore is_published to the
  // pre-state. Guarded by `removal_initiated_at IS NOT NULL` so a
  // double-click doesn't race against another restore.
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
    .eq("id", business.id)
    .eq("owner_id", user.id)
    .not("removal_initiated_at", "is", null)
    .select("id");

  if (bizError || !updatedBiz || updatedBiz.length === 0) {
    console.error("restoreRemoval businesses update failed", {
      business_id: business.id,
      user_id: user.id,
      error: bizError,
    });
    return {
      ok: false,
      error: "Couldn't restore. Please try again.",
    };
  }

  // ── Write 2: directory_listings ────────────────────────────────────
  // Restore the tile only if it was listed pre-initiation. Best-effort.
  if (restoreIsListed) {
    const { error: dirError } = await admin
      .from("directory_listings")
      .update({ is_listed: true })
      .eq("user_id", user.id);
    if (dirError) {
      console.error("restoreRemoval directory_listings update failed", {
        user_id: user.id,
        error: dirError,
      });
    }
  }

  // ── Write 3: event row ─────────────────────────────────────────────
  const { error: eventError } = await admin
    .from("business_removal_events")
    .insert({
      business_id: business.id,
      event_type: "restored",
      actor_user_id: user.id,
      ip: ip === "unknown" ? null : ip,
      user_agent: ua,
      // Pin the CURRENT copy version — useful when reconstructing
      // "what was the affirmation language at the time the pro
      // initiated this cycle?" we already have the initiation row
      // with its own copy_version; this row marks the version in
      // force when restore happened.
      copy_version: CONFIRMATION_COPY_VERSION,
    });
  if (eventError) {
    console.error("restoreRemoval event insert failed", {
      business_id: business.id,
      user_id: user.id,
      error: eventError,
    });
  }

  // ── Stripe: undo cancel_at_period_end ──────────────────────────────
  // Best-effort. If Stripe-side state has already drifted (e.g. the
  // period elapsed and the sub got deleted by the natural webhook),
  // this errors and we log. The pro will need to resubscribe via
  // checkout if that happened; restore still succeeds locally.
  try {
    const { data: subRow } = await admin
      .from("account_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();
    const subId =
      (subRow?.stripe_subscription_id as string | undefined) ?? null;
    if (subId && subRow?.status !== "cancelled") {
      await stripe.subscriptions.update(subId, {
        cancel_at_period_end: false,
      });
    }
  } catch (err) {
    console.error("restoreRemoval Stripe undo failed", {
      user_id: user.id,
      error: err,
    });
  }

  // Reassurance email.
  try {
    const ownerEmail =
      business.contact_email ??
      (await admin.auth.admin.getUserById(user.id)).data?.user?.email ??
      null;
    if (ownerEmail) {
      await sendRemovalRestored({
        to: ownerEmail,
        businessName: business.business_name,
      });
    }
  } catch (err) {
    console.error("restoreRemoval email send failed", {
      user_id: user.id,
      error: err,
    });
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/s/${business.slug}`);

  return { ok: true };
}
