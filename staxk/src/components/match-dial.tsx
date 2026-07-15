"use client";

// The signature element (SPEC §2): a circular gauge showing match score 0–100.
// `atsScore` adds the inner Gatekeeper ring → the dual Match Dial.
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function MatchDial({
  score,
  atsScore,
  size = 56,
  label,
  className,
}: {
  score: number;
  atsScore?: number | null;
  size?: number;
  label?: string;
  className?: string;
}) {
  // Animate from 0 on first paint (CSS transition handles easing;
  // globals.css disables it under prefers-reduced-motion). Deferred to a
  // frame callback so the browser paints the empty arc first.
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPainted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const stroke = size >= 96 ? 8 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const outerOffset = c * (1 - (painted ? score : 0) / 100);

  const innerR = r - stroke - 3;
  const innerC = 2 * Math.PI * innerR;
  const innerOffset =
    innerC * (1 - (painted ? (atsScore ?? 0) : 0) / 100);

  const dialLabel =
    label ??
    `Match score ${Math.round(score)} out of 100${
      atsScore != null ? `, ATS score ${Math.round(atsScore)} out of 100` : ""
    }`;

  return (
    <div
      role="img"
      aria-label={dialLabel}
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          className="dial-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={outerOffset}
        />
        {atsScore != null && innerR > 6 && (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={innerR}
              fill="none"
              stroke="var(--line)"
              strokeWidth={Math.max(3, stroke - 2)}
            />
            <circle
              className="dial-arc"
              cx={size / 2}
              cy={size / 2}
              r={innerR}
              fill="none"
              stroke="var(--pulse)"
              strokeWidth={Math.max(3, stroke - 2)}
              strokeLinecap="round"
              strokeDasharray={innerC}
              strokeDashoffset={innerOffset}
            />
          </>
        )}
      </svg>
      <span
        aria-hidden="true"
        className="absolute font-display font-semibold"
        style={{ fontSize: size / 3.4 }}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}
