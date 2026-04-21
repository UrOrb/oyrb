// Slot-generation helpers shared between the public booking widget and
// the reschedule page. Lives in lib/ so we don't import a client module
// into a server page (or vice versa).

export type BusinessHoursRow = {
  day_of_week: number; // 0 = Sunday, 6 = Saturday (matches the DB column).
  is_open: boolean;
  open_time: string | null; // "HH:MM:SS" or "HH:MM" — both work
  close_time: string | null;
};

export type SlotInterval = {
  start: Date;
  end: Date;
};

// Per-pro scheduling rules stored on businesses (see migration 023).
// All fields have sensible defaults so pros who never touch the settings
// keep the pre-rules behavior.
export type BookingRules = {
  intervalMinutes: number;          // 15 / 30 / 45 / 60 / 120
  allowLastMinute: boolean;         // false = strict cutoff, true = soft
  lastMinuteCutoffHours: number;    // 1 / 2 / 4 / 8 / 12 / 24 / 48
  breakBetweenMinutes: number;      // 0 / 5 / 10 / 15 / 20 / 30 / 45 / 60
  dailyBreakBlocks: DailyBreakBlock[];
};

export type DailyBreakBlock = {
  start: string;  // "HH:MM"
  end: string;    // "HH:MM"
  days: Array<"sun"|"mon"|"tue"|"wed"|"thu"|"fri"|"sat">;
};

export const DEFAULT_BOOKING_RULES: BookingRules = {
  intervalMinutes: 30,
  allowLastMinute: true,
  lastMinuteCutoffHours: 2,
  breakBetweenMinutes: 15,
  dailyBreakBlocks: [],
};

const DOW_NAMES: ReadonlyArray<DailyBreakBlock["days"][number]> = [
  "sun","mon","tue","wed","thu","fri","sat",
];

function safeRules(rules?: Partial<BookingRules>): BookingRules {
  return {
    intervalMinutes: rules?.intervalMinutes ?? DEFAULT_BOOKING_RULES.intervalMinutes,
    allowLastMinute: rules?.allowLastMinute ?? DEFAULT_BOOKING_RULES.allowLastMinute,
    lastMinuteCutoffHours: rules?.lastMinuteCutoffHours ?? DEFAULT_BOOKING_RULES.lastMinuteCutoffHours,
    breakBetweenMinutes: rules?.breakBetweenMinutes ?? DEFAULT_BOOKING_RULES.breakBetweenMinutes,
    dailyBreakBlocks: rules?.dailyBreakBlocks ?? DEFAULT_BOOKING_RULES.dailyBreakBlocks,
  };
}

/**
 * Generates the next N (default 21) calendar days where the pro is open.
 * Returns a date-only array (time cleared) — caller picks a day and then
 * calls `slotsForDay()` to expand into 30-min start times.
 */
export function availableDays(hours: BusinessHoursRow[], maxCount = 21): Date[] {
  const byDow = indexByDow(hours);
  const today = startOfDay(new Date());
  const out: Date[] = [];
  for (let i = 0; i < maxCount + 14; i++) {
    const d = addDays(today, i);
    const h = byDow.get(d.getDay());
    if (h?.is_open && h.open_time && h.close_time) out.push(d);
    if (out.length >= maxCount) break;
  }
  return out;
}

/**
 * Returns every slot-START on the given day that fits durationMin within
 * the pro's open window AND doesn't collide with any busy range.
 *
 * When `rules` is supplied the slot generator additionally:
 *   · aligns slot starts to `intervalMinutes` (15/30/45/60/120)
 *   · pads every busy block by `breakBetweenMinutes` on each side so
 *     back-to-back bookings get an automatic buffer
 *   · subtracts `dailyBreakBlocks` that fall on this day from the
 *     open window
 *   · drops slots that start within `lastMinuteCutoffHours` of now
 *     when `allowLastMinute` is true; drops ALL sub-cutoff slots when
 *     `allowLastMinute` is false
 *
 * `minStart` is applied on top of all that — useful for callers (e.g.
 * reschedule) that want a stricter floor than the pro's settings alone.
 */
export function slotsForDay(
  day: Date,
  hours: BusinessHoursRow[],
  durationMin: number,
  busy: SlotInterval[],
  minStart: Date,
  rulesInput?: Partial<BookingRules>,
): Date[] {
  const rules = safeRules(rulesInput);
  const byDow = indexByDow(hours);
  const h = byDow.get(day.getDay());
  if (!h?.is_open || !h.open_time || !h.close_time) return [];

  const [openH, openM] = parseHM(h.open_time);
  const [closeH, closeM] = parseHM(h.close_time);

  const windowStart = new Date(day);
  windowStart.setHours(openH, openM, 0, 0);
  const windowEnd = new Date(day);
  windowEnd.setHours(closeH, closeM, 0, 0);

  // Daily break blocks: expand to date intervals for this day and merge
  // with busy so they're treated identically (no slot, no buffer after).
  const dowName = DOW_NAMES[day.getDay()];
  const dailyBlocks: SlotInterval[] = rules.dailyBreakBlocks
    .filter((b) => b.days.includes(dowName))
    .map((b) => {
      const [sH, sM] = parseHM(b.start);
      const [eH, eM] = parseHM(b.end);
      const s = new Date(day); s.setHours(sH, sM, 0, 0);
      const e = new Date(day); e.setHours(eH, eM, 0, 0);
      return { start: s, end: e };
    });

  // Buffer existing busy blocks by the pro's break setting. Daily blocks
  // are NOT buffered (they're the pro's intentional hard gaps).
  const bufferedBusy: SlotInterval[] = busy.map((b) => ({
    start: new Date(b.start.getTime() - rules.breakBetweenMinutes * 60_000),
    end: new Date(b.end.getTime() + rules.breakBetweenMinutes * 60_000),
  }));
  const obstacles: SlotInterval[] = [...bufferedBusy, ...dailyBlocks];

  // Last-minute cutoff: effective floor = max(minStart,
  // now + cutoffHours) when allowLastMinute=true, and a hard rejection
  // of anything within the cutoff when allowLastMinute=false.
  const now = new Date();
  const cutoffMs = rules.lastMinuteCutoffHours * 60 * 60_000;
  const effectiveFloor = new Date(
    Math.max(minStart.getTime(), now.getTime() + cutoffMs),
  );

  const out: Date[] = [];
  for (
    const cursor = new Date(windowStart);
    cursor.getTime() + durationMin * 60_000 <= windowEnd.getTime();
    cursor.setMinutes(cursor.getMinutes() + rules.intervalMinutes)
  ) {
    const slotStart = new Date(cursor);
    if (slotStart < effectiveFloor) continue;
    // When pro has disabled last-minute entirely, also reject any slot
    // landing in today's remaining window regardless of cutoff setting.
    if (!rules.allowLastMinute && slotStart.getTime() - now.getTime() < cutoffMs) {
      continue;
    }
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
    if (overlapsAny(slotStart, slotEnd, obstacles)) continue;
    out.push(slotStart);
  }
  return out;
}

function indexByDow(hours: BusinessHoursRow[]): Map<number, BusinessHoursRow> {
  const m = new Map<number, BusinessHoursRow>();
  for (const h of hours) m.set(h.day_of_week, h);
  return m;
}

function parseHM(s: string): [number, number] {
  const [h, m] = s.split(":").map(Number);
  return [h || 0, m || 0];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function overlapsAny(start: Date, end: Date, busy: SlotInterval[]): boolean {
  for (const b of busy) {
    if (start < b.end && end > b.start) return true;
  }
  return false;
}

export function formatSlotLabel(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeOnly(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
