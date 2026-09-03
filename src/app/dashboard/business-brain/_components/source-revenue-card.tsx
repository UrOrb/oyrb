import { Coins } from "lucide-react";
import type { SourceRevenueResult } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * Same source bucket as Top Sources, ranked by revenue collected
 * through OYRB instead of booking count. Reuses Phase 4.2's
 * aggregateMoney for revenue math, so pros without Stripe Connect
 * see $0 across the board (the card empty-states in that case via
 * hasEnoughData).
 *
 * Sample-size: ≥10 bookings AND at least one source with collected
 * revenue. The booking-count guard alone would render a confusing
 * "all $0" column for pros who collect outside OYRB.
 */
export function SourceRevenueCard({ data }: { data: SourceRevenueResult }) {
  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Revenue by source
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {!data.hasEnoughData ? (
        <p className="mt-4 text-sm text-[#737373]">
          Revenue by source appears here once you have at least 10 bookings in the last 90 days
          and at least one of them collected payment through OYRB.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {data.rows.map((r, idx) => {
            const max = data.rows[0]?.revenueCollectedCents ?? 0;
            const widthPct =
              max > 0
                ? Math.max(8, Math.round((r.revenueCollectedCents / max) * 100))
                : 0;
            return (
              <li
                key={r.source}
                className="rounded-xl border border-[#EDE9E4] bg-white/70 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      <span className="mr-2 text-[#A3A3A3]">{idx + 1}.</span>
                      {r.source}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#737373]">
                      {r.bookingCount} booking{r.bookingCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="font-display text-base font-medium text-[#0A0A0A] tabular-nums">
                    {formatCents(r.revenueCollectedCents)}
                  </p>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#F5F5F4]">
                  <div
                    className="h-full bg-[#B8896B]"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
