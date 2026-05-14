import {
  BookingBlock,
  type BookingBlockData,
} from "./booking-block";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  SLOT_HEIGHT_PX,
  hoursFromUtcInTimeZone,
  lanePackOverlaps,
  localDateString,
  shiftLocalYmd,
} from "./week-helpers";

/**
 * Week-grid renderer. Server component — pure layout from input data.
 *
 * Structure:
 *   ┌───────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
 *   │ time  │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │
 *   ├───────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
 *   │  7am  │     │     │     │     │     │     │     │
 *   │       │     │     │     │     │     │     │     │
 *   │ ...   │     │ [block]   │     │     │     │     │
 *   │ 10pm  │     │     │     │     │     │     │     │
 *   └───────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
 *
 * Total height: (DAY_END_HOUR - DAY_START_HOUR) × SLOT_HEIGHT_PX
 *               (22 - 7) × 60 = 900px.
 *
 * Bookings are absolute-positioned within their day column. Overlap
 * lane-packing handled in lanePackOverlaps; we only translate
 * (lane, laneCount) → (leftPercent, widthPercent).
 *
 * Bookings that span a calendar boundary in the pro tz are rendered
 * in the day they START. The bottom of the block clips at midnight
 * via the clipsBottom flag (continuation indicator) — same as a
 * booking that runs past 10pm.
 */

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TOTAL_HEIGHT_PX = (DAY_END_HOUR - DAY_START_HOUR) * SLOT_HEIGHT_PX;

type WeekBooking = {
  id: string;
  status: string;
  start_at: string;
  end_at: string;
  services: { name: string | null } | null;
  clients: { name: string | null } | null;
};

type Props = {
  weekStartYmd: string;
  todayYmd: string;
  timeZone: string;
  bookings: WeekBooking[];
};

export function WeekView({ weekStartYmd, todayYmd, timeZone, bookings }: Props) {
  const dayYmds = Array.from({ length: 7 }, (_, i) =>
    shiftLocalYmd(weekStartYmd, i, timeZone),
  );

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Bucket bookings by their local-day YYYY-MM-DD. A booking with
  // start_at NULL or invalid is dropped silently.
  const byDay = new Map<string, WeekBooking[]>();
  for (const b of bookings) {
    const start = new Date(b.start_at);
    if (Number.isNaN(start.getTime())) continue;
    const ymd = localDateString(start, timeZone);
    const arr = byDay.get(ymd) ?? [];
    arr.push(b);
    byDay.set(ymd, arr);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] rounded-lg border border-[#E7E5E4] bg-white">
        {/* Header row */}
        <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-[#E7E5E4]">
          <div /> {/* time-label spacer */}
          {dayYmds.map((ymd, i) => {
            const isToday = ymd === todayYmd;
            const date = new Date(`${ymd}T12:00:00Z`);
            const dayNum = new Intl.DateTimeFormat("en-US", {
              timeZone,
              day: "numeric",
            }).format(date);
            return (
              <div
                key={ymd}
                className={`px-2 py-2 text-center text-xs font-medium ${
                  isToday ? "text-[#0A0A0A]" : "text-[#525252]"
                }`}
              >
                <div>
                  {WEEKDAY_SHORT[i]}
                  {isToday && (
                    <span className="ml-1 text-[#B8896B]" aria-label="today">
                      ★
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-normal text-[#737373]">
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>

        {/* Body — relatively positioned so absolute blocks anchor here */}
        <div
          className="relative grid grid-cols-[60px_repeat(7,minmax(0,1fr))]"
          style={{ height: `${TOTAL_HEIGHT_PX}px` }}
        >
          {/* Time-label column */}
          <div className="relative border-r border-[#E7E5E4]">
            {Array.from(
              { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
              (_, i) => DAY_START_HOUR + i,
            ).map((hour) => (
              <div
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-[#737373]"
                style={{ top: `${(hour - DAY_START_HOUR) * SLOT_HEIGHT_PX}px` }}
              >
                {hour === 12
                  ? "12p"
                  : hour < 12
                  ? `${hour}a`
                  : hour === 24
                  ? "12a"
                  : `${hour - 12}p`}
              </div>
            ))}
          </div>

          {/* 7 day columns */}
          {dayYmds.map((ymd) => {
            const isToday = ymd === todayYmd;
            const dayBookings = byDay.get(ymd) ?? [];
            const laned = lanePackOverlaps(dayBookings);
            return (
              <div
                key={ymd}
                className={`relative border-r border-[#E7E5E4] last:border-r-0 ${
                  isToday ? "bg-[#FAFAF9]" : ""
                }`}
              >
                {/* Hour grid lines (full hours) */}
                {Array.from(
                  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
                  (_, i) => i,
                ).map((i) => (
                  <div
                    key={`h-${i}`}
                    className="pointer-events-none absolute right-0 left-0 border-t border-[#E7E5E4]"
                    style={{ top: `${i * SLOT_HEIGHT_PX}px` }}
                  />
                ))}
                {/* 30-min sub-ticks */}
                {Array.from(
                  { length: DAY_END_HOUR - DAY_START_HOUR },
                  (_, i) => i,
                ).map((i) => (
                  <div
                    key={`m-${i}`}
                    className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-[#F0EFEC]"
                    style={{
                      top: `${i * SLOT_HEIGHT_PX + SLOT_HEIGHT_PX / 2}px`,
                    }}
                  />
                ))}

                {/* Booking blocks */}
                {laned.map((b) => {
                  const start = new Date(b.start_at);
                  const end = new Date(b.end_at);
                  const startHourLocal = hoursFromUtcInTimeZone(start, timeZone);
                  const endHourLocal = hoursFromUtcInTimeZone(end, timeZone);

                  // Handle crossings: if end < start in local tz the
                  // booking crosses midnight; clamp end to 24.
                  const endHourClamped =
                    endHourLocal <= startHourLocal ? 24 : endHourLocal;

                  const clipsTop = startHourLocal < DAY_START_HOUR;
                  const clipsBottom = endHourClamped > DAY_END_HOUR;

                  const visibleStart = Math.max(startHourLocal, DAY_START_HOUR);
                  const visibleEnd = Math.min(endHourClamped, DAY_END_HOUR);
                  if (visibleEnd <= visibleStart) return null;

                  const topPx = (visibleStart - DAY_START_HOUR) * SLOT_HEIGHT_PX;
                  const heightPx = (visibleEnd - visibleStart) * SLOT_HEIGHT_PX;

                  const widthPercent = 100 / b.laneCount;
                  const leftPercent = b.lane * widthPercent;

                  const data: BookingBlockData = {
                    id: b.id,
                    status: b.status,
                    start_at: b.start_at,
                    end_at: b.end_at,
                    clientName: b.clients?.name ?? "Guest",
                    serviceName: b.services?.name ?? "Service",
                    startLabel: timeFmt.format(start),
                    endLabel: timeFmt.format(end),
                    clipsTop,
                    clipsBottom,
                  };

                  return (
                    <BookingBlock
                      key={b.id}
                      {...data}
                      topPx={topPx}
                      heightPx={heightPx}
                      leftPercent={leftPercent}
                      widthPercent={widthPercent}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Empty-state overlay — shows only when the entire week is empty */}
          {bookings.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-md bg-white/85 px-4 py-2 text-sm text-[#737373] shadow-sm">
                Nothing booked this week.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
