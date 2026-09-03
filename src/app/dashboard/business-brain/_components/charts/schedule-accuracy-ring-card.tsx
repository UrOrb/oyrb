import { Gauge } from "lucide-react";
import type { ScheduleAccuracy } from "@/lib/business-brain";
import { ProgressRing } from "../../_charts/progress-ring";

/**
 * Phase 9 PR 6 — Schedule accuracy as a progress ring.
 *
 * "Accuracy" here = (scheduled ÷ actual) clamped to 0..100%. A pro who
 * consistently runs 10% over scheduled time renders at ~91% accuracy.
 * Pros who finish UNDER scheduled time still render at 100% (we're
 * not penalizing efficiency).
 *
 * Sub-label below the ring carries the avg overrun in minutes for
 * directionality — a 91% ring with "+8 min avg overrun" tells a more
 * complete story than the percentage alone.
 */
export function ScheduleAccuracyRingCard({
  accuracy,
}: {
  accuracy: ScheduleAccuracy;
}) {
  if (!accuracy.hasEnoughData) {
    return (
      <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
        <Header />
        <p className="mt-4 text-sm text-[#737373]">
          Schedule accuracy shows up after enough completed appointments with Start + Stop pings.
        </p>
      </section>
    );
  }

  // accuracy.overrunPercent: positive = over scheduled time.
  // Ring fills with "on-schedule percentage" = max(0, 100 - overrun*100).
  const overrunPct = accuracy.overrunPercent * 100;
  const onSchedulePct = Math.max(0, 100 - overrunPct);

  const overrun = accuracy.avgOverrunMinutes;
  const overrunLabel =
    Math.abs(overrun) < 0.5
      ? "right on time"
      : overrun > 0
        ? `+${Math.round(overrun)} min avg overrun`
        : `${Math.round(overrun)} min avg under`;

  return (
    <section className="flex flex-col items-center rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <div className="mb-4 flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Schedule accuracy
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">90 days</p>
      </div>
      <ProgressRing
        percent={onSchedulePct}
        centerSecondary={overrunLabel}
        size={160}
        ariaLabel={`${Math.round(onSchedulePct)}% on schedule`}
      />
      <p className="mt-3 text-[11px] text-[#737373]">
        {accuracy.qualifyingBookings} qualifying booking
        {accuracy.qualifyingBookings === 1 ? "" : "s"}
      </p>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Gauge size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Schedule accuracy
        </h2>
      </div>
      <p className="text-[11px] text-[#A3A3A3]">90 days</p>
    </header>
  );
}
