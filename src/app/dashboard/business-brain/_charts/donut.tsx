"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

/**
 * Donut chart primitive — Phase 9 PR 6.
 *
 * 60% inner / 80% outer radius (donut hole — eyes find it faster than
 * a solid pie). Slice colors cycle through OYRB's brand palette in a
 * sequence chosen to be readable side-by-side without clashing.
 *
 * Used by PaymentMix, AcquisitionMix, BookingOrigin, and any future
 * category-share visualization.
 *
 * Center label is optional — when passed, renders the total at the
 * donut's center (the brainstorm's "73%" treatment). Useful for
 * "X bookings", "X% of all", etc.
 */

type Slice = { label: string; value: number };

type Props = {
  data: Slice[];
  height?: number;
  /** Optional centered text — typically a total or headline number. */
  centerLabel?: { primary: string; secondary?: string };
  ariaLabel?: string;
  /** Whether to render the Recharts legend below the donut. Default
   *  true. Set false when the caller renders a custom legend
   *  alongside the chart. */
  showLegend?: boolean;
};

const SLICE_COLORS = [
  "#B8896B", // warm brown
  "#F5EBD8", // cream
  "#D9E2D4", // sage green
  "#E5DDD0", // warm taupe
  "#D9DEE5", // dusky blue
];

const GRID = "#E7E5E4";

export function Donut({
  data,
  height = 200,
  centerLabel,
  ariaLabel,
  showLegend = true,
}: Props) {
  return (
    <div
      className="relative w-full"
      style={{ height }}
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="60%"
            outerRadius="80%"
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {data.map((_, idx) => (
              <Cell
                key={idx}
                fill={SLICE_COLORS[idx % SLICE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: `1px solid ${GRID}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              color: "#525252",
            }}
            labelStyle={{ color: "#0A0A0A", fontWeight: 600 }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ fontSize: 11, color: "#525252" }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-2xl font-medium tracking-tight text-[#0A0A0A]">
            {centerLabel.primary}
          </p>
          {centerLabel.secondary && (
            <p className="mt-0.5 text-xs text-[#737373]">{centerLabel.secondary}</p>
          )}
        </div>
      )}
    </div>
  );
}
