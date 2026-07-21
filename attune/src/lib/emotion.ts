// ─────────────────────────────────────────────────────────────────────────
// The emotional engine.
//
// The AI character carries an invisible internal state — a set of 0–100 meters
// that the model updates every turn based on how the user communicates. These
// meters are what make the practice feel real: interrupt repeatedly and
// patience drains; dodge a direct question and trust falls; take real
// accountability and openness rises. The model reads the current state, the
// conversation so far, and the user's latest turn, then reports the new state
// and speaks in a way consistent with it.
// ─────────────────────────────────────────────────────────────────────────

/** The invisible relational meters, 0–100. */
export type EmotionalState = {
  /** How much the character believes the user is being honest and straight. */
  trust: number;
  /** How much the character respects the user's competence / standing. */
  respect: number;
  /** How at-ease the character feels in the conversation. */
  comfort: number;
  /** How much slack the character has left before irritation. */
  patience: number;
  /** How willing the character is to move, concede, or be persuaded. */
  openness: number;
  /** How guarded / braced-for-attack the character is. */
  defensiveness: number;
  /** How unclear the character is about what the user means. */
  confusion: number;
  /** Overall emotional temperature — calm at 0, at-their-limit at 100. */
  intensity: number;
};

export const NEUTRAL_STATE: EmotionalState = {
  trust: 55,
  respect: 55,
  comfort: 55,
  patience: 65,
  openness: 55,
  defensiveness: 25,
  confusion: 15,
  intensity: 25,
};

export const EMOTION_METERS: {
  key: keyof EmotionalState;
  label: string;
  /** true when a HIGH value is bad (should read red at the top). */
  invertHealth: boolean;
  hint: string;
}[] = [
  { key: "trust", label: "Trust", invertHealth: false, hint: "Do they believe you?" },
  { key: "respect", label: "Respect", invertHealth: false, hint: "Do they take you seriously?" },
  { key: "comfort", label: "Comfort", invertHealth: false, hint: "Are they at ease?" },
  { key: "patience", label: "Patience", invertHealth: false, hint: "How much slack is left?" },
  { key: "openness", label: "Openness", invertHealth: false, hint: "Will they move?" },
  { key: "defensiveness", label: "Defensiveness", invertHealth: true, hint: "Are they braced against you?" },
  { key: "confusion", label: "Confusion", invertHealth: true, hint: "Do they follow you?" },
  { key: "intensity", label: "Intensity", invertHealth: true, hint: "Emotional temperature." },
];

/** The full emotional spectrum the character can occupy — richer than happy/sad/angry. */
export const EMOTION_SPECTRUM = [
  "calm",
  "confused",
  "nervous",
  "embarrassed",
  "defensive",
  "frustrated",
  "disappointed",
  "dismissive",
  "intimidated",
  "skeptical",
  "overwhelmed",
  "hurt",
  "betrayed",
  "impatient",
  "passive-aggressive",
  "excited",
  "encouraging",
  "compassionate",
  "uncomfortable",
  "distrustful",
  "persuaded",
  "reassured",
  "withdrawn",
  "warm",
  "engaged",
] as const;

export type Emotion = (typeof EMOTION_SPECTRUM)[number];

export type Intensity = "mild" | "moderate" | "strong" | "at their limit";

/** A single behavioural beat the character can express in a turn. */
export const BEHAVIORS = [
  "interrupted",
  "asked_for_clarification",
  "challenged_inconsistency",
  "misunderstood",
  "withdrew",
  "softened",
  "held_boundary",
  "changed_mind",
  "acknowledged_you",
  "went_quiet",
] as const;

export type Behavior = (typeof BEHAVIORS)[number];

/** How each emotion maps onto browser speech-synthesis prosody. */
export type Prosody = { rate: number; pitch: number; volume: number };

const PROSODY: Partial<Record<Emotion, Prosody>> = {
  calm: { rate: 0.97, pitch: 1.0, volume: 1 },
  warm: { rate: 0.98, pitch: 1.05, volume: 1 },
  engaged: { rate: 1.05, pitch: 1.05, volume: 1 },
  excited: { rate: 1.14, pitch: 1.16, volume: 1 },
  encouraging: { rate: 1.0, pitch: 1.06, volume: 1 },
  compassionate: { rate: 0.9, pitch: 1.02, volume: 0.95 },
  persuaded: { rate: 0.98, pitch: 1.02, volume: 1 },
  reassured: { rate: 0.95, pitch: 1.02, volume: 0.98 },
  confused: { rate: 0.9, pitch: 0.99, volume: 0.95 },
  nervous: { rate: 1.12, pitch: 1.1, volume: 0.9 },
  embarrassed: { rate: 0.95, pitch: 1.0, volume: 0.82 },
  uncomfortable: { rate: 0.92, pitch: 0.98, volume: 0.88 },
  intimidated: { rate: 0.9, pitch: 1.0, volume: 0.8 },
  skeptical: { rate: 0.95, pitch: 0.96, volume: 1 },
  distrustful: { rate: 0.93, pitch: 0.94, volume: 1 },
  defensive: { rate: 1.08, pitch: 1.04, volume: 1 },
  frustrated: { rate: 1.1, pitch: 1.02, volume: 1 },
  impatient: { rate: 1.16, pitch: 1.03, volume: 1 },
  "passive-aggressive": { rate: 0.9, pitch: 1.04, volume: 0.95 },
  dismissive: { rate: 1.05, pitch: 0.95, volume: 0.9 },
  disappointed: { rate: 0.88, pitch: 0.92, volume: 0.88 },
  overwhelmed: { rate: 1.14, pitch: 1.08, volume: 0.92 },
  hurt: { rate: 0.85, pitch: 0.95, volume: 0.82 },
  betrayed: { rate: 0.9, pitch: 0.9, volume: 0.9 },
  withdrawn: { rate: 0.82, pitch: 0.9, volume: 0.72 },
};

/** Resolve prosody for an emotion + intensity, for the Web Speech synthesizer. */
export function prosodyFor(emotion: Emotion, intensity: Intensity): Prosody {
  const base = PROSODY[emotion] ?? { rate: 1, pitch: 1, volume: 1 };
  // Push the delta-from-neutral further as intensity climbs.
  const k = intensity === "mild" ? 0.5 : intensity === "moderate" ? 1 : intensity === "strong" ? 1.35 : 1.7;
  return {
    rate: clamp(1 + (base.rate - 1) * k, 0.6, 1.4),
    pitch: clamp(1 + (base.pitch - 1) * k, 0.6, 1.6),
    volume: clamp(base.volume, 0.4, 1),
  };
}

/** A warm→cool colour for a meter value (used by the UI ring/bar). */
export function meterColor(value: number, invertHealth: boolean): string {
  const health = invertHealth ? 100 - value : value;
  if (health >= 66) return "var(--color-calm)";
  if (health >= 33) return "var(--color-warn)";
  return "var(--color-alarm)";
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** A concise human phrase for the current mood, e.g. "strongly frustrated". */
export function moodPhrase(emotion: Emotion, intensity: Intensity): string {
  if (intensity === "at their limit") return `${emotion} — at their limit`;
  const adverb =
    intensity === "mild" ? "a little " : intensity === "strong" ? "very " : "";
  return `${adverb}${emotion}`;
}

/** Sanitize a possibly-partial state object coming back from the model. */
export function normalizeState(input: Partial<EmotionalState> | undefined, fallback: EmotionalState): EmotionalState {
  const out = { ...fallback };
  for (const { key } of EMOTION_METERS) {
    const v = input?.[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = clamp(Math.round(v));
  }
  return out;
}
