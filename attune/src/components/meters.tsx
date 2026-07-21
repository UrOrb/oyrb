"use client";

import { EMOTION_METERS, meterColor, moodPhrase } from "@/lib/emotion";
import type { EmotionalState, Emotion, Intensity } from "@/lib/emotion";

export function Meters({ state, className = "" }: { state: EmotionalState; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-3 ${className}`}>
      {EMOTION_METERS.map((m) => {
        const value = state[m.key];
        const color = meterColor(value, m.invertHealth);
        return (
          <div key={m.key}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[11px] font-medium tracking-wide uppercase text-soft">{m.label}</span>
              <span className="text-[11px] tabular-nums text-soft">{value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${value}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MoodBadge({
  emotion,
  intensity,
  shift,
}: {
  emotion: Emotion;
  intensity: Intensity;
  shift?: string;
}) {
  return (
    <div className="animate-rise" key={`${emotion}-${shift}`}>
      <div className="text-sm">
        <span className="text-soft">Feeling </span>
        <span className="font-display italic" style={{ color: "var(--color-clay)" }}>
          {moodPhrase(emotion, intensity)}
        </span>
      </div>
      {shift ? <p className="mt-0.5 text-xs text-soft">{shift}</p> : null}
    </div>
  );
}

export function GoalBar({ progress }: { progress: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-medium tracking-wide uppercase text-soft">Toward your goal</span>
        <span className="text-[11px] tabular-nums text-soft">{progress}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%`, background: "var(--color-clay)" }}
        />
      </div>
    </div>
  );
}
