"use client";

import type { VoiceStatus } from "@/hooks/use-voice";
import type { Emotion, Intensity } from "@/lib/emotion";

// The character's on-screen presence: a breathing orb whose color and motion
// reflect its current emotion and whether it's speaking. Warm hues for open
// states, cool/gray for withdrawn or guarded ones.

const EMOTION_HUE: Partial<Record<Emotion, string>> = {
  calm: "#7c9a6b",
  warm: "#c2683f",
  engaged: "#c2683f",
  excited: "#d98a3f",
  encouraging: "#7c9a6b",
  compassionate: "#7c9a6b",
  persuaded: "#6b9ac2",
  reassured: "#7c9a6b",
  confused: "#9a8f6b",
  nervous: "#c2a83f",
  embarrassed: "#c27c6b",
  uncomfortable: "#9a8f6b",
  intimidated: "#8f8f9a",
  skeptical: "#6b7c9a",
  distrustful: "#6b6b7c",
  defensive: "#b0553f",
  frustrated: "#c24a4a",
  impatient: "#c24a4a",
  "passive-aggressive": "#9a6b7c",
  dismissive: "#8f8f8f",
  disappointed: "#7c7c8f",
  overwhelmed: "#c26b8f",
  hurt: "#9a6b8f",
  betrayed: "#7c5b6b",
  withdrawn: "#7a7a7a",
};

export function Presence({
  name,
  emotion,
  intensity,
  status,
  thinking,
}: {
  name: string;
  emotion: Emotion;
  intensity: Intensity;
  status: VoiceStatus;
  thinking: boolean;
}) {
  const hue = EMOTION_HUE[emotion] ?? "#8a8a8a";
  const speaking = status === "speaking";
  const strong = intensity === "strong" || intensity === "at their limit";

  return (
    <div className="relative flex flex-col items-center justify-center gap-4">
      <div className="relative grid place-items-center" style={{ width: 200, height: 200 }}>
        {/* pulse rings when speaking */}
        {speaking && (
          <>
            <span
              className="animate-pulse-ring absolute rounded-full"
              style={{ width: 140, height: 140, border: `2px solid ${hue}` }}
            />
            <span
              className="animate-pulse-ring absolute rounded-full"
              style={{ width: 140, height: 140, border: `2px solid ${hue}`, animationDelay: "0.5s" }}
            />
          </>
        )}
        {/* the orb */}
        <div
          className={`relative grid place-items-center rounded-full transition-all duration-700 ${
            speaking ? "" : "animate-breathe"
          }`}
          style={{
            width: 140,
            height: 140,
            background: `radial-gradient(circle at 35% 30%, ${hue}, color-mix(in oklab, ${hue} 55%, #000))`,
            boxShadow: `0 0 ${strong ? 60 : 34}px -6px ${hue}, inset 0 -12px 30px -10px rgba(0,0,0,0.5)`,
          }}
        >
          <span className="font-display text-4xl font-medium text-white/95 select-none">
            {name.trim().charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="font-display text-lg">{name}</div>
        <div className="h-4 text-xs text-soft">
          {thinking ? "…thinking" : speaking ? "speaking" : status === "listening" ? "listening" : " "}
        </div>
      </div>
    </div>
  );
}
