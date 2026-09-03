import { CalendarDays } from "lucide-react";
import type { DensityDay } from "@/lib/business-brain";

/**
 * Schedule density card — 7 vertical bars, one per day Mon-Sun in
 * the pro's local timezone. Hand-rolled with Tailwind divs +
 * dynamic heights (no chart library).
 *
 * Today's bar is highlighted with an accent fill so the pro can
 * orient quickly. Past days fade to muted. Empty days render as a
 * tiny baseline tick rather than an invisible bar so the chart
 * shape stays legible.
 */
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 96;

export function ScheduleDensityCard({ density }: { density: DensityDay[] }) {
  const max = density.reduce((m, d) => Math.max(m, d.bookingCount), 0);
  const totalThisWeek = density.reduce((s, d) => s + d.bookingCount, 0);

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            This week
          </h2>
        </div>
        <p className="text-xs text-[#737373]">
          {totalThisWeek === 0
            ? "No bookings this week"
            : `${totalThisWeek} booking${totalThisWeek === 1 ? "" : "s"} total`}
        </p>
      </header>

      <div className="mt-5 flex h-32 items-end justify-between gap-2">
        {density.map((d) => {
          const heightPx =
            max === 0
              ? MIN_BAR_HEIGHT_PX
              : Math.max(
                  MIN_BAR_HEIGHT_PX,
                  Math.round((d.bookingCount / max) * MAX_BAR_HEIGHT_PX),
                );
          const fill = d.isToday
            ? "bg-[#B8896B]"
            : d.isPast
              ? "bg-[#E7E5E4]"
              : "bg-[#0A0A0A]";
          return (
            <div
              key={d.label}
              className="flex flex-1 flex-col items-center gap-2"
              title={`${d.label}, ${d.dateLocal}: ${d.bookingCount} booking${d.bookingCount === 1 ? "" : "s"}`}
            >
              <span
                className={`text-[10px] font-semibold ${
                  d.isToday ? "text-[#B8896B]" : "text-[#525252]"
                }`}
              >
                {d.bookingCount > 0 ? d.bookingCount : ""}
              </span>
              <div
                className={`w-full rounded-t ${fill}`}
                style={{ height: `${heightPx}px` }}
              />
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  d.isToday ? "font-semibold text-[#B8896B]" : "text-[#A3A3A3]"
                }`}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
