"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DailyBreakBlock } from "@/lib/booking-slots";

const VALID_INTERVALS = new Set([15, 30, 45, 60, 120]);
const VALID_CUTOFFS = new Set([1, 2, 4, 8, 12, 24, 48]);
const VALID_BREAKS = new Set([0, 5, 10, 15, 20, 30, 45, 60]);
const VALID_DOW = new Set(["sun","mon","tue","wed","thu","fri","sat"]);

function validHM(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s);
}

export type SaveBookingRulesInput = {
  businessId: string;
  intervalMinutes: number;
  allowLastMinute: boolean;
  lastMinuteCutoffHours: number;
  breakBetweenMinutes: number;
  dailyBreakBlocks: DailyBreakBlock[];
};

export async function saveBookingRules(
  input: SaveBookingRulesInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  if (!VALID_INTERVALS.has(input.intervalMinutes)) {
    return { ok: false, error: "Invalid interval" };
  }
  if (!VALID_CUTOFFS.has(input.lastMinuteCutoffHours)) {
    return { ok: false, error: "Invalid cutoff" };
  }
  if (!VALID_BREAKS.has(input.breakBetweenMinutes)) {
    return { ok: false, error: "Invalid break" };
  }

  // Sanitize daily break blocks. Bad entries are dropped silently; an
  // all-empty array is the most permissive (no recurring blocks).
  const cleanBlocks: DailyBreakBlock[] = [];
  for (const b of input.dailyBreakBlocks ?? []) {
    if (!validHM(b.start) || !validHM(b.end)) continue;
    if (b.start >= b.end) continue;
    const days = (b.days ?? []).filter((d) => VALID_DOW.has(d));
    if (days.length === 0) continue;
    cleanBlocks.push({ start: b.start, end: b.end, days: days as DailyBreakBlock["days"] });
  }

  // Ownership check: a user can only update a business they own.
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", input.businessId)
    .maybeSingle();
  if (!biz || biz.owner_id !== user.id) {
    return { ok: false, error: "Not your business" };
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      booking_interval_minutes: input.intervalMinutes,
      allow_last_minute_booking: input.allowLastMinute,
      last_minute_cutoff_hours: input.lastMinuteCutoffHours,
      break_between_appointments_minutes: input.breakBetweenMinutes,
      daily_break_blocks: cleanBlocks,
    })
    .eq("id", input.businessId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings/booking-rules");
  revalidatePath(`/s/${biz.id}`); // slug-based paths self-invalidate on next request
  return { ok: true };
}
