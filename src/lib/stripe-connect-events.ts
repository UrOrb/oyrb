import { createAdminClient } from "@/lib/supabase/server";

// Postgres unique-violation SQLSTATE — surfaced by PostgREST in error.code.
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Connect-mode equivalent of `checkAndReserveEvent`. Writes to the
 * `stripe_connect_events` table (migration 030) so platform vs Connect
 * event ledgers stay cleanly separated — different signing secrets,
 * different code paths, different audit trails.
 *
 * Same three outcomes as the platform helper:
 *   - { proceed: true,  reason: "new" }       — first time we've seen it
 *   - { proceed: true,  reason: "retry" }     — prior attempt left the row
 *                                                'pending'/'failed'; allow another go
 *   - { proceed: false, reason: "duplicate" } — already 'success'; short-circuit
 *
 * Resolves the connected `accountId` to a local `business_id` in one round
 * trip so the audit row is queryable by either side.
 */
export async function checkAndReserveConnectEvent(
  eventId: string,
  eventType: string,
  accountId: string,
  payload: unknown,
): Promise<{ proceed: boolean; reason: "new" | "retry" | "duplicate" }> {
  const admin = createAdminClient();

  // Best-effort lookup. NULL is fine — Stripe may deliver events for an
  // account we've already disconnected, and the table allows a null FK so
  // we still log them.
  const { data: bizRow } = await admin
    .from("businesses")
    .select("id")
    .eq("stripe_connect_account_id", accountId)
    .maybeSingle();
  const businessId = bizRow?.id ?? null;

  const { error } = await admin.from("stripe_connect_events").insert({
    event_id: eventId,
    event_type: eventType,
    account_id: accountId,
    business_id: businessId,
    payload: payload as object,
    status: "pending",
  });

  if (!error) return { proceed: true, reason: "new" };

  if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
    const { data: existing } = await admin
      .from("stripe_connect_events")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing?.status === "success") {
      return { proceed: false, reason: "duplicate" };
    }
    return { proceed: true, reason: "retry" };
  }

  // Network / RLS / table-missing — bubble up so the route 500s and Stripe
  // retries delivery.
  throw error;
}

/**
 * Mark a previously-reserved Connect event as completed. On failure pass
 * `success=false` + an `errorMessage` — Stripe will retry, the next attempt
 * will see status='failed', and re-run.
 */
export async function markConnectEventCompleted(
  eventId: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("stripe_connect_events")
    .update({
      status: success ? "success" : "failed",
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
}
