import { Globe } from "lucide-react";
import type { BookingOriginBreakdown } from "@/lib/business-brain";

/**
 * Public widget vs manual entry breakdown over the last 90 days.
 * Driven by bookings.booking_source (migration 044) — populated
 * explicitly at every booking-creation path.
 *
 * Two visibility gates:
 *   - hasEnoughData (≥10 bookings in window) drives the sample-size
 *     empty state.
 *   - showCard (publicWidgetCount > 0) hides the entire card when
 *     no public widget bookings exist. Reasoning: a "100% manual,
 *     0% public widget" bar reads as implicit guilt that the
 *     storefront isn't pulling its weight. The softer empty state
 *     here matches Business Brain's operational voice.
 *
 * Unknown bucket exists for legacy rows pre-PR-#15 that have NULL
 * booking_source after migration 044's backfill — typically empty
 * for any pro whose first booking was after late 2024.
 */
export function BookingOriginCard({ data }: { data: BookingOriginBreakdown }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Booking origin
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Booking origin appears here once you have at least 10 bookings in the last 90 days.
          Currently {data.totalBookings}.
        </p>
      ) : !data.showCard ? (
        <p className="mt-4 text-sm text-[#737373]">
          Once clients start booking through your storefront, your origin breakdown appears here.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <Bar
            label="Public booking widget"
            count={data.publicWidgetCount}
            pct={data.publicWidgetPct}
            tone="bg-[#B8896B]"
          />
          <Bar
            label="Manual entry"
            count={data.manualCount}
            pct={data.manualPct}
            tone="bg-[#0A0A0A]"
          />
          {data.unknownCount > 0 && (
            <Bar
              label="Unknown"
              count={data.unknownCount}
              pct={data.unknownPct}
              tone="bg-[#A3A3A3]"
            />
          )}
          <p className="text-[11px] leading-relaxed text-[#A3A3A3]">
            &ldquo;Public booking widget&rdquo; means a client self-served through your
            storefront. &ldquo;Manual entry&rdquo; means you typed the booking in from the
            dashboard.
            {data.unknownCount > 0
              ? " Unknown means the booking pre-dates source tracking — those rows fall off the rolling 90-day window over time."
              : ""}
          </p>
        </div>
      )}
    </section>
  );
}

function Bar({
  label,
  count,
  pct,
  tone,
}: {
  label: string;
  count: number;
  pct: number;
  tone: string;
}) {
  const widthPct = Math.round(pct * 100);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <p className="font-medium text-[#0A0A0A]">{label}</p>
        <p className="tabular-nums text-[#525252]">
          <span className="font-semibold text-[#0A0A0A]">{widthPct}%</span> · {count} booking
          {count === 1 ? "" : "s"}
        </p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F5F5F4]">
        <div className={`h-full ${tone}`} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}
