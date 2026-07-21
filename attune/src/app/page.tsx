import Link from "next/link";
import { Logo } from "@/components/logo";
import { MODES, DIFFICULTIES, CHARACTERS } from "@/lib/characters";

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo size={32} />
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/library" className="text-soft hover:text-[var(--fg)]">
            Library
          </Link>
          <Link href="/lab" className="text-soft hover:text-[var(--fg)]">
            Response Lab
          </Link>
          <Link href="/room" className="attune-btn-primary">
            Enter the room
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16 sm:pt-20">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-soft">
            <span className="inline-block size-2 animate-breathe rounded-full" style={{ background: "var(--color-clay)" }} />
            A real-time AI communication coach
          </div>
          <h1 className="font-display text-4xl leading-[1.05] sm:text-6xl">
            Don&apos;t just practice what to say.
            <br />
            <span className="italic" style={{ color: "var(--color-clay)" }}>
              Practice what happens after you say it.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-soft">
            Speak out loud to a character who listens, reacts, and remembers. They get reassured — or defensive. They
            interrupt, soften, hold a boundary, change their mind. You feel the reaction, the pressure, and the follow-up
            questions that real conversations actually have.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/room" className="attune-btn-primary text-base">
              Start a conversation →
            </Link>
            <Link href="/room?mode=corporate" className="attune-btn-ghost">
              Practice an interview
            </Link>
          </div>
          <p className="mt-4 text-xs text-soft">
            Uses your browser&apos;s built-in voice — nothing to install. Works best in Chrome or Edge.
          </p>
        </div>
      </section>

      {/* Modes */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl">Five ways to practice</h2>
          <Link href="/library" className="text-sm font-medium" style={{ color: "var(--color-clay)" }}>
            Browse the scenario library →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m) => (
            <Link
              key={m.id}
              href={m.id === "response-lab" ? "/lab" : `/room?mode=${m.id}`}
              className="surface group rounded-[var(--radius-card)] p-6 transition-transform hover:-translate-y-1"
            >
              <div className="text-2xl">{m.icon}</div>
              <div className="mt-3 font-display text-lg">{m.name}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-soft">{m.blurb}</p>
              <div className="mt-4 text-sm font-medium" style={{ color: "var(--color-clay)" }}>
                Open →
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Characters */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="font-display text-2xl">People who feel real</h2>
        <p className="mt-2 max-w-2xl text-soft">
          Each one communicates differently — with their own habits, what opens them up, and what makes them shut down. Or
          build a custom character based on someone you actually need to talk to.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHARACTERS.map((c) => (
            <div key={c.id} className="surface rounded-[var(--radius-card)] p-5">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="size-12 shrink-0 rounded-full object-cover"
                  style={{ boxShadow: `0 0 0 2px ${c.accent}` }}
                />
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-soft">{c.role}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-soft">{c.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="font-display text-2xl">Difficulty that fights back</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {DIFFICULTIES.map((d) => (
            <div key={d.id} className="rounded-2xl border p-5">
              <div className="font-medium">{d.name}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-soft">{d.blurb}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm text-soft">
          Behind every reply, an invisible emotional state moves — trust, respect, patience, defensiveness, openness. Dodge a
          direct question and trust falls. Take real accountability and they open up. Afterward, you get an honest breakdown
          of what happened, where it turned, and a stronger version in your own voice.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div
          className="rounded-[var(--radius-card)] p-10 text-center"
          style={{ background: "var(--color-ink)", color: "var(--bg)" }}
        >
          <h2 className="font-display text-3xl">Ready for the moment that matters?</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-80">
            The hard conversation, the interview, the pitch, the boundary you keep avoiding. Rehearse the reaction until
            it&apos;s not scary anymore.
          </p>
          <Link href="/room" className="attune-btn-primary mt-6 inline-block text-base">
            Enter the room →
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-xs text-soft">
        <p>
          Attune — a communication practice studio. Characters are simulated, not real people. Built with the Web Speech API
          and Claude.
        </p>
      </footer>
    </div>
  );
}
