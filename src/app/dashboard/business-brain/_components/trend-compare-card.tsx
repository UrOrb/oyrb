import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TrendCompare } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";
import { BrainCard, EmptyState } from "./brain-card";

/**
 * Last week vs this week — three metrics side by side with a trend
 * arrow per row. Comparison is always SAME pro across two weeks;
 * never against other pros.
 *
 * Completion rate handles null gracefully — if either week has no
 * resolved bookings (no completed + no pro-cancelled), the row
 * shows "—" rather than 0% / NaN%.
 */
export function TrendCompareCard({ trend }: { trend: TrendCompare }) {
  const empty =
    trend.bookingsThisWeek === 0 &&
    trend.bookingsLastWeek === 0 &&
    trend.grossThisWeekCents === 0 &&
    trend.grossLastWeekCents === 0;

  return (
    <BrainCard>
      <header className="flex items-center gap-2">
        <TrendingUp size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Last week vs this week
        </h2>
      </header>

      {empty ? (
        <EmptyState>
          Run a few weeks of bookings and your week-over-week trend will appear here.
        </EmptyState>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#EDE9E4] bg-white/70">
          <Row
            label="Bookings"
            lastWeek={trend.bookingsLastWeek.toString()}
            thisWeek={trend.bookingsThisWeek.toString()}
            direction={compareDirection(trend.bookingsThisWeek, trend.bookingsLastWeek)}
          />
          <Row
            label="Gross revenue"
            lastWeek={formatCents(trend.grossLastWeekCents)}
            thisWeek={formatCents(trend.grossThisWeekCents)}
            direction={compareDirection(trend.grossThisWeekCents, trend.grossLastWeekCents)}
          />
          <Row
            label="Completion rate"
            lastWeek={fmtRate(trend.completionRateLastWeek)}
            thisWeek={fmtRate(trend.completionRateThisWeek)}
            direction={compareDirectionMaybe(
              trend.completionRateThisWeek,
              trend.completionRateLastWeek,
            )}
          />
        </div>
      )}
    </BrainCard>
  );
}

type Direction = "up" | "down" | "flat" | "n/a";

function Row({
  label,
  lastWeek,
  thisWeek,
  direction,
}: {
  label: string;
  lastWeek: string;
  thisWeek: string;
  direction: Direction;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-[#E7E5E4]/80 px-3 py-3 last:border-0">
      <p className="border-l-2 border-[#B8896B]/40 pl-2 text-xs text-[#737373]">{label}</p>
      <p className="text-sm text-[#737373] tabular-nums">{lastWeek}</p>
      <p className="text-sm font-semibold text-[#0A0A0A] tabular-nums">{thisWeek}</p>
      <Arrow direction={direction} />
    </div>
  );
}

function Arrow({ direction }: { direction: Direction }) {
  if (direction === "up")
    return <TrendingUp size={14} className="text-emerald-600" strokeWidth={2} />;
  if (direction === "down")
    return <TrendingDown size={14} className="text-red-600" strokeWidth={2} />;
  if (direction === "flat")
    return <Minus size={14} className="text-[#A3A3A3]" strokeWidth={2} />;
  return <span className="text-[10px] text-[#A3A3A3]">—</span>;
}

function compareDirection(curr: number, prev: number): Direction {
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "flat";
}

function compareDirectionMaybe(curr: number | null, prev: number | null): Direction {
  if (curr === null || prev === null) return "n/a";
  return compareDirection(curr, prev);
}

function fmtRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}
