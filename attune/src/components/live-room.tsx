"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVoice } from "@/hooks/use-voice";
import { Presence } from "@/components/presence";
import { Meters, MoodBadge, GoalBar } from "@/components/meters";
import { Waveform } from "@/components/waveform";
import { prosodyFor, NEUTRAL_STATE } from "@/lib/emotion";
import type { EmotionalState, Prosody } from "@/lib/emotion";
import { characterById } from "@/lib/characters";
import type { SceneConfig, ChatTurn, CharacterTurn, DeliverySignal, Suggestion } from "@/lib/session";

type DisplayTurn = {
  role: "user" | "character";
  text: string;
  emotion?: CharacterTurn["emotion"];
  coach?: string | null;
};

export type SessionResult = {
  scene: SceneConfig;
  history: ChatTurn[];
  stateHistory: { turn: number; state: EmotionalState }[];
  finalState: EmotionalState;
};

function initialState(scene: SceneConfig): EmotionalState {
  if (scene.customCharacter) return { ...NEUTRAL_STATE };
  return characterById(scene.characterId)?.baseline ?? { ...NEUTRAL_STATE };
}

export function LiveRoom({ scene, onEnd }: { scene: SceneConfig; onEnd: (r: SessionResult) => void }) {
  const character = scene.customCharacter ? undefined : characterById(scene.characterId);
  const charName = scene.customCharacter?.name || character?.name || "They";
  const charAvatar = character?.avatar; // custom characters have no photo

  const [state, setState] = useState<EmotionalState>(() => initialState(scene));
  const [turns, setTurns] = useState<DisplayTurn[]>([]);
  const [last, setLast] = useState<CharacterTurn | null>(null);
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coachOn, setCoachOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showMeters, setShowMeters] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const historyRef = useRef<ChatTurn[]>([]);
  const stateRef = useRef<EmotionalState>(state);
  const stateHistRef = useRef<{ turn: number; state: EmotionalState }[]>([]);
  const busyRef = useRef(false);
  const interruptedRef = useRef(false);
  const startedRef = useRef(false);
  const mutedRef = useRef(muted);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Filled in once `voice` exists — keeps runTurn from referencing `voice`
  // directly, which would create a declaration-order cycle with useVoice.
  const speakRef = useRef<(text: string, prosody: Prosody) => Promise<void>>(async () => {});
  const runTurnRef = useRef<(text: string, delivery: DeliverySignal | null) => void>(() => {});

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  function markBusy(v: boolean) {
    busyRef.current = v;
    setBusy(v);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  // ── The turn engine ───────────────────────────────────────────────────
  const runTurn = useCallback(
    async (userText: string, delivery: DeliverySignal | null) => {
      markBusy(true);
      setThinking(true);
      setError(null);
      try {
        const res = await fetch("/api/converse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scene,
            history: historyRef.current.slice(-24),
            state: stateRef.current,
            userText,
            delivery,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Something went wrong.");
        }
        const turn: CharacterTurn = await res.json();

        // record for API history
        if (userText) historyRef.current.push({ role: "user", content: userText });
        historyRef.current.push({ role: "assistant", content: turn.reply });

        setState(turn.state);
        stateRef.current = turn.state;
        stateHistRef.current.push({ turn: stateHistRef.current.length + 1, state: turn.state });
        setLast(turn);
        setTurns((t) => [...t, { role: "character", text: turn.reply, emotion: turn.emotion, coach: turn.coach }]);
        setThinking(false);

        if (!mutedRef.current) {
          await speakRef.current(turn.reply, prosodyFor(turn.emotion, turn.intensity));
        }
      } catch (e) {
        setThinking(false);
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        markBusy(false);
      }
    },
    [scene]
  );

  useEffect(() => {
    runTurnRef.current = runTurn;
  }, [runTurn]);

  // Stable callback for the voice hook — reads the latest runTurn via a ref so
  // the hook's listener identity never changes.
  const handleUtterance = useCallback((text: string, delivery: DeliverySignal) => {
    if (busyRef.current) return; // ignore while thinking/speaking
    const wasInterrupt = interruptedRef.current;
    interruptedRef.current = false;
    setTurns((t) => [...t, { role: "user", text }]);
    runTurnRef.current(text, { ...delivery, interrupted: wasInterrupt });
  }, []);

  const voice = useVoice(handleUtterance);

  useEffect(() => {
    speakRef.current = voice.speak;
  }, [voice.speak]);

  // Open the scene once.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runTurnRef.current("", null);
  }, []);

  function sendText(text: string) {
    const clean = text.trim();
    if (!clean || busyRef.current) return;
    setSuggestions(null);
    const wasInterrupt = interruptedRef.current;
    interruptedRef.current = false;
    setTurns((t) => [...t, { role: "user", text: clean }]);
    runTurn(clean, { words: clean.split(/\s+/).length, interrupted: wasInterrupt });
  }

  function sendTyped() {
    if (!typed.trim() || busyRef.current) return;
    const text = typed;
    setTyped("");
    sendText(text);
  }

  async function getSuggestions() {
    if (suggestLoading || busyRef.current) return;
    setSuggestLoading(true);
    setSuggestions(null);
    setError(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scene, history: historyRef.current.slice(-16), state: stateRef.current }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Couldn't fetch a hint.");
      }
      const data = await res.json();
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't fetch a hint.");
    } finally {
      setSuggestLoading(false);
    }
  }

  function cutIn() {
    // Stop the character mid-sentence and start listening immediately.
    voice.shutUp();
    interruptedRef.current = true;
    markBusy(false);
    setThinking(false);
    if (voice.sttSupported) voice.startListening();
  }

  function endSession() {
    voice.shutUp();
    voice.stopListening();
    onEnd({
      scene,
      history: historyRef.current,
      stateHistory: stateHistRef.current,
      finalState: stateRef.current,
    });
  }

  const listening = voice.status === "listening";
  const speaking = voice.status === "speaking";
  const enoughToDebrief = turns.some((t) => t.role === "user");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Left: presence + transcript */}
      <div className="flex min-h-[70vh] flex-col">
        <div className="surface rounded-[var(--radius-card)] p-6">
          <div className="flex flex-col items-center gap-5">
            <Presence
              name={charName}
              emotion={last?.emotion ?? "calm"}
              intensity={last?.intensity ?? "moderate"}
              status={voice.status}
              thinking={thinking}
              avatar={charAvatar}
            />
            {last && <MoodBadge emotion={last.emotion} intensity={last.intensity} shift={last.shift} />}
          </div>
        </div>

        {/* transcript */}
        <div
          ref={scrollRef}
          className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-[var(--radius-card)] p-1"
          style={{ maxHeight: "36vh" }}
        >
          {turns.map((t, i) => (
            <div key={i} className={`animate-rise flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={t.role === "user" ? "attune-bubble-user" : "attune-bubble-char"}>
                {t.text}
                {coachOn && t.coach ? (
                  <div className="mt-2 flex items-start gap-1.5 border-t pt-2 text-xs" style={{ color: "var(--color-clay)" }}>
                    <span aria-hidden>↳</span>
                    <span className="italic">{t.coach}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="attune-bubble-char text-soft">…</div>
            </div>
          )}
          {voice.interim && listening && (
            <div className="flex justify-end">
              <div className="attune-bubble-user opacity-60">{voice.interim}</div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--color-alarm)", color: "var(--color-alarm)" }}>
            {error}
          </div>
        )}

        {/* how-could-I-respond suggestions */}
        {(suggestLoading || suggestions) && (
          <div className="mt-3 rounded-[var(--radius-card)] border p-4 animate-rise" style={{ background: "var(--surface)" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide uppercase text-soft">Ways you could respond</span>
              <button className="text-xs text-soft hover:underline" onClick={() => setSuggestions(null)}>
                dismiss
              </button>
            </div>
            {suggestLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-soft">
                <span className="inline-block size-2.5 animate-breathe rounded-full" style={{ background: "var(--color-clay)" }} />
                Thinking of a few options…
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions && suggestions.length > 0 ? (
                  suggestions.map((s, i) => (
                    <div key={i} className="rounded-xl p-3 surface-2">
                      <div className="text-[11px] font-medium tracking-wide uppercase text-soft">{s.approach}</div>
                      <p className="mt-1 text-sm">“{s.text}”</p>
                      <p className="mt-1 text-xs text-soft">{s.why}</p>
                      <div className="mt-2 flex gap-2">
                        <button className="attune-btn-primary" style={{ padding: "0.3rem 0.9rem", fontSize: "0.8rem" }} onClick={() => sendText(s.text)} disabled={busy}>
                          Say this
                        </button>
                        <button className="attune-btn-ghost" style={{ padding: "0.3rem 0.9rem", fontSize: "0.8rem" }} onClick={() => setTyped(s.text)}>
                          Edit first
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-1 text-sm text-soft">No suggestions right now — try again in a moment.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* controls */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {voice.sttSupported ? (
            <button
              onClick={() => (listening ? voice.stopListening() : voice.startListening())}
              className={`attune-mic ${listening ? "attune-mic-on" : ""}`}
              disabled={speaking}
            >
              <Waveform active={listening} />
              <span>{listening ? "Listening — tap to pause" : "Tap to speak"}</span>
            </button>
          ) : (
            <span className="text-xs text-soft">Voice isn&apos;t supported in this browser — type below.</span>
          )}

          {speaking && (
            <button onClick={cutIn} className="attune-btn-ghost">
              Cut in ✋
            </button>
          )}

          <button onClick={getSuggestions} className="attune-btn-ghost" disabled={busy || suggestLoading}>
            💡 How could I respond?
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Toggle on={coachOn} onClick={() => setCoachOn((v) => !v)} label="Coaching" />
            <Toggle on={!muted} onClick={() => setMuted((v) => !v)} label={muted ? "Voice off" : "Voice on"} />
          </div>
        </div>

        {/* text fallback / alternative */}
        <div className="mt-3 flex items-center gap-2">
          <input
            className="attune-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendTyped()}
            placeholder="…or type what you'd say"
          />
          <button className="attune-btn-ghost shrink-0" onClick={sendTyped} disabled={!typed.trim() || busy}>
            Send
          </button>
        </div>
      </div>

      {/* Right: emotional state */}
      <aside className="space-y-4">
        <div className="surface rounded-[var(--radius-card)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base">Their inner state</h3>
            <button className="text-xs text-soft underline-offset-2 hover:underline" onClick={() => setShowMeters((v) => !v)}>
              {showMeters ? "hide" : "show"}
            </button>
          </div>
          {showMeters ? (
            <>
              <Meters state={state} />
              <div className="mt-4 border-t pt-4">
                <GoalBar progress={last?.goalProgress ?? 0} />
              </div>
            </>
          ) : (
            <p className="text-xs text-soft">Hidden — practice reading them without the meters.</p>
          )}
        </div>

        <div className="surface rounded-[var(--radius-card)] p-5">
          <div className="text-xs text-soft">The situation</div>
          <p className="mt-1 text-sm">{scene.scenarioSetup}</p>
          <div className="mt-3 text-xs text-soft">Your goal</div>
          <p className="mt-1 text-sm">{scene.userGoal}</p>
        </div>

        <button className="attune-btn-primary w-full" onClick={endSession} disabled={!enoughToDebrief}>
          End &amp; get my breakdown
        </button>
      </aside>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
      style={{
        borderColor: on ? "var(--color-clay)" : "var(--line)",
        color: on ? "var(--color-clay)" : "var(--fg-soft)",
      }}
    >
      <span
        className="inline-block size-2 rounded-full"
        style={{ background: on ? "var(--color-clay)" : "var(--fg-soft)" }}
      />
      {label}
    </button>
  );
}
