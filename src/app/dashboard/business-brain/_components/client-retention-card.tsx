import { Heart } from "lucide-react";
import type { ClientRetention } from "@/lib/business-brain";

/**
 * Cohort retention metric. Cohort = clients whose first booking was
 * 180-90 days ago (a 90-day acquisition window ending 90 days ago).
 * Retained = at least one booking in the last 90 days.
 *
 * Mental model: "Of the clients I acquired 3-6 months ago, how many
 * are still booking?" True cohort math; smaller numbers but more
 * actionable signal than an open-ended "ever booked + booked again"
 * definition would give.
 *
 * Sample-size: ≥10 clients in the cohort. Below threshold renders an
 * honest empty state.
 */
export function ClientRetentionCard({ data }: { data: ClientRetention }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Client retention
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">3-6 month cohort</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Retention rate appears here once you have at least 10 clients whose first booking was
          3-6 months ago. Currently {data.cohortSize} in the cohort.
        </p>
      ) : (
        <div className="mt-4">
          <p className="font-display text-3xl font-medium text-[#0A0A0A] tabular-nums">
            {Math.round(data.retentionRate * 100)}%
            <span className="ml-2 text-base font-normal text-[#737373]">retained</span>
          </p>
          <p className="mt-2 text-xs text-[#737373]">
            {data.retainedCount} of {data.cohortSize} clients you acquired 3-6 months ago have
            booked at least once in the last 90 days.
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-[#A3A3A3]">
            Cohort = clients whose first booking was 90-180 days ago. Retained = booked at all
            in the last 90 days.
          </p>
        </div>
      )}
    </section>
  );
}
