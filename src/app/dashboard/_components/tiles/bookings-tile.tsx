import { BentoTile } from "../bento-tile";

/**
 * Bookings tile — the next 2 upcoming appointments AFTER today. Today
 * is already shown in the Hero, so this surfaces what's next on the
 * calendar without duplicating that view.
 */

export type UpcomingBooking = {
  id: string;
  startAt: Date;
  clientName: string;
  serviceName: string;
};

export function BookingsTile({
  upcoming,
  timeZone,
}: {
  upcoming: UpcomingBooking[];
  timeZone: string;
}) {
  const empty = upcoming.length === 0;

  return (
    <BentoTile
      href="/dashboard/bookings"
      className="col-span-2 sm:col-span-4 lg:col-span-4"
      ariaLabel="Upcoming bookings"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Coming up</p>

      {empty ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          Quiet days ahead. A good time to plan a campaign.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.map((b) => (
            <li
              key={b.id}
              className="flex items-baseline gap-3 text-sm text-[#525252]"
            >
              <span className="w-28 shrink-0 font-mono text-xs text-[#737373]">
                {formatFutureWhen(b.startAt, timeZone)}
              </span>
              <span className="flex-1 truncate">
                <span className="font-medium text-[#0A0A0A]">
                  {b.clientName || "Client"}
                </span>
                {" — "}
                <span>{b.serviceName}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </BentoTile>
  );
}

/**
 * Day-of-week + time. Stays compact: "Thu 3:00pm". When the booking
 * is more than a week out, falls back to month/day + time.
 *
 * This is a server component, so Intl without an explicit timeZone
 * formats in the SERVER's zone (UTC on Vercel) — a 2:00 PM Eastern
 * booking rendered as "7:00 PM", potentially on the wrong weekday.
 * Always pass the business timezone.
 */
function formatFutureWhen(start: Date, timeZone: string): string {
  const now = new Date();
  const msAhead = start.getTime() - now.getTime();
  const daysAhead = msAhead / (24 * 60 * 60 * 1000);

  if (daysAhead >= 0 && daysAhead < 7) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    }).format(start);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(start);
}
