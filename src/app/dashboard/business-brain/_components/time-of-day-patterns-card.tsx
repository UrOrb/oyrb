import { Sun } from "lucide-react";
import type { TimeOfDayPatterns } from "@/lib/business-brain";

/**
 * Three-bucket breakdown of when bookings happen — morning (before
 * 12pm) / afternoon (12–5pm) / evening (after 5pm). All in pro's
 * local timezone. No Phase 3 dependency; just start_at.
 *
 * Sample-size: ≥10 bookings in 90 days. Below threshold renders an
 * honest empty state — a 3-bar chart of (1, 2, 0) is misleading.
 */
const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 96;

export function TimeOfDayPatternsCard({ data }: { data: TimeOfDayPatterns }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sun size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Time of day
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Time-of-day patterns appear here once you have at least 10 bookings in the last 90
          days. Currently {data.totalBookings}.
        </p>
      ) : (
        <>
          <div className="mt-5 flex h-32 items-end justify-around gap-4">
            {data.buckets.map((b) => {
              const max = Math.max(...data.buckets.map((x) => x.count), 1);
              const heightPx = Math.max(
                MIN_BAR_HEIGHT_PX,
                Math.round((b.count / max) * MAX_BAR_HEIGHT_PX),
              );
              return (
                <div
                  key={b.bucket}
                  className="flex flex-1 flex-col items-center gap-2"
                  title={`${b.label}: ${b.count} booking${b.count === 1 ? "" : "s"}`}
                >
                  <span className="text-[11px] font-semibold text-[#0A0A0A] tabular-nums">
                    {b.count}
                  </span>
                  <div
                    className="w-full max-w-[80px] rounded-t bg-[#0A0A0A]"
                    style={{ height: `${heightPx}px` }}
                  />
                  <span className="text-[11px] uppercase tracking-wider text-[#525252]">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-[#A3A3A3]">
            Morning &lt; 12pm · Afternoon 12–5pm · Evening 5pm+ (pro&apos;s local timezone).
          </p>
        </>
      )}
    </section>
  );
}
