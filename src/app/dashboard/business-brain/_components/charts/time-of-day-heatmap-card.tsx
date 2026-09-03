import { Activity } from "lucide-react";
import type { HourByDayHistogram } from "@/lib/business-brain";
import { Heatmap } from "../../_charts/heatmap";

/**
 * Phase 9 PR 6 — Time-of-day patterns as a 7×24 heatmap.
 *
 * Replaces the 3-bucket morning/afternoon/evening text breakdown
 * (TimeOfDayPatternsCard) with hour-resolution density. Reads the
 * hourByDay grid extension added to getTimeData in the same PR.
 *
 * Mobile renders as a top-5 busiest-times text list — the Heatmap
 * component handles the breakpoint switch internally.
 */
export function TimeOfDayHeatmapCard({
  hourByDay,
}: {
  hourByDay: HourByDayHistogram;
}) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Time of day
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">90 days</p>
      </header>

      <div className="mt-4">
        <Heatmap
          grid={hourByDay.grid}
          maxCell={hourByDay.maxCell}
          totalBookings={hourByDay.totalBookings}
          hasEnoughData={hourByDay.hasEnoughData}
          ariaLabel="Hour-by-day booking density"
        />
      </div>
    </section>
  );
}
