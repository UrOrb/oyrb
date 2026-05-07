import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { RevenueWindow } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * Four-tile revenue overview. Each tile is one window with its prev-period
 * trend arrow. "Gross on calendar" framing across all four — consistent
 * with PR #29's MoneyThisWeekCard.
 *
 * The This Month tile uses same-day-of-month comparison (e.g., May 1-7
 * vs April 1-7) so partway-through-the-month doesn't generate spurious
 * down-arrows. Other tiles use full-period vs full-prior-period.
 *
 * Mobile: 2x2 grid below sm: breakpoint, 4-across above. Long values
 * wrap onto a second line within their tile rather than overflowing.
 */
export function RevenueOverviewCard({ windows }: { windows: RevenueWindow[] }) {
  const empty = windows.every((w) => w.grossCents === 0 && w.prevGrossCents === 0);

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Revenue overview
        </h2>
        <p className="text-[11px] text-[#A3A3A3]">Gross on calendar</p>
      </header>

      {empty ? (
        <p className="mt-4 text-sm text-[#737373]">
          Run a few bookings and your revenue across short and long windows will appear here.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {windows.map((w) => (
            <Tile key={w.label} window={w} />
          ))}
        </div>
      )}
    </section>
  );
}

function Tile({ window: w }: { window: RevenueWindow }) {
  const direction = compareDirection(w.grossCents, w.prevGrossCents);
  return (
    <div className="rounded-lg border border-[#F5F5F4] bg-[#FAFAF9] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
        {w.label}
      </p>
      <p className="mt-1 font-display text-lg font-medium text-[#0A0A0A] tabular-nums">
        {formatCents(w.grossCents)}
      </p>
      <div className="mt-1 flex items-center gap-1 text-[11px] text-[#737373]">
        <Arrow direction={direction} />
        <span className="tabular-nums">{formatCents(w.prevGrossCents)}</span>
        <span className="text-[10px] text-[#A3A3A3]">prev</span>
      </div>
      {w.comparisonNote && (
        <p className="mt-1 text-[10px] italic text-[#A3A3A3]">{w.comparisonNote}</p>
      )}
    </div>
  );
}

type Direction = "up" | "down" | "flat";

function compareDirection(curr: number, prev: number): Direction {
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "flat";
}

function Arrow({ direction }: { direction: Direction }) {
  if (direction === "up")
    return <TrendingUp size={12} className="text-emerald-600" strokeWidth={2.2} />;
  if (direction === "down")
    return <TrendingDown size={12} className="text-red-600" strokeWidth={2.2} />;
  return <Minus size={12} className="text-[#A3A3A3]" strokeWidth={2.2} />;
}
