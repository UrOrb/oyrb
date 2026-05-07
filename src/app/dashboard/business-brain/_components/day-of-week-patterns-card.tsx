import { CalendarRange } from "lucide-react";
import type { DayOfWeekPatterns } from "@/lib/business-brain";

/**
 * 7-bar breakdown of which days of the week tend to fill up. Mon–Sun
 * in pro's local timezone. No Phase 3 dependency. Sample-size ≥10
 * bookings.
 *
 * The busiest day's bar is highlighted in accent color so a glance
 * reveals the peak day without parsing all seven counts.
 */
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 96;

export function DayOfWeekPatternsCard({ data }: { data: DayOfWeekPatterns }) {
  const max = data.days.reduce((m, d) => Math.max(m, d.count), 0);

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Day of week
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Day-of-week patterns appear here once you have at least 10 bookings in the last 90
          days. Currently {data.totalBookings}.
        </p>
      ) : (
        <div className="mt-5 flex h-32 items-end justify-between gap-2">
          {data.days.map((d) => {
            const isPeak = d.count > 0 && d.count === max;
            const heightPx =
              max === 0
                ? MIN_BAR_HEIGHT_PX
                : Math.max(
                    MIN_BAR_HEIGHT_PX,
                    Math.round((d.count / max) * MAX_BAR_HEIGHT_PX),
                  );
            return (
              <div
                key={d.label}
                className="flex flex-1 flex-col items-center gap-1.5"
                title={`${d.label}: ${d.count} booking${d.count === 1 ? "" : "s"}`}
              >
                <span
                  className={`text-[10px] font-semibold tabular-nums ${
                    isPeak ? "text-[#B8896B]" : "text-[#525252]"
                  }`}
                >
                  {d.count > 0 ? d.count : ""}
                </span>
                <div
                  className={`w-full rounded-t ${isPeak ? "bg-[#B8896B]" : "bg-[#0A0A0A]"}`}
                  style={{ height: `${heightPx}px` }}
                />
                <span
                  className={`text-[10px] uppercase tracking-wider ${
                    isPeak ? "font-semibold text-[#B8896B]" : "text-[#A3A3A3]"
                  }`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
