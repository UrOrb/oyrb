import { Zap } from "lucide-react";
import type { ProfitPerMinute } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";
import { BrainCard, EmptyState } from "./brain-card";

/**
 * The Money tab's flagship metric. Computed as
 *   total revenue (gross on calendar) / total minutes of actual service
 * across qualifying bookings in the last 90 days. "Qualifying" means
 * BOTH service_started_at and service_ended_at are populated — i.e.,
 * the pro tapped Start AND Stop on those bookings (Phase 3 / PR #28).
 *
 * Sample-size guard: ≥5 qualifying bookings. Below that, we render
 * an honest empty state pointing the pro at the Phase 3 buttons. We
 * do NOT show a number computed off 1-2 bookings — too easy to
 * mislead, especially since outlier durations distort small samples.
 *
 * Calculation method: total-over-total (option 2 from spec). Treats
 * each minute equally regardless of which booking it came from.
 * Per-booking averaging would over-weight short, low-revenue
 * services.
 */
export function ProfitPerMinuteCard({ data }: { data: ProfitPerMinute }) {
  return (
    <BrainCard>
      <header className="flex items-center gap-2">
        <Zap size={16} className="text-[#B8896B]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Profit per minute
        </h2>
      </header>

      {!data.hasEnoughData ? (
        <EmptyState className="text-[#525252]">
          <p className="leading-relaxed">
            Profit per minute appears here once you have at least 5 services with timing data.
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
        </EmptyState>
      ) : (
        <div className="mt-4">
          <p className="font-display text-3xl font-medium text-[#0A0A0A] tabular-nums">
            {formatCents(Math.round(data.centsPerMinute * 100) / 100)}
            <span className="ml-1 text-base font-normal text-[#737373]">/min</span>
          </p>
          <p className="mt-2 text-xs text-[#737373]">
            Across {data.qualifyingBookings} service
            {data.qualifyingBookings === 1 ? "" : "s"} totaling{" "}
            {formatMinutes(data.totalMinutes)} of actual service time over the last 90 days.
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-[#A3A3A3]">
            Total revenue on the calendar ÷ total minutes of actual service. Treats each minute
            equally — a 60-min $100 service and a 30-min $50 service contribute the same per-min
            rate.
          </p>
        </div>
      )}
    </BrainCard>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 10) return `${h.toFixed(1)} hr`;
  return `${Math.round(h)} hr`;
}
