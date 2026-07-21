"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionResult } from "@/components/live-room";
import type { Debrief } from "@/lib/session";

export function DebriefPanel({ result, onRestart, onNew }: { result: SessionResult; onRestart: () => void; onNew: () => void }) {
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    (async () => {
      try {
        const res = await fetch("/api/debrief", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scene: result.scene,
            history: result.history,
            finalState: result.finalState,
            stateHistory: result.stateHistory,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Couldn't produce a breakdown.");
        }
        setDebrief(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't produce a breakdown.");
      }
    })();
  }, [result]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Your breakdown</h1>
        <div className="flex gap-2">
          <button className="attune-btn-ghost" onClick={onRestart}>
            Run it again
          </button>
          <button className="attune-btn-primary" onClick={onNew}>
            New scene
          </button>
        </div>
      </div>

      {!debrief && !error && (
        <div className="surface flex items-center gap-3 rounded-[var(--radius-card)] p-6 text-soft">
          <span className="inline-block size-3 animate-breathe rounded-full" style={{ background: "var(--color-clay)" }} />
          Reviewing what just happened…
        </div>
      )}

      {error && (
        <div className="surface rounded-[var(--radius-card)] p-6">
          <p className="text-sm" style={{ color: "var(--color-alarm)" }}>{error}</p>
          <button className="attune-btn-ghost mt-3" onClick={onRestart}>Try the conversation again</button>
        </div>
      )}

      {debrief && (
        <div className="space-y-5">
          <div className="surface rounded-[var(--radius-card)] p-6">
            <p className="font-display text-xl leading-snug">{debrief.headline}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Score label="Clarity" value={debrief.scores.clarity} />
              <Score label="Directness" value={debrief.scores.directness} />
              <Score label="Empathy" value={debrief.scores.empathy} />
              <Score label="Composure" value={debrief.scores.composure} />
            </div>
          </div>

          <Panel title="What happened emotionally">
            <p className="text-sm leading-relaxed">{debrief.emotionalArc}</p>
          </Panel>

          <div className="grid gap-5 sm:grid-cols-2">
            <Panel title="What you did well" accent="var(--color-calm)">
              <ul className="space-y-2">
                {debrief.didWell.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span aria-hidden style={{ color: "var(--color-calm)" }}>✓</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Watch out for" accent="var(--color-warn)">
              <ul className="space-y-2">
                {debrief.watchOuts.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span aria-hidden style={{ color: "var(--color-warn)" }}>!</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          {debrief.turningPoint && (
            <Panel title="The turning point">
              <blockquote className="border-l-2 pl-3 text-sm italic" style={{ borderColor: "var(--color-clay)" }}>
                “{debrief.turningPoint.quote}”
              </blockquote>
              <p className="mt-2 text-sm text-soft">{debrief.turningPoint.why}</p>
            </Panel>
          )}

          {debrief.strongerVersion && (
            <Panel title="A stronger version — in your voice">
              <div className="text-xs text-soft">{debrief.strongerVersion.context}</div>
              <p className="mt-2 rounded-xl p-3 text-sm surface-2">{debrief.strongerVersion.rewrite}</p>
            </Panel>
          )}

          {debrief.execRead && (
            <Panel title="How a leader would read you">
              <p className="text-sm leading-relaxed">{debrief.execRead}</p>
            </Panel>
          )}

          <Panel title="Try this next time" accent="var(--color-clay)">
            <p className="text-sm leading-relaxed">{debrief.exercise}</p>
          </Panel>

          <div className="flex justify-center gap-3 pt-2">
            <button className="attune-btn-ghost" onClick={onRestart}>Run it again</button>
            <button className="attune-btn-primary" onClick={onNew}>Practice something new</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <section className="surface rounded-[var(--radius-card)] p-6">
      <h2 className="mb-3 flex items-center gap-2 font-display text-base">
        {accent && <span className="inline-block size-2 rounded-full" style={{ background: accent }} />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const color = value >= 66 ? "var(--color-calm)" : value >= 40 ? "var(--color-warn)" : "var(--color-alarm)";
  return (
    <div className="rounded-xl p-3 surface-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-soft">{label}</span>
        <span className="font-display text-lg tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}
