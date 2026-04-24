import { createAdminClient } from "@/lib/supabase/server";

// Postgres unique-violation SQLSTATE — surfaced by PostgREST in error.code.
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Check whether a Stripe event has already been successfully processed,
 * and atomically reserve it for processing if not.
 *
 *   - Returns { proceed: true,  reason: "new" }    — first time we've seen it.
 *   - Returns { proceed: true,  reason: "retry" }  — seen before but the prior
 *     attempt left the row in 'failed' or 'pending' status; allow another go.
 *   - Returns { proceed: false, reason: "duplicate" } — already 'success';
 *     handler should short-circuit and the route should 200 OK back to Stripe.
 *
 * The "reserve" step inserts a row with status='pending'. If two webhook
 * deliveries race, only one INSERT wins; the loser hits the unique key and
 * we re-read to decide whether to retry or skip.
 */
export async function checkAndReserveEvent(
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<{ proceed: boolean; reason: "new" | "retry" | "duplicate" }> {
  const admin = createAdminClient();

  const { error } = await admin.from("processed_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    payload: payload as object,
    status: "pending",
  });

  if (!error) return { proceed: true, reason: "new" };

  // Unique violation = a row already exists. Read its status to decide.
  if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
    const { data: existing } = await admin
      .from("processed_webhook_events")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing?.status === "success") {
      return { proceed: false, reason: "duplicate" };
    }
    // 'pending' (prior attempt crashed mid-flight) or 'failed' — allow retry.
    return { proceed: true, reason: "retry" };
  }

  // Non-uniqueness error (network, RLS, table missing) — bubble up so the
  // route returns 500 and Stripe retries delivery.
  throw error;
}

/**
 * Mark a previously-reserved event as completed. Pass success=false +
 * errorMessage when the handler threw — Stripe will retry, the next
 * attempt will see status='failed' and re-run.
 */
export async function markEventCompleted(
  eventId: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("processed_webhook_events")
    .update({
      status: success ? "success" : "failed",
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
}
