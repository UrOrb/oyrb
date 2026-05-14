import Link from "next/link";

import { localDateString, shiftLocalYmd } from "./week-helpers";

/**
 * Mobile fallback for the week grid: a horizontal day-tab strip across
 * the top + the selected day's bookings as a vertical list below.
 *
 * Active day comes from `?day=YYYY-MM-DD` and defaults to today (or
 * the first day of the visible week if today isn't in it).
 *
 * Pure server-rendered. Tab links carry forward the existing
 * `?week=`, `?siteId=`, and `?view=week` params via `baseQuery`.
 *
 * The "Show whole week as list →" footer link points at `?view=list`
 * so a phone-bound pro can still get the original full list when they
 * want it.
 */

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Booking = {
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
  activeDayYmd: string;
  timeZone: string;
  bookings: Booking[];
  /** Shared querystring without `day` (e.g. `siteId=...&view=week&week=...`). */
  baseQuery: string;
  /** Where the "Show whole week as list" link should point. */
  listHref: string;
};

const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-[#B8896B]",
  pending: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-[#A3A3A3]",
};

export function DayView({
  weekStartYmd,
  todayYmd,
  activeDayYmd,
  timeZone,
  bookings,
  baseQuery,
  listHref,
}: Props) {
  const dayYmds = Array.from({ length: 7 }, (_, i) =>
    shiftLocalYmd(weekStartYmd, i, timeZone),
  );

  const activeBookings = bookings.filter(
    (b) => localDateString(new Date(b.start_at), timeZone) === activeDayYmd,
  );

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const buildHref = (day: string) => {
    const q = baseQuery ? `${baseQuery}&day=${day}` : `day=${day}`;
    return `?${q}`;
  };

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {dayYmds.map((ymd, i) => {
          const isActive = ymd === activeDayYmd;
          const isToday = ymd === todayYmd;
          const dayNum = new Intl.DateTimeFormat("en-US", {
            timeZone,
            day: "numeric",
          }).format(new Date(`${ymd}T12:00:00Z`));
          return (
            <Link
              key={ymd}
              href={buildHref(ymd)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-[44px] flex-col items-center rounded-md px-2 py-1.5 text-[11px] ${
                isActive
                  ? "bg-[#0A0A0A] text-white"
                  : isToday
                  ? "border border-[#B8896B] text-[#0A0A0A]"
                  : "border border-[#E7E5E4] text-[#525252]"
              }`}
            >
              <span>{WEEKDAY_SHORT[i]}</span>
              <span className="text-sm font-semibold">{dayNum}</span>
            </Link>
          );
        })}
      </div>

      {/* Selected day's bookings */}
      <div className="mt-3 space-y-2">
        {activeBookings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E7E5E4] p-6 text-center text-sm text-[#737373]">
            Nothing booked.
          </div>
        ) : (
          activeBookings.map((b) => {
            const start = new Date(b.start_at);
            const end = new Date(b.end_at);
            return (
              <Link
                key={b.id}
                href={`/dashboard/bookings/${b.id}`}
                className="flex items-center gap-3 rounded-md border border-[#E7E5E4] bg-white p-3 hover:border-[#B8896B]"
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    STATUS_DOT[b.status] ?? STATUS_DOT.pending
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${b.status === "cancelled" ? "text-[#A3A3A3] line-through" : ""}`}>
                    {b.clients?.name ?? "Guest"}
                  </p>
                  <p className="truncate text-xs text-[#737373]">
                    {b.services?.name ?? "Service"} · {timeFmt.format(start)} – {timeFmt.format(end)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-4 text-center">
        <Link
          href={listHref}
          className="text-xs text-[#B8896B] underline-offset-4 hover:underline"
        >
          Show whole week as list →
        </Link>
      </div>
    </div>
  );
}
