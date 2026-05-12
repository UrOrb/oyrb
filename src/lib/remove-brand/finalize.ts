import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { CONFIRMATION_COPY_VERSION } from "./confirmation-copy";
import { sendRemovalFinalized } from "./emails";

/**
 * Phase 8 PR 5 — Cron-driven finalization of an in-grace business.
 *
 * Called by /api/cron/finalize-removals once per row that the daily
 * sweep returns. Mirrors §14's 8-step sequence verbatim:
 *
 *   0. Snapshot business fields the later steps need (email, ids).
 *   1. Send sendRemovalFinalized email — BEFORE any deletion, because
 *      the email address has to be resolvable.
 *   2. Collect Storage paths from client_imports + dispute_inquiries
 *      BEFORE the cascade wipes the rows that hold them.
 *   3. Insert business_removal_events event_type='finalized'. After
 *      migration 056 the row survives the cascade (business_id is
 *      nullable + ON DELETE SET NULL) — this is the only on-platform
 *      record that the business ever existed once step 7 fires.
 *   4. Remove Storage objects across three buckets. Best-effort.
 *   5. Determine isLastBusiness for the owner — gates steps 6 and 8.
 *   6. Stripe cleanup (last-business only). Subscription cancel
 *      ABORTS this business's finalization if it fails with anything
 *      other than already_canceled / no_such_subscription, leaving the
 *      business in grace for next-day retry. Customer delete is
 *      best-effort. Stripe Connect is intentionally untouched — the
 *      account is the pro's property.
 *   7. delete from businesses where id = $1. Cascades the entire
 *      child-row fan-out (mig 055 §3 of the discovery report —
 *      15+ tables). business_removal_events.business_id is nulled
 *      for this business (mig 056), preserving the audit.
 *   8. admin.auth.admin.deleteUser(ownerId) — last-business only.
 *      Safe because step 7's cascade cleared every RESTRICT FK that
 *      referenced the user (client_imports, data_exports,
 *      business_removal_events.actor_user_id for this business).
 *
 * Failure semantics:
 *   - Email / Storage / event-row failures log and continue. We're
 *     past the point of no return; the 14-day grace was the safety net.
 *   - Stripe subscription cancel: if the error is NOT already_canceled
 *     and NOT no_such_subscription, ABORT — throw out of this function
 *     so the cron's per-row try/catch counts it as a failure and the
 *     next-day sweep retries. The business row + all DB state remain
 *     untouched.
 *   - Stripe customer delete: best-effort. Orphan customer record in
 *     Stripe is benign (no active subs).
 *   - Business-row delete: caught by cron; the row stays, next-day
 *     retry.
 *   - auth.users delete: logged but not retried. Rare ("business gone
 *     but owner still exists"); admin SQL cleans up.
 */

const PHOTOS_BUCKET = "photos";
const CLIENT_IMPORTS_BUCKET = "client-imports";
const DISPUTE_EVIDENCE_BUCKET = "dispute-evidence";

type BusinessRow = {
  id: string;
  business_name: string;
  slug: string;
  owner_id: string;
  contact_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_connect_account_id: string | null;
};

export type FinalizeOutcome = {
  ok: true;
  businessId: string;
  isLastBusiness: boolean;
  storageObjectsRemoved: number;
  authUserDeleted: boolean;
};

export async function finalizeRemoval(
  business: BusinessRow,
): Promise<FinalizeOutcome> {
  const admin = createAdminClient();
  const { id: businessId, owner_id: ownerId, business_name: name } = business;
  const finalizedAt = new Date();

  // ── 0. Resolve contact email ────────────────────────────────────
  // contact_email is the canonical address pros provide on Settings;
  // it can be different from their auth.users email. Fall back to
  // the auth email if the column is null. Both reads happen now,
  // before any cascade or auth.users delete makes either unreliable.
  let email = business.contact_email;
  if (!email) {
    try {
      const { data } = await admin.auth.admin.getUserById(ownerId);
      email = data?.user?.email ?? null;
    } catch (err) {
      console.error(
        `[finalize-removals] business=${businessId} resolve email FAILED:`,
        err,
      );
    }
  }

  // ── 1. Email FIRST ───────────────────────────────────────────────
  // After step 7 the businesses row is gone and contact_email goes
  // with it. After step 8 the auth.users row is gone too. So this
  // is the last opportunity to reach the pro.
  if (email) {
    await sendRemovalFinalized({
      to: email,
      businessName: name,
      finalizedAt,
    });
  } else {
    console.warn(
      `[finalize-removals] business=${businessId} no email resolvable — proceeding without notification`,
    );
  }

  // ── 2. Collect Storage paths BEFORE cascade ──────────────────────
  // client_imports.source_path and dispute_inquiries.evidence_paths
  // are wiped when the businesses row deletes. Collect them while
  // they still exist.
  const clientImportPaths = await collectClientImportPaths(admin, businessId);
  const disputeEvidencePaths = await collectDisputeEvidencePaths(
    admin,
    businessId,
  );

  // ── 3. Audit row — finalized event ───────────────────────────────
  // Inserted BEFORE step 7. After migration 056, business_id is
  // ON DELETE SET NULL, so this row survives the cascade with
  // business_id = NULL. actor_user_id stays NULL (system-driven).
  const { error: eventError } = await admin
    .from("business_removal_events")
    .insert({
      business_id: businessId,
      event_type: "finalized",
      actor_user_id: null,
      ip: null,
      user_agent: null,
      copy_version: CONFIRMATION_COPY_VERSION,
    });
  if (eventError) {
    console.error(
      `[finalize-removals] business=${businessId} event insert failed:`,
      eventError,
    );
  }

  // ── 4. Storage cleanup ───────────────────────────────────────────
  // All buckets best-effort. Count successes for telemetry; errors
  // log but never abort. Note: photos/<owner_id>/ is gated by
  // isLastBusiness (step 5) below; we run that part AFTER the
  // count check.
  let storageObjectsRemoved = 0;
  storageObjectsRemoved += await removePhotosByBusinessPrefix(
    admin,
    businessId,
  );
  storageObjectsRemoved += await removeByExplicitPaths(
    admin,
    CLIENT_IMPORTS_BUCKET,
    clientImportPaths,
  );
  storageObjectsRemoved += await removeByExplicitPaths(
    admin,
    DISPUTE_EVIDENCE_BUCKET,
    disputeEvidencePaths,
  );

  // ── 5. Is this the user's last business? ─────────────────────────
  // Count other businesses owned by the same user. If zero, we
  // proceed to step 6 (Stripe sub + customer cleanup) and step 8
  // (auth.users delete). Subscription is account-level (mig 009 —
  // one per user) so cancelling it on a non-last-business
  // finalization would break the user's remaining businesses.
  const { count: otherBusinessCount, error: countError } = await admin
    .from("businesses")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .neq("id", businessId);
  if (countError) {
    console.error(
      `[finalize-removals] business=${businessId} sibling count FAILED:`,
      countError,
    );
    // Treat unknown sibling state as not-last (safer — avoids
    // wrongly nuking auth.users for a user who actually owns more).
  }
  const isLastBusiness = !countError && (otherBusinessCount ?? 0) === 0;

  // Pro-level Storage assets at photos/<owner_id>/ only on last-
  // business finalization. Other businesses may reference the same
  // hero/gallery files.
  if (isLastBusiness) {
    storageObjectsRemoved += await removePhotosByOwnerPrefix(admin, ownerId);
  }

  // ── 6. Stripe (last-business only) ───────────────────────────────
  // Subscription cancel ABORTS this finalization if it fails with an
  // unrecognized error code — see error-classification comment below.
  // Customer delete is best-effort: orphan customer rows in Stripe
  // have no active subs after this and are harmless.
  if (isLastBusiness) {
    if (business.stripe_subscription_id) {
      await cancelSubscriptionOrAbort(
        businessId,
        business.stripe_subscription_id,
      );
    }
    if (business.stripe_customer_id) {
      try {
        await stripe.customers.del(business.stripe_customer_id);
      } catch (err) {
        console.error(
          `[finalize-removals] business=${businessId} Stripe customer delete failed (best-effort):`,
          err,
        );
      }
    }
  }
  // Stripe Connect account: intentionally NOT touched. The connect
  // account is the pro's property (mirrors the soft-disconnect
  // convention at /api/stripe/connect/disconnect/route.ts:46-57).
  // It stays alive in dashboard.stripe.com; the pro can re-link it
  // to another platform or delete it themselves.

  // ── 7. Delete the business row ───────────────────────────────────
  // Single statement; Postgres cascades the entire child-row
  // fan-out (services, clients, bookings, business_hours,
  // email_campaigns, waitlist, gift_cards, pro_referrals,
  // notification_log, dispute_inquiries, storefront_views,
  // client_imports, data_exports, and per migration 056
  // business_removal_events sets business_id=NULL preserving the
  // events).
  const { error: bizDeleteError } = await admin
    .from("businesses")
    .delete()
    .eq("id", businessId);
  if (bizDeleteError) {
    console.error(
      `[finalize-removals] business=${businessId} delete FAILED:`,
      bizDeleteError,
    );
    throw new Error(
      `Failed to delete business ${businessId}: ${bizDeleteError.message}`,
    );
  }

  // ── 8. Delete auth.users (last-business only) ────────────────────
  // Safe at this point: the cascade in step 7 cleared every RESTRICT
  // FK referencing this user (client_imports, data_exports,
  // business_removal_events.actor_user_id for this business).
  //
  // If the user owns other businesses, those still have audit rows
  // referencing them; deleting auth.users now would fail with
  // RESTRICT and leave us in an awkward state. The isLastBusiness
  // gate prevents that.
  //
  // Logged but not retried on failure. Orphan auth.users without
  // an owning business is rare and admin SQL cleans it up.
  let authUserDeleted = false;
  if (isLastBusiness) {
    try {
      const { error } = await admin.auth.admin.deleteUser(ownerId);
      if (error) {
        console.error(
          `[finalize-removals] business=${businessId} auth.users delete FAILED (orphan user; admin SQL required):`,
          error,
        );
      } else {
        authUserDeleted = true;
      }
    } catch (err) {
      console.error(
        `[finalize-removals] business=${businessId} auth.users delete threw:`,
        err,
      );
    }
  }

  return {
    ok: true,
    businessId,
    isLastBusiness,
    storageObjectsRemoved,
    authUserDeleted,
  };
}

// ── Stripe subscription cancel — abort vs swallow ─────────────────
// Stripe errors that mean "already in the goal state" are swallowed;
// every other error aborts. The two recognized "already-done" codes
// are `resource_missing` (sub deleted out-of-band) and any cancel
// that returns a `status: 'canceled'` object (returned by the API
// itself when the sub was already cancelled). Stripe also has
// raw_type 'invalid_request_error' for these — we match on
// code + status, not type.
//
// Anything else — connection error, 5xx, permissions, unexpected
// type — re-throws. The cron's per-row try/catch catches it, marks
// the row failed, moves on. The business stays in grace; next-day
// sweep retries.
async function cancelSubscriptionOrAbort(
  businessId: string,
  subId: string,
): Promise<void> {
  try {
    const result = await stripe.subscriptions.cancel(subId);
    if (result.status !== "canceled") {
      console.warn(
        `[finalize-removals] business=${businessId} subscription cancel returned status=${result.status}; treating as success`,
      );
    }
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === "resource_missing") {
      // Sub was deleted out-of-band (natural period-end or admin
      // action in dashboard.stripe.com). Treat as success.
      console.warn(
        `[finalize-removals] business=${businessId} subscription ${subId} already gone (resource_missing) — continuing`,
      );
      return;
    }
    console.error(
      `[finalize-removals] business=${businessId} Stripe sub cancel FAILED — aborting finalization:`,
      err,
    );
    throw err;
  }
}

// ── Storage helpers ───────────────────────────────────────────────

async function collectClientImportPaths(
  admin: SupabaseClient,
  businessId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("client_imports")
    .select("source_path")
    .eq("business_id", businessId);
  if (error) {
    console.error(
      `[finalize-removals] business=${businessId} client_imports path collect failed:`,
      error,
    );
    return [];
  }
  return (data ?? [])
    .map((r) => (r as { source_path: string | null }).source_path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
}

async function collectDisputeEvidencePaths(
  admin: SupabaseClient,
  businessId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("dispute_inquiries")
    .select("evidence_paths")
    .eq("business_id", businessId);
  if (error) {
    console.error(
      `[finalize-removals] business=${businessId} dispute evidence path collect failed:`,
      error,
    );
    return [];
  }
  const paths: string[] = [];
  for (const row of data ?? []) {
    const ev = (row as { evidence_paths: unknown }).evidence_paths;
    if (Array.isArray(ev)) {
      for (const p of ev) {
        if (typeof p === "string" && p.length > 0) paths.push(p);
      }
    }
  }
  return paths;
}

async function removePhotosByBusinessPrefix(
  admin: SupabaseClient,
  businessId: string,
): Promise<number> {
  const prefix = `bookings/${businessId}`;
  const { data, error } = await admin.storage
    .from(PHOTOS_BUCKET)
    .list(prefix, { limit: 1000 });
  if (error) {
    console.error(
      `[finalize-removals] business=${businessId} photos list (${prefix}) failed:`,
      error,
    );
    return 0;
  }
  if (!data || data.length === 0) return 0;
  const paths = data.map((f) => `${prefix}/${f.name}`);
  const { error: removeError } = await admin.storage
    .from(PHOTOS_BUCKET)
    .remove(paths);
  if (removeError) {
    console.error(
      `[finalize-removals] business=${businessId} photos remove failed:`,
      removeError,
    );
    return 0;
  }
  return paths.length;
}

async function removePhotosByOwnerPrefix(
  admin: SupabaseClient,
  ownerId: string,
): Promise<number> {
  const { data, error } = await admin.storage
    .from(PHOTOS_BUCKET)
    .list(ownerId, { limit: 1000 });
  if (error) {
    console.error(
      `[finalize-removals] owner=${ownerId} photos list failed:`,
      error,
    );
    return 0;
  }
  if (!data || data.length === 0) return 0;
  const paths = data.map((f) => `${ownerId}/${f.name}`);
  const { error: removeError } = await admin.storage
    .from(PHOTOS_BUCKET)
    .remove(paths);
  if (removeError) {
    console.error(
      `[finalize-removals] owner=${ownerId} photos remove failed:`,
      removeError,
    );
    return 0;
  }
  return paths.length;
}

async function removeByExplicitPaths(
  admin: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<number> {
  if (paths.length === 0) return 0;
  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) {
    console.error(
      `[finalize-removals] ${bucket} remove ${paths.length} paths failed:`,
      error,
    );
    return 0;
  }
  return paths.length;
}
