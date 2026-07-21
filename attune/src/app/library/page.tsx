import Link from "next/link";
import { Logo } from "@/components/logo";
import { CATEGORIES, scenariosForCategory, characterById } from "@/lib/characters";

export const metadata = { title: "Scenario Library" };

export default function LibraryPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Attune home">
          <Logo size={27} />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/lab" className="text-soft hover:text-[var(--fg)]">
            Response Lab
          </Link>
          <Link href="/room" className="attune-btn-primary">
            Enter the room
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-display text-3xl leading-tight">Scenario Library</h1>
          <p className="mt-2 text-soft">
            Pick a situation and step straight into it. Every one can be played warm, tense, or hostile — you set who
            you&apos;re talking to and how hard they are on the next screen. Tap any card to begin.
          </p>
        </div>

        <div className="space-y-12">
          {CATEGORIES.map((cat) => {
            const scenarios = scenariosForCategory(cat.id);
            if (scenarios.length === 0) return null;
            return (
              <section key={cat.id} id={cat.id}>
                <div className="mb-4 flex items-baseline gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <h2 className="font-display text-xl">{cat.name}</h2>
                  <span className="text-sm text-soft">— {cat.blurb}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scenarios.map((s) => {
                    const who = characterById(s.suggested[0]);
                    return (
                      <Link
                        key={s.id}
                        href={`/room?scenario=${s.id}`}
                        className="surface group flex flex-col rounded-[var(--radius-card)] p-5 transition-transform hover:-translate-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium">{s.title}</h3>
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] surface-2 text-soft">{s.tone}</span>
                        </div>
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-soft">{s.setup}</p>
                        <div className="mt-4 flex items-center justify-between">
                          {who ? (
                            <span className="flex items-center gap-1.5 text-xs text-soft">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={who.avatar} alt={who.name} className="size-5 rounded-full object-cover" />
                              with {who.name}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="text-sm font-medium" style={{ color: "var(--color-clay)" }}>
                            Start →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-16 rounded-[var(--radius-card)] border p-8 text-center">
          <h2 className="font-display text-xl">Don&apos;t see yours?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-soft">
            Describe any situation from scratch, or build a character based on someone you actually need to talk to.
          </p>
          <Link href="/room" className="attune-btn-ghost mt-4 inline-block">
            Build your own scene
          </Link>
        </div>
      </main>
    </div>
  );
}
