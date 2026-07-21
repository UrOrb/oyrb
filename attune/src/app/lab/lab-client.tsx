"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { PENDING_SCENE_KEY } from "@/lib/session";
import type { ResponseLabResult, ReplyOption, SceneConfig } from "@/lib/session";

const TONES = ["match my instinct", "warm", "direct", "firm boundary", "professional", "light / defuse", "brief"];

export function LabClient() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [context, setContext] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResponseLabResult | null>(null);

  async function run() {
    if (!message.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/response-lab", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, from, context, tone: tone === TONES[0] ? "" : tone }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Something went wrong.");
      }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function rehearse(opt: ReplyOption) {
    const sender = (from || "Them").trim().slice(0, 24) || "Them";
    const scene: SceneConfig = {
      mode: "practice",
      characterId: "custom",
      customCharacter: {
        name: sender,
        relationship: from || "the person who sent this",
        communicationStyle: `They just sent this message: "${message.trim()}". Speak as this person, continuing from that message with the same energy and intent.`,
        cares: context.trim() || "being understood and getting a real response",
        makesDefensive: "feeling dismissed, managed, or ignored",
        directness: "direct",
        expressiveness: "moderately expressive",
        wants: "a genuine response to what they said",
      },
      difficulty: "realistic",
      scenarioSetup: `You received this message from ${from || "someone"}: "${message.trim()}". Now you're talking it through with them live.${
        context.trim() ? ` Context: ${context.trim()}.` : ""
      } You're leaning toward replying along these lines: "${opt.text}"`,
      characterGoal: "react as the person who sent that message, and respond honestly to how the user replies.",
      userGoal: "deliver your reply so it lands the way you intend and moves things where you want them.",
    };
    try {
      sessionStorage.setItem(PENDING_SCENE_KEY, JSON.stringify(scene));
      router.push("/room");
    } catch {
      setError("Couldn't open the room — try again.");
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Attune home">
          <Logo size={27} />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/library" className="text-soft hover:text-[var(--fg)]">
            Library
          </Link>
          <Link href="/room" className="attune-btn-primary">
            Enter the room
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-24">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-3xl leading-tight">Response Lab</h1>
          <p className="mt-2 text-soft">
            Paste a message you received. Before you fire back, see what it&apos;s really saying and a few different ways you
            could reply — with how each would land. Then rehearse the one you like, live.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* Input */}
          <div className="surface h-fit rounded-[var(--radius-card)] p-6">
            <label className="block">
              <span className="text-sm font-medium">The message you received</span>
              <textarea
                className="attune-input mt-1.5 min-h-32"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Paste it here, word for word."
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium">Who&apos;s it from?</span>
              <input
                className="attune-input mt-1.5"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="my manager / my sister / a client"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium">
                What&apos;s going on / what do you want? <span className="text-soft">(optional)</span>
              </span>
              <textarea
                className="attune-input mt-1.5 min-h-20"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Background, and what a good outcome looks like for you."
              />
            </label>
            <div className="mt-4">
              <span className="text-sm font-medium">Lean toward…</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button key={t} onClick={() => setTone(t)} className={`attune-chip ${t === tone ? "attune-chip-on" : ""}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button className="attune-btn-primary mt-6 w-full" onClick={run} disabled={!message.trim() || loading}>
              {loading ? "Working through it…" : "Explore my options"}
            </button>
            {error && (
              <p className="mt-3 text-sm" style={{ color: "var(--color-alarm)" }}>
                {error}
              </p>
            )}
          </div>

          {/* Output */}
          <div className="space-y-4">
            {!result && !loading && (
              <div className="rounded-[var(--radius-card)] border border-dashed p-8 text-center text-sm text-soft">
                Your options will appear here — a read on the message, then three distinct ways to reply.
              </div>
            )}
            {loading && (
              <div className="surface flex items-center gap-3 rounded-[var(--radius-card)] p-6 text-soft">
                <span className="inline-block size-3 animate-breathe rounded-full" style={{ background: "var(--color-clay)" }} />
                Reading between the lines…
              </div>
            )}
            {result && (
              <>
                <div className="surface rounded-[var(--radius-card)] p-5">
                  <div className="text-xs font-medium tracking-wide uppercase text-soft">What they&apos;re really saying</div>
                  <p className="mt-1.5 text-sm leading-relaxed">{result.read}</p>
                  {result.senderFeeling && (
                    <p className="mt-2 text-sm">
                      <span className="text-soft">They likely feel: </span>
                      <span className="font-display italic" style={{ color: "var(--color-clay)" }}>
                        {result.senderFeeling}
                      </span>
                    </p>
                  )}
                </div>
                {result.options.map((opt, i) => (
                  <OptionCard key={i} opt={opt} onRehearse={() => rehearse(opt)} />
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function OptionCard({ opt, onRehearse }: { opt: ReplyOption; onRehearse: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(opt.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div
      className="surface animate-rise rounded-[var(--radius-card)] p-5"
      style={opt.recommended ? { boxShadow: "0 0 0 1.5px var(--color-clay), var(--shadow)" } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base">{opt.approach}</h3>
        {opt.recommended && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white" style={{ background: "var(--color-clay)" }}>
            recommended
          </span>
        )}
      </div>
      <p className="mt-2 rounded-xl p-3 text-sm leading-relaxed surface-2">“{opt.text}”</p>
      <div className="mt-3 space-y-1.5 text-sm">
        <p>
          <span className="text-soft">How it lands: </span>
          {opt.howItLands}
        </p>
        <p>
          <span className="text-soft">Watch out: </span>
          {opt.risk}
        </p>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="attune-btn-ghost" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button className="attune-btn-primary" onClick={onRehearse}>
          Rehearse this live →
        </button>
      </div>
    </div>
  );
}
