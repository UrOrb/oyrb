"use client";

import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * Spline area chart primitive — Phase 9 PR 6.
 *
 * Single brand-warm-brown stroke + 20% opacity fill. Monotone
 * interpolation keeps the curve smooth without overshooting between
 * data points (cardinal would, area-step would lose the spline look).
 *
 * Used by MoneyTrend, NewClientsTrend, and any future time-series
 * tile. The data shape is intentionally generic — caller passes a
 * `data` array of objects + the two key names. Y-axis is automatic
 * with a 4-tick limit to keep the chart legible.
 *
 * Axis + grid use OYRB's neutral border tone #E7E5E4 so the chart
 * never competes with the data line for attention.
 */

type Props<K extends string> = {
  data: Array<Record<K, string | number>>;
  xKey: K;
  yKey: K;
  /** Custom formatter for the y-axis tick labels (e.g. dollars). */
  formatY?: (v: number) => string;
  /** Custom formatter for tooltip value. Default: formatY when set,
   *  otherwise toLocaleString. */
  formatTooltip?: (v: number) => string;
  /** Fixed pixel height. 128px (8rem) by default; bento hero tiles
   *  pass 160-200. */
  height?: number;
  /** ARIA label for the chart region. */
  ariaLabel?: string;
};

const STROKE = "#B8896B";
const FILL = "#B8896B";
const GRID = "#E7E5E4";
const TICK = "#737373";

export function AreaChart<K extends string>({
  data,
  xKey,
  yKey,
  formatY,
  formatTooltip,
  height = 128,
  ariaLabel,
}: Props<K>) {
  const tooltipFormatter = (value: unknown) => {
    if (typeof value !== "number") return String(value);
    if (formatTooltip) return formatTooltip(value);
    if (formatY) return formatY(value);
    return value.toLocaleString("en-US");
  };
  return (
    <div className="w-full" style={{ height }} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke={GRID}
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey={xKey as string}
            tick={{ fontSize: 11, fill: TICK }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: TICK }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={formatY}
            width={36}
            tickCount={4}
          />
          <Tooltip
            cursor={{ stroke: GRID, strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: `1px solid ${GRID}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              color: "#525252",
            }}
            labelStyle={{ color: "#0A0A0A", fontWeight: 600 }}
            formatter={(value) => [tooltipFormatter(value), ""]}
          />
          <Area
            type="monotone"
            dataKey={yKey as string}
            stroke={STROKE}
            strokeWidth={2}
            fill={FILL}
            fillOpacity={0.2}
            activeDot={{ r: 4, fill: STROKE, stroke: "#FFFFFF", strokeWidth: 2 }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
