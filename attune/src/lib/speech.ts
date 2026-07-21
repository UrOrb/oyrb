// Browser Web Speech API wrappers — no external services, no keys.
// SpeechRecognition (STT) for listening, speechSynthesis (TTS) for the voice.
// These types aren't in the default TS DOM lib, so we declare the slice we use.

export type SpeechRecognitionAlt = { transcript: string; confidence: number };
export type SpeechRecognitionResult = { isFinal: boolean; 0: SpeechRecognitionAlt; length: number };
export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResult };
};

export interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type RecognitionCtor = new () => ISpeechRecognition;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function sttSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const FILLERS = ["um", "uh", "erm", "like", "you know", "i mean", "kinda", "sorta", "basically", "literally"];

export function countFillers(text: string): number {
  const t = ` ${text.toLowerCase()} `;
  let n = 0;
  for (const f of FILLERS) {
    const re = new RegExp(`\\b${f.replace(/ /g, "\\s+")}\\b`, "g");
    n += (t.match(re) || []).length;
  }
  return n;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── Voice selection ────────────────────────────────────────────────────────
// Pick a pleasant English voice, preferring higher-quality/natural ones.
export function pickVoice(preferFemale = false): SpeechSynthesisVoice | null {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  if (voices.length === 0) return null;
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const n = v.name.toLowerCase();
    if (/natural|neural|premium|enhanced/.test(n)) s += 5;
    if (/google/.test(n)) s += 3;
    if (/samantha|jenny|aria|zira|serena|karen|moira|tessa/.test(n)) s += 2;
    if (v.lang === "en-US" || v.lang === "en-GB") s += 1;
    if (v.localService) s += 1;
    if (preferFemale && /female|samantha|zira|aria|jenny|karen|serena|victoria|susan/.test(n)) s += 2;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a))[0] ?? voices[0];
}

// speechSynthesis loads voices async in some browsers.
export function warmVoices(cb?: () => void): void {
  if (!ttsSupported()) return;
  const s = window.speechSynthesis;
  if (s.getVoices().length > 0) {
    cb?.();
    return;
  }
  const handler = () => {
    cb?.();
    s.removeEventListener("voiceschanged", handler);
  };
  s.addEventListener("voiceschanged", handler);
}
