import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyBreakBlock } from "@/lib/booking-slots";
import { expandDailyBreakBlocksForDay } from "@/lib/booking-slots";

// Shared booking-overlap check used by every write path that places a
// booking on a pro's calendar — public booking creation, public
// reschedule, manual dashboard entry, pro-side reschedule, and the
// post-Stripe confirm route. Living in one place keeps the rule from
// drifting between surfaces; a regression in any one of them would let
// pros double-book themselves or land bookings inside configured break
// windows.

export type OverlapResult =
  | { ok: true }
  | {
      ok: false;
      conflict:
        | {
            kind: "booking";
            clientName: string | null;
            startAt: Date;
            endAt: Date;
          }
        | {
            kind: "break_block";
            startAt: Date;
            endAt: Date;
          };
    };

/**
 * Database-level conflict guard errors raised by migration 057.
 * Keep this narrow: we only translate the known trigger message/code,
 * not every Postgres constraint failure.
 */
export function isBookingConflictDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  return (
    e.code === "23P01" ||
    e.message === "booking time conflicts with an existing booking" ||
    !!e.details?.includes("conflicting_booking_id=")
  );
}

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
  /** Pro's configured daily_break_blocks. When supplied, the helper
   *  rejects any candidate window that touches a block on the
   *  candidate's day-of-week. Reuses the slot generator's expansion
   *  logic so read-time slot filtering and write-time validation stay
   *  in lockstep. Callers that don't pass this (or pass `[]`) keep
   *  pre-existing booking-only behavior. */
  dailyBreakBlocks?: DailyBreakBlock[],
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

  if (rows && rows.length > 0) {
    const r = rows[0] as {
      start_at: string;
      end_at: string;
      clients: { name: string | null } | { name: string | null }[] | null;
    };
    const client = Array.isArray(r.clients) ? r.clients[0] ?? null : r.clients;

    return {
      ok: false,
      conflict: {
        kind: "booking",
        clientName: client?.name ?? null,
        startAt: new Date(r.start_at),
        endAt: new Date(r.end_at),
      },
    };
  }

  // Daily break block check. Standard exclusive-boundary overlap:
  // candidate [startAt, endAt) hits block [bStart, bEnd) iff
  // startAt < bEnd && endAt > bStart. Boundary touches don't conflict
  // (a 12:00pm endpoint against a noon-1pm block is allowed), matching
  // the booking overlap query's `.lt`/`.gt` semantics.
  if (dailyBreakBlocks && dailyBreakBlocks.length > 0) {
    const blocks = expandDailyBreakBlocksForDay(startAt, dailyBreakBlocks);
    for (const b of blocks) {
      if (startAt < b.end && endAt > b.start) {
        return {
          ok: false,
          conflict: {
            kind: "break_block",
            startAt: b.start,
            endAt: b.end,
          },
        };
      }
    }
  }

  return { ok: true };
}
