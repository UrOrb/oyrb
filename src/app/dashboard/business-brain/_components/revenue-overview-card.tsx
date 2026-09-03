import { TrendingUp, TrendingDown, Minus, Flame } from "lucide-react";
import type { RevenueWindow, PassTheTorch90DayRevenue } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";
import { BrainCard, BrainInset, EmptyState } from "./brain-card";

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
export function RevenueOverviewCard({
  windows,
  passTheTorch90,
}: {
  windows: RevenueWindow[];
  /**
   * Phase 5 closer — last-90-day Pass the Torch revenue subtotal.
   * Renders as a single bottom line on the card, conditional on
   * bookingCount > 0. No per-window breakdown — Pass the Torch is
   * too slow-accumulating for week-level signal to be useful.
   */
  passTheTorch90: PassTheTorch90DayRevenue;
}) {
  const empty = windows.every((w) => w.grossCents === 0 && w.prevGrossCents === 0);

  return (
    <BrainCard>
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Revenue overview
        </h2>
        <p className="text-[11px] text-[#A3A3A3]">Gross on calendar</p>
      </header>

      {empty ? (
        <EmptyState>
          Run a few bookings and your revenue across short and long windows will appear here.
        </EmptyState>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {windows.map((w) => (
            <Tile key={w.label} window={w} />
          ))}
        </div>
      )}

      {/* Phase 5 closer — Pass the Torch revenue subtotal. Single
          bottom line, conditional on ≥1 booking in the 90-day window
          (consistent with the Pass the Torch card's threshold). */}
      {passTheTorch90.bookingCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F5F5F4] pt-3 text-xs">
          <Flame size={12} className="shrink-0 text-[#B8896B]" strokeWidth={1.8} />
          <span className="text-[#525252]">
            <strong className="text-[#0A0A0A]">
              {formatCents(passTheTorch90.revenueCollectedCents)}
            </strong>{" "}
            collected from {passTheTorch90.bookingCount} Pass the Torch booking
            {passTheTorch90.bookingCount === 1 ? "" : "s"} in the last 90 days
          </span>
        </div>
      )}
    </BrainCard>
  );
}

function Tile({ window: w }: { window: RevenueWindow }) {
  const direction = compareDirection(w.grossCents, w.prevGrossCents);
  return (
    <BrainInset className="relative overflow-hidden pl-4 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-r-full before:bg-[#B8896B]/45">
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
    </BrainInset>
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
