import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import type { TodayService } from "@/lib/business-brain";

/**
 * Hero tile — the visual centerpiece of the dashboard bento.
 *
 * Renders today's booking count as a font-display text-7xl number
 * (text-6xl on mobile), with up to two of today's upcoming bookings
 * listed below as a quick preview and a primary CTA into the full
 * Bookings page filtered to today.
 *
 * Spans 2 cols on mobile, 4 cols × 2 rows on tablet/desktop — large
 * enough to dominate the row, leaving the rest of the bento for
 * secondary tiles.
 *
 * Hero is NOT wrapped in BentoTile because the CTA inside the tile
 * already navigates the pro to /dashboard/bookings; wrapping the
 * whole tile in another <Link> would create nested-link issues. The
 * outer card chrome is open-coded to match BentoTile's appearance.
 */
export function HeroTile({
  greeting,
  todayServices,
  isPublished,
  siteUrl,
  timeZone,
}: {
  greeting: string;
  todayServices: TodayService[];
  isPublished: boolean;
  siteUrl: string;
  timeZone: string;
}) {
  // Cancelled bookings don't count as "bookings today" and must never
  // appear in the what's-ahead preview — a pro whose only booking today
  // was cancelled would otherwise see "1 booking today" listing it.
  const activeToday = todayServices.filter(
    (s) => s.progressLabel !== "cancelled",
  );
  const count = activeToday.length;
  // Preview the first two services that aren't yet complete (or past),
  // so the pro sees what's *ahead* on the schedule. If everything's
  // wrapped, fall back to the first two in start order.
  const upcomingToday = activeToday.filter(
    (s) => s.progressLabel !== "complete" && s.progressLabel !== "past",
  );
  const preview = (upcomingToday.length > 0 ? upcomingToday : activeToday).slice(0, 2);

  return (
    <div className="col-span-2 sm:col-span-4 sm:row-span-2 lg:col-span-4 lg:row-span-2 flex flex-col rounded-lg border border-[#E7E5E4] bg-white p-6 sm:p-8">
      <p className="font-display text-2xl font-medium tracking-tight text-[#0A0A0A] sm:text-3xl">
        {greeting}
      </p>

      <div className="mt-6 flex-1">
        {count > 0 ? (
          <>
            <p className="font-display text-6xl font-medium tracking-tight text-[#0A0A0A] sm:text-7xl">
              {count}
            </p>
            <p className="mt-2 text-sm text-[#525252]">
              {count === 1 ? "booking today" : "bookings today"}
            </p>

            {preview.length > 0 && (
              <ul className="mt-6 space-y-1.5 border-t border-[#E7E5E4] pt-4">
                {preview.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-baseline gap-3 text-sm text-[#525252]"
                  >
                    <span className="w-16 shrink-0 font-mono text-xs text-[#737373]">
                      {formatStartTime(s.startAt, timeZone)}
                    </span>
                    <span className="flex-1 truncate">
                      <span className="font-medium text-[#0A0A0A]">
                        {s.clientName || "Client"}
                      </span>
                      {" — "}
                      <span>{s.serviceName}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-medium tracking-tight text-[#0A0A0A]">
              No bookings today.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#525252]">
              A quiet day on the calendar. A good day to{" "}
              {isPublished
                ? "share your site or plan a campaign."
                : "set up your site and start taking bookings."}
            </p>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:opacity-85"
        >
          View today&apos;s schedule
          <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
        {count === 0 && isPublished && (
          <Link
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-medium text-[#525252] hover:bg-[#FAFAF9]"
          >
            <Share2 size={12} strokeWidth={1.5} />
            Share your site
          </Link>
        )}
        {count === 0 && !isPublished && (
          <Link
            href="/dashboard/site"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-medium text-[#525252] hover:bg-[#FAFAF9]"
          >
            Set up your site
          </Link>
        )}
      </div>
    </div>
  );
}

function formatStartTime(start: Date, timeZone: string): string {
  // This is a server component, so Intl without an explicit timeZone
  // renders in the SERVER's zone (UTC on Vercel), not the pro's machine
  // — a 2:00 PM Eastern booking showed as "7:00 PM". Format in the
  // business timezone instead.
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(start);
}
