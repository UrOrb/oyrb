import type { SupabaseClient } from "@supabase/supabase-js";

// Shared booking-overlap check used by the public booking route AND the
// dashboard manual-entry action. Living in one place keeps the rule from
// drifting between the two surfaces — a regression in either would let
// pros double-book themselves.

export type OverlapResult =
  | { ok: true }
  | {
      ok: false;
      conflict: {
        clientName: string | null;
        startAt: Date;
        endAt: Date;
      };
    };

export async function checkBookingOverlap(
  supabase: SupabaseClient,
  businessId: string,
  startAt: Date,
  endAt: Date,
  breakMinutes: number,
  /** Optional booking id to exclude from the conflict set — used by the
   *  reschedule paths so a booking doesn't conflict with itself when the
   *  candidate window happens to overlap its current placement. Existing
   *  callers (public booking creation, manual booking entry) leave this
   *  unset and behavior is unchanged. */
  excludeBookingId?: string | null,
): Promise<OverlapResult> {
  const breakMs = Math.max(0, Math.floor(breakMinutes)) * 60_000;
  const overlapStart = new Date(startAt.getTime() - breakMs);
  const overlapEnd = new Date(endAt.getTime() + breakMs);

  // Earliest conflict wins — a long-running series booking that overlaps
  // multiple proposed slots should still surface the original anchor in
  // the error message, not the latest occurrence.
  let query = supabase
    .from("bookings")
    .select("id, start_at, end_at, clients(name)")
    .eq("business_id", businessId)
    .neq("status", "cancelled")
    .lt("start_at", overlapEnd.toISOString())
    .gt("end_at", overlapStart.toISOString())
    .order("start_at", { ascending: true })
    .limit(1);
  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }
  const { data: rows } = await query;

  if (!rows || rows.length === 0) return { ok: true };

  const r = rows[0] as {
    start_at: string;
    end_at: string;
    clients: { name: string | null } | { name: string | null }[] | null;
  };
  const client = Array.isArray(r.clients) ? r.clients[0] ?? null : r.clients;

  return {
    ok: false,
    conflict: {
      clientName: client?.name ?? null,
      startAt: new Date(r.start_at),
      endAt: new Date(r.end_at),
    },
  };
}
