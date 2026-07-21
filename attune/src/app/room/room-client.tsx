"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SetupPanel } from "@/components/setup-panel";
import { LiveRoom, type SessionResult } from "@/components/live-room";
import { DebriefPanel } from "@/components/debrief-panel";
import { MODES, type ModeId } from "@/lib/characters";
import type { SceneConfig } from "@/lib/session";

type Phase = "setup" | "live" | "debrief";

export function RoomClient() {
  const params = useSearchParams();
  const initialMode = useMemo<ModeId>(() => {
    const m = params.get("mode");
    return (MODES.find((x) => x.id === m)?.id as ModeId) ?? "practice";
  }, [params]);

  const [phase, setPhase] = useState<Phase>("setup");
  const [scene, setScene] = useState<SceneConfig | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" className="font-display text-lg tracking-tight">
          Attune
        </Link>
        {phase !== "setup" && (
          <button
            className="text-sm text-soft underline-offset-2 hover:underline"
            onClick={() => {
              setPhase("setup");
              setScene(null);
              setResult(null);
            }}
          >
            ← Leave the room
          </button>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        {phase === "setup" && (
          <>
            <div className="mb-8 max-w-2xl">
              <h1 className="font-display text-3xl leading-tight">Set the scene</h1>
              <p className="mt-2 text-soft">
                Choose who you&apos;re talking to and how hard they should be. Then live through the reaction — not just the
                script.
              </p>
            </div>
            <SetupPanel
              initialMode={initialMode}
              onStart={(s) => {
                setScene(s);
                setPhase("live");
              }}
            />
          </>
        )}

        {phase === "live" && scene && (
          <LiveRoom
            key={JSON.stringify(scene)}
            scene={scene}
            onEnd={(r) => {
              setResult(r);
              setPhase("debrief");
            }}
          />
        )}

        {phase === "debrief" && result && (
          <DebriefPanel
            result={result}
            onRestart={() => setPhase("live")}
            onNew={() => {
              setPhase("setup");
              setResult(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
