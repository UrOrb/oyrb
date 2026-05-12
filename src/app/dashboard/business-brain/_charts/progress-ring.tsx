"use client";

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";

/**
 * Progress ring primitive — Phase 9 PR 6.
 *
 * #B8896B filled arc on a #E7E5E4 track. The percentage renders in
 * the center using font-display. Optional secondary line below for
 * context ("12 of 14 completed", etc.).
 *
 * Used by ScheduleAccuracy, RepeatRatio, ConversionRate, and the
 * future Goal indicator on the Money tab. Single primitive serves
 * 4+ tiles — built once, used widely.
 *
 * Implementation note: RadialBarChart with a fixed PolarAngleAxis
 * domain [0, 100] is the cleanest way to render a single-value ring
 * in Recharts. The track is rendered via background prop on RadialBar
 * — saves us from layering two charts.
 */

type Props = {
  /** Percentage value, 0..100. Caller clamps. */
  percent: number;
  /** Center heading. Default: "${percent}%". */
  centerPrimary?: string;
  /** Optional secondary line below the center number. */
  centerSecondary?: string;
  size?: number;
  ariaLabel?: string;
};

const ARC = "#B8896B";
const TRACK = "#E7E5E4";

export function ProgressRing({
  percent,
  centerPrimary,
  centerSecondary,
  size = 160,
  ariaLabel,
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const data = [{ name: "progress", value: clamped, fill: ARC }];
  const label = centerPrimary ?? `${Math.round(clamped)}%`;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={ariaLabel ?? `${Math.round(clamped)}% progress`}
      role="img"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="78%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: TRACK }}
            dataKey="value"
            cornerRadius={6}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-2xl font-medium tracking-tight text-[#0A0A0A]">
          {label}
        </p>
        {centerSecondary && (
          <p className="mt-0.5 text-[11px] text-[#737373]">{centerSecondary}</p>
        )}
      </div>
    </div>
  );
}
