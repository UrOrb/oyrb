"use client";

/**
 * 7×24 booking heatmap — Phase 9 PR 6.
 *
 * Custom SVG, no Recharts (Recharts has no built-in heatmap).
 * Renders a 7-row × 24-column grid of <rect> cells colored by the
 * cell value relative to maxCell. 5 quantized color steps from
 * cream (low) → warm brown (high). Empty cells render as the lightest
 * neutral so the grid stays readable when most cells are zero.
 *
 * Mobile fallback (< 640px): renders a vertical list of the top 5
 * busiest (weekday, hour) combos as plain text — heatmaps are
 * functionally unreadable at narrow widths.
 *
 * The 7-day axis is Mon..Sun to match the rest of business-brain's
 * weekday convention (getWeekRange / dayOfWeek.days).
 */

const COLOR_STEPS = [
  "#FAFAF9", // empty (lighter than F5EBD8 so the empty pattern is clear)
  "#F5EBD8", // cream — low
  "#E8D2B6", // peach — low-mid
  "#D9B894", // warm tan — mid
  "#C99D74", // toast — mid-high
  "#B8896B", // warm brown — high
] as const;

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  /** 7×24 grid. [day 0..6 = Mon..Sun][hour 0..23]. */
  grid: number[][];
  maxCell: number;
  totalBookings: number;
  hasEnoughData: boolean;
  ariaLabel?: string;
};

function colorFor(value: number, max: number): string {
  if (value === 0 || max === 0) return COLOR_STEPS[0];
  // 5 active steps (skip index 0 = empty). Bucket value into 1..5.
  const ratio = value / max;
  if (ratio <= 0.2) return COLOR_STEPS[1];
  if (ratio <= 0.4) return COLOR_STEPS[2];
  if (ratio <= 0.6) return COLOR_STEPS[3];
  if (ratio <= 0.8) return COLOR_STEPS[4];
  return COLOR_STEPS[5];
}

function formatHour(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  if (h < 12) return `${h}a`;
  return `${h - 12}p`;
}

export function Heatmap({
  grid,
  maxCell,
  totalBookings,
  hasEnoughData,
  ariaLabel,
}: Props) {
  if (!hasEnoughData) {
    return (
      <p className="text-sm text-[#737373]">
        Patterns emerge after ~30 bookings. {totalBookings} so far.
      </p>
    );
  }

  // Top 5 busiest (day, hour) combos — used by the mobile fallback
  // AND surfaced as a small "busiest" caption below the heatmap on
  // desktop. Computed in render; the grid is 168 cells max so this
  // is trivially cheap.
  const cells: Array<{ day: number; hour: number; count: number }> = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const v = grid[d]?.[h] ?? 0;
      if (v > 0) cells.push({ day: d, hour: h, count: v });
    }
  }
  cells.sort((a, b) => b.count - a.count);
  const topFive = cells.slice(0, 5);

  return (
    <div aria-label={ariaLabel}>
      {/* Desktop / tablet ≥ 640px — full SVG heatmap */}
      <div className="hidden sm:block">
        <DesktopHeatmap grid={grid} maxCell={maxCell} />
        {topFive.length > 0 && (
          <p className="mt-3 text-[11px] text-[#737373]">
            Busiest:{" "}
            {topFive.slice(0, 3).map((c, i) => (
              <span key={`${c.day}-${c.hour}`}>
                {DAY_LABELS[c.day]} {formatHour(c.hour)} ({c.count}
                {i < Math.min(2, topFive.length - 1) ? "), " : ")"}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Mobile < 640px — text list fallback */}
      <div className="sm:hidden">
        {topFive.length === 0 ? (
          <p className="text-sm text-[#737373]">No bookings in window.</p>
        ) : (
          <>
            <p className="text-xs text-[#737373]">Busiest times</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[#525252]">
              {topFive.map((c) => (
                <li
                  key={`${c.day}-${c.hour}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span>
                    {DAY_LABELS[c.day]} at {formatHour(c.hour)}
                  </span>
                  <span className="font-mono text-xs text-[#737373]">
                    {c.count} {c.count === 1 ? "booking" : "bookings"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Desktop SVG grid. 24-wide × 7-tall cells. Cell aspect kept square
 * via SVG viewBox + preserveAspectRatio. CSS scales the SVG to
 * container width.
 */
function DesktopHeatmap({
  grid,
  maxCell,
}: {
  grid: number[][];
  maxCell: number;
}) {
  // Layout constants
  const CELL = 14; // visual unit; scaled by SVG viewport
  const GAP = 2;
  const LABEL_LEFT = 36; // room for "Mon" labels
  const LABEL_TOP = 18; // room for hour ticks (every 3h)
  const W = LABEL_LEFT + 24 * (CELL + GAP);
  const H = LABEL_TOP + 7 * (CELL + GAP);

  return (
    <svg
      role="img"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
    >
      {/* Hour labels — every 3 hours so the row isn't too dense */}
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
        <text
          key={h}
          x={LABEL_LEFT + h * (CELL + GAP) + CELL / 2}
          y={LABEL_TOP - 4}
          fontSize={10}
          fill="#737373"
          textAnchor="middle"
        >
          {formatHour(h)}
        </text>
      ))}

      {/* Day labels (left column) */}
      {DAY_LABELS.map((label, d) => (
        <text
          key={label}
          x={LABEL_LEFT - 8}
          y={LABEL_TOP + d * (CELL + GAP) + CELL / 2 + 3}
          fontSize={10}
          fill="#737373"
          textAnchor="end"
        >
          {label}
        </text>
      ))}

      {/* Cells */}
      {grid.map((row, d) =>
        row.map((value, h) => {
          const fill = colorFor(value, maxCell);
          return (
            <rect
              key={`${d}-${h}`}
              x={LABEL_LEFT + h * (CELL + GAP)}
              y={LABEL_TOP + d * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={fill}
            >
              <title>
                {DAY_LABELS[d]} {formatHour(h)} — {value}{" "}
                {value === 1 ? "booking" : "bookings"}
              </title>
            </rect>
          );
        }),
      )}
    </svg>
  );
}
