"use client";

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatterFor, type ValueFormat } from "./format";

/**
 * Horizontal bar chart primitive — Phase 9 PR 6.
 *
 * Bars are #B8896B at full opacity. Labels (categories) are along
 * the Y-axis (vertical layout in Recharts terminology); values are
 * along X. Labels truncate via Recharts' tick prop max-width;
 * tooltip exposes the full label on hover.
 *
 * Used by TopEarningServices and any future ranked-list visualization.
 *
 * Value formatting is controlled via a serializable `format` string
 * (not a function — server components can't pass functions to client
 * components in Next 16 / React 19). Callers convert cents → dollars
 * BEFORE passing data when they want currency display.
 */

type Datum = { label: string; value: number };

type Props = {
  data: Datum[];
  /** Serializable format hint for the value tick + tooltip. Default
   *  "number". See ./format.ts. */
  format?: ValueFormat;
  height?: number;
  ariaLabel?: string;
};

const BAR = "#B8896B";
const GRID = "#E7E5E4";
const TICK = "#737373";

export function HorizontalBar({
  data,
  format = "number",
  height = 200,
  ariaLabel,
}: Props) {
  const formatValue = formatterFor(format);
  const labelTickFormatter = (v: string) =>
    v.length > 14 ? `${v.slice(0, 13)}…` : v;

  return (
    <div className="w-full" style={{ height }} aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid
            stroke={GRID}
            strokeDasharray="2 4"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: TICK }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={(v: number) => formatValue(v)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: TICK }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            width={100}
            tickFormatter={labelTickFormatter}
          />
          <Tooltip
            cursor={{ fill: "#FAFAF9" }}
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: `1px solid ${GRID}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              color: "#525252",
            }}
            labelStyle={{ color: "#0A0A0A", fontWeight: 600 }}
            formatter={(value) => [
              typeof value === "number" ? formatValue(value) : String(value),
              "",
            ]}
          />
          <Bar dataKey="value" fill={BAR} radius={[0, 3, 3, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
