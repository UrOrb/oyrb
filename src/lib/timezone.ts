export function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => {
    const value = parts.find((p) => p.type === type)?.value;
    return value ? Number(value) : 0;
  };

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/**
 * Convert a provider-local date + time into the canonical UTC Date stored
 * in Postgres. Handles DST by calculating the target zone offset twice;
 * the second pass catches transitions near the guessed instant.
 */
export function zonedDateTimeToUtc(
  dateKey: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
  const offset1 = timeZoneOffsetMs(guess, timeZone);
  let utc = new Date(guess.getTime() - offset1);
  const offset2 = timeZoneOffsetMs(utc, timeZone);
  if (offset2 !== offset1) {
    utc = new Date(guess.getTime() - offset2);
  }
  return utc;
}

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function zonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = value("weekday");
  const dayOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : date.getUTCDay(),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export type BusinessHourForTimezone = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

function minutesFromTime(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWithinBusinessHoursInTimezone(params: {
  startAt: Date;
  endAt: Date;
  hours: BusinessHourForTimezone[];
  timeZone: string;
}): boolean {
  const start = zonedParts(params.startAt, params.timeZone);
  const end = zonedParts(params.endAt, params.timeZone);
  const row = params.hours.find((h) => h.day_of_week === start.dayOfWeek);
  if (!row?.is_open || !row.open_time || !row.close_time) return false;

  // Current business-hours model assumes appointments stay within one
  // provider-local calendar day. Reject cross-local-day bookings rather
  // than silently validating against the wrong close time.
  if (start.year !== end.year || start.month !== end.month || start.day !== end.day) {
    return false;
  }

  const startMin = start.hour * 60 + start.minute;
  const endMin = end.hour * 60 + end.minute;
  const openMin = minutesFromTime(row.open_time);
  const closeMin = minutesFromTime(row.close_time);
  return startMin >= openMin && endMin <= closeMin;
}
