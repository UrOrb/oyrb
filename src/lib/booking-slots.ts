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

const SLOT_GRANULARITY_MIN = 30;

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
 * Returns every 30-min slot START on the given day that fits durationMin
 * within the pro's open window AND doesn't collide with any busy range.
 * All times are returned as Date objects in the server's local tz.
 *
 *   busy = [{start, end}, ...]  — existing confirmed bookings to avoid.
 *   excludeBookingId is irrelevant here (caller should filter busy before
 *   passing in).
 */
export function slotsForDay(
  day: Date,
  hours: BusinessHoursRow[],
  durationMin: number,
  busy: SlotInterval[],
  minStart: Date,
): Date[] {
  const byDow = indexByDow(hours);
  const h = byDow.get(day.getDay());
  if (!h?.is_open || !h.open_time || !h.close_time) return [];

  const [openH, openM] = parseHM(h.open_time);
  const [closeH, closeM] = parseHM(h.close_time);

  const windowStart = new Date(day);
  windowStart.setHours(openH, openM, 0, 0);
  const windowEnd = new Date(day);
  windowEnd.setHours(closeH, closeM, 0, 0);

  const out: Date[] = [];
  for (
    const cursor = new Date(windowStart);
    cursor.getTime() + durationMin * 60_000 <= windowEnd.getTime();
    cursor.setMinutes(cursor.getMinutes() + SLOT_GRANULARITY_MIN)
  ) {
    const slotStart = new Date(cursor);
    if (slotStart < minStart) continue;
    const slotEnd = new Date(slotStart.getTime() + durationMin * 60_000);
    if (overlapsAny(slotStart, slotEnd, busy)) continue;
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
