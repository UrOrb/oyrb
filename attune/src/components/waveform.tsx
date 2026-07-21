"use client";

// A tiny animated equalizer used on the mic control while listening.
export function Waveform({ active }: { active: boolean }) {
  const bars = [0, 1, 2, 3, 4];
  return (
    <span className="inline-flex items-end gap-[3px]" style={{ height: 16 }} aria-hidden>
      {bars.map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: active ? 16 : 5,
            background: "currentColor",
            transformOrigin: "bottom",
            animation: active ? `attune-bar ${0.7 + (i % 3) * 0.18}s ease-in-out ${i * 0.08}s infinite` : "none",
          }}
        />
      ))}
    </span>
  );
}
