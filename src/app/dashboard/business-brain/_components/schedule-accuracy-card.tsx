import { Clock } from "lucide-react";
import type { ScheduleAccuracy } from "@/lib/business-brain";

/**
 * Schedule accuracy — average overrun across timed services in the
 * last 90 days. Phase 3 timing dependency: needs BOTH
 * service_started_at and service_ended_at populated. Sample-size
 * minimum: 5 timed services.
 *
 * Voice: operational. "Services run 12 minutes over scheduled" —
 * never "you're underestimating." Direction-neutral wording so a pro
 * who consistently runs UNDER scheduled gets accurate reporting too
 * ("Services run 8 minutes under scheduled" reads as a fact, not a
 * compliment or critique).
 *
 * Empty-state shape mirrors PR #30's profit-per-minute card so pros
 * recognize "this card is waiting for Phase 3 data" wherever it
 * appears.
 */
export function ScheduleAccuracyCard({ data }: { data: ScheduleAccuracy }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Schedule accuracy
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <div className="mt-4 rounded-lg bg-[#FAFAF9] p-4 text-sm text-[#525252]">
          <p className="leading-relaxed">
            Schedule accuracy appears here once you have at least 5 services with timing data.
          </p>
          <p className="mt-2 leading-relaxed">
            Tap <strong className="text-[#0A0A0A]">Start</strong> when a client arrives and{" "}
            <strong className="text-[#0A0A0A]">Stop</strong> when finished — those buttons live
            on each booking&apos;s detail page.
          </p>
          {data.qualifyingBookings > 0 && (
            <p className="mt-3 text-[11px] text-[#737373]">
              {data.qualifyingBookings} of 5 needed so far. Keep going.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="font-display text-3xl font-medium text-[#0A0A0A] tabular-nums">
            {fmtOverrun(data.avgOverrunMinutes)}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {fmtOverrunPercent(data.overrunPercent)}
          </p>
          <p className="mt-3 text-[11px] text-[#A3A3A3]">
            Based on {data.qualifyingBookings} timed service
            {data.qualifyingBookings === 1 ? "" : "s"} in the last 90 days. Scheduled = the
            calendar block at booking time. Actual = the time between Start and Stop taps.
          </p>
        </div>
      )}
    </section>
  );
}

function fmtOverrun(min: number): string {
  const abs = Math.abs(min);
  const rounded = abs < 1 ? abs.toFixed(1) : Math.round(abs).toString();
  if (Math.abs(min) < 0.5) return "On schedule";
  return min > 0
    ? `+${rounded} min over scheduled`
    : `−${rounded} min under scheduled`;
}

function fmtOverrunPercent(p: number): string {
  if (Math.abs(p) < 0.005) return "Exactly matched on average";
  const pct = Math.round(Math.abs(p) * 100);
  return p > 0
    ? `${pct}% over scheduled`
    : `${pct}% under scheduled`;
}
