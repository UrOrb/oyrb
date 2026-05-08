import { Target } from "lucide-react";
import type { ViewsData } from "@/lib/business-brain";

/**
 * Headline conversion-rate metric: views in 90 days → bookings in 90
 * days, simple division.
 *
 * Calculation method (per spec): straight ratio over the 90-day
 * window, no per-session attribution. A view doesn't have to "match"
 * a specific booking — total views in the window divided by total
 * non-cancelled bookings in the same window. Defensible top-of-funnel
 * proxy; per-session attribution is a future refinement.
 *
 * Cancelled bookings excluded — a cancellation isn't a successful
 * conversion (matches the rest of Business Brain's cancelled-bookings
 * rule).
 *
 * Sample-size guard: ≥10 views in 90 days.
 */
export function ConversionRateCard({ data }: { data: ViewsData }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[#B8896B]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Conversion rate
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Conversion rate appears here once you have at least 10 storefront views in the last 90
          days. Currently {data.totalViews}.
        </p>
      ) : (
        <div className="mt-4">
          <p className="font-display text-3xl font-medium text-[#0A0A0A] tabular-nums">
            {(data.conversionRate * 100).toFixed(1)}%
          </p>
          <p className="mt-2 text-xs text-[#737373]">
            <span className="font-semibold tabular-nums text-[#0A0A0A]">
              {data.totalViews.toLocaleString()}
            </span>{" "}
            view{data.totalViews === 1 ? "" : "s"} →{" "}
            <span className="font-semibold tabular-nums text-[#0A0A0A]">
              {data.totalBookings.toLocaleString()}
            </span>{" "}
            non-cancelled booking{data.totalBookings === 1 ? "" : "s"}
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-[#A3A3A3]">
            Total views in the window divided by total non-cancelled bookings. Cancelled
            bookings excluded. Per-session attribution (matching individual viewers to
            individual bookings) is a future refinement.
          </p>
        </div>
      )}
    </section>
  );
}
