import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { BentoTile } from "../bento-tile";

/**
 * Money tile — this-week gross with week-over-week delta. Pulls from
 * getThisWeekData(...).money.grossCents (current week) and the
 * trend.grossLastWeekCents for the comparison.
 *
 * "Gross" — what appointments are worth, before payment-collected
 * filtering. Matches the language Business Brain uses on its This
 * Week's Money card. Doesn't try to summarize the payment-mix
 * breakdown here — that's for the Business Brain page.
 */
export function MoneyTile({
  grossThisWeekCents,
  grossLastWeekCents,
}: {
  grossThisWeekCents: number;
  grossLastWeekCents: number;
}) {
  const empty = grossThisWeekCents === 0;
  const delta = grossThisWeekCents - grossLastWeekCents;
  // Avoid divide-by-zero; only show percent when last week had revenue.
  const pct =
    grossLastWeekCents > 0
      ? Math.round((delta / grossLastWeekCents) * 100)
      : null;
  const trendingUp = delta > 0;
  const trendingDown = delta < 0;

  return (
    <BentoTile
      href="/dashboard/business-brain"
      className="col-span-1 sm:col-span-2 lg:col-span-2"
      ariaLabel="This week revenue"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">This week</p>

      {empty ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          This week starts here. Your first paid booking will show up as it
          lands.
        </p>
      ) : (
        <>
          <p className="font-display mt-3 text-3xl font-medium tracking-tight text-[#0A0A0A]">
            ${(grossThisWeekCents / 100).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
          </p>
          {pct !== null && (
            <p
              className={`mt-1 inline-flex items-center gap-1 text-xs ${
                trendingUp
                  ? "text-emerald-700"
                  : trendingDown
                  ? "text-[#525252]"
                  : "text-[#737373]"
              }`}
            >
              {trendingUp && <TrendingUp size={12} strokeWidth={1.5} />}
              {trendingDown && <TrendingDown size={12} strokeWidth={1.5} />}
              {pct >= 0 ? `+${pct}%` : `${pct}%`} vs last week
            </p>
          )}
        </>
      )}

      <p className="mt-auto pt-3 text-xs text-[#A3A3A3]">
        See Business Brain <ArrowRight size={11} strokeWidth={1.5} className="ml-0.5 inline align-baseline opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </BentoTile>
  );
}
