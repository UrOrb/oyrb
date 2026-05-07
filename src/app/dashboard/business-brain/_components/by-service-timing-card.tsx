import { Timer } from "lucide-react";
import type { ByServiceTimingResult } from "@/lib/business-brain";

/**
 * Per-service timing breakdown. Top 5 services by booking volume
 * (most-booked first) where the service has at least 3 timed
 * bookings in the 90-day window. Sort-by-volume rather than
 * sort-by-overrun so pros see timing data on the services they
 * book most — outlier overruns from rarely-booked services would
 * mislead.
 *
 * Empty-state shape mirrors profit-per-minute / schedule-accuracy
 * for visual consistency.
 */
export function ByServiceTimingCard({ data }: { data: ByServiceTimingResult }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Timer size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Timing by service
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <div className="mt-4 rounded-lg bg-[#FAFAF9] p-4 text-sm text-[#525252]">
          <p className="leading-relaxed">
            Per-service timing appears here once you have at least 3 timed bookings on the same
            service.
          </p>
          <p className="mt-2 leading-relaxed">
            Tap <strong className="text-[#0A0A0A]">Start</strong> when a client arrives and{" "}
            <strong className="text-[#0A0A0A]">Stop</strong> when finished — those buttons live
            on each booking&apos;s detail page.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.rows.map((r) => (
            <li
              key={r.serviceId}
              className="rounded-lg border border-[#F5F5F4] bg-white p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0A0A0A]">{r.name}</p>
                  <p className="mt-0.5 text-[11px] text-[#737373]">
                    {Math.round(r.avgScheduledMinutes)} min scheduled →{" "}
                    {Math.round(r.avgActualMinutes)} min actual · {r.timedBookingCount} timed of{" "}
                    {r.bookingCount} booking{r.bookingCount === 1 ? "" : "s"}
                  </p>
                </div>
                <DeltaPill min={r.avgOverrunMinutes} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeltaPill({ min }: { min: number }) {
  const abs = Math.abs(min);
  const rounded = abs < 1 ? abs.toFixed(1) : Math.round(abs).toString();
  const onSchedule = abs < 0.5;
  const tone = onSchedule
    ? "bg-[#FAFAF9] text-[#525252]"
    : min > 0
      ? "bg-amber-50 text-amber-800"
      : "bg-emerald-50 text-emerald-700";
  const label = onSchedule
    ? "On schedule"
    : min > 0
      ? `+${rounded} min`
      : `−${rounded} min`;
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums ${tone}`}
    >
      {label}
    </span>
  );
}
