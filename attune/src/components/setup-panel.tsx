"use client";

import { useMemo, useState } from "react";
import {
  MODES,
  DIFFICULTIES,
  CHARACTERS,
  scenariosForMode,
  characterById,
  type ModeId,
  type DifficultyId,
} from "@/lib/characters";
import type { SceneConfig, CustomCharacter } from "@/lib/session";

const AUDIENCES = [
  "supportive audience",
  "corporate audience",
  "room of college students",
  "industry professionals",
  "skeptical audience",
  "general TED-style audience",
  "small intimate room",
  "large conference stage",
];

const emptyCustom: CustomCharacter = {
  name: "",
  relationship: "",
  communicationStyle: "",
  cares: "",
  makesDefensive: "",
  directness: "direct",
  expressiveness: "moderately expressive",
  wants: "",
};

export function SetupPanel({ initialMode, onStart }: { initialMode: ModeId; onStart: (scene: SceneConfig) => void }) {
  const [mode, setMode] = useState<ModeId>(initialMode);
  const scenarios = useMemo(() => scenariosForMode(mode), [mode]);
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? "custom");

  // custom situation fields
  const [customSetup, setCustomSetup] = useState("");
  const [customCharGoal, setCustomCharGoal] = useState("");
  const [customUserGoal, setCustomUserGoal] = useState("");

  const [characterId, setCharacterId] = useState<string>("");
  const [useCustomChar, setUseCustomChar] = useState(false);
  const [custom, setCustom] = useState<CustomCharacter>(emptyCustom);
  const [difficulty, setDifficulty] = useState<DifficultyId>("realistic");
  const [audience, setAudience] = useState<string>(AUDIENCES[5]);

  const activeScenario = scenarios.find((s) => s.id === scenarioId) ?? null;
  const isCustomSituation = scenarioId === "custom";

  // Characters worth suggesting for this mode/scenario, best first.
  const suggestedIds = activeScenario?.suggested ?? CHARACTERS.filter((c) => c.contexts.includes(mode)).map((c) => c.id);
  const orderedChars = [
    ...suggestedIds.map((id) => characterById(id)).filter(Boolean),
    ...CHARACTERS.filter((c) => !suggestedIds.includes(c.id)),
  ] as typeof CHARACTERS;

  const effectiveCharId = characterId || suggestedIds[0] || CHARACTERS[0].id;

  function switchMode(m: ModeId) {
    setMode(m);
    const first = scenariosForMode(m)[0];
    setScenarioId(first?.id ?? "custom");
    setCharacterId("");
    setUseCustomChar(false);
  }

  const canStart =
    (!isCustomSituation || customSetup.trim().length > 8) &&
    (!useCustomChar || (custom.name.trim() && custom.relationship.trim()));

  function begin() {
    const scene: SceneConfig = {
      mode,
      characterId: useCustomChar ? "custom" : effectiveCharId,
      customCharacter: useCustomChar ? custom : null,
      difficulty,
      scenarioSetup: isCustomSituation ? customSetup.trim() : activeScenario?.setup ?? "",
      characterGoal: isCustomSituation
        ? customCharGoal.trim() || "have a real, human reaction to what the user says."
        : activeScenario?.characterGoal ?? "",
      userGoal: isCustomSituation
        ? customUserGoal.trim() || "communicate clearly and get through to them."
        : activeScenario?.userGoal ?? "",
      audience: mode === "stage" ? audience : undefined,
    };
    onStart(scene);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      {/* Mode */}
      <Section step={1} title="What do you want to practice?">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <Chip key={m.id} active={m.id === mode} onClick={() => switchMode(m.id)}>
              <span className="mr-1.5">{m.icon}</span>
              {m.short}
            </Chip>
          ))}
        </div>
        <p className="mt-3 text-sm text-soft">{MODES.find((m) => m.id === mode)?.blurb}</p>
      </Section>

      {/* Scenario */}
      <Section step={2} title="Pick a situation">
        <div className="grid gap-2 sm:grid-cols-2">
          {scenarios.map((s) => (
            <Card key={s.id} active={s.id === scenarioId} onClick={() => setScenarioId(s.id)}>
              <div className="font-medium">{s.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-soft">{s.setup}</div>
            </Card>
          ))}
          <Card active={isCustomSituation} onClick={() => setScenarioId("custom")}>
            <div className="font-medium">Something else…</div>
            <div className="mt-1 text-xs text-soft">Describe your own situation.</div>
          </Card>
        </div>
        {isCustomSituation && (
          <div className="mt-4 space-y-3 animate-rise">
            <Field label="The situation" hint="What's going on, from your side?">
              <textarea
                className="attune-input min-h-20"
                value={customSetup}
                onChange={(e) => setCustomSetup(e.target.value)}
                placeholder="e.g. I need to tell my manager I'm overloaded without sounding like I can't handle my job."
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="What you want" hint="A good outcome for you.">
                <input
                  className="attune-input"
                  value={customUserGoal}
                  onChange={(e) => setCustomUserGoal(e.target.value)}
                  placeholder="Be heard and get real relief."
                />
              </Field>
              <Field label="What they want" hint="Optional.">
                <input
                  className="attune-input"
                  value={customCharGoal}
                  onChange={(e) => setCustomCharGoal(e.target.value)}
                  placeholder="Keep the project on track."
                />
              </Field>
            </div>
          </div>
        )}
      </Section>

      {/* Audience for stage mode */}
      {mode === "stage" && (
        <Section step={2.5} title="Who's in the room?">
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <Chip key={a} active={a === audience} onClick={() => setAudience(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {/* Character */}
      <Section step={3} title="Who are you talking to?">
        <div className="grid gap-2 sm:grid-cols-2">
          {orderedChars.map((c, i) => (
            <Card
              key={c.id}
              active={!useCustomChar && effectiveCharId === c.id}
              onClick={() => {
                setUseCustomChar(false);
                setCharacterId(c.id);
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full font-display text-sm text-white"
                  style={{ background: c.accent }}
                >
                  {c.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{c.name}</span>
                    {i === 0 && !useCustomChar && (
                      <span className="rounded-full px-1.5 py-0.5 text-[10px] surface-2 text-soft">suggested</span>
                    )}
                  </div>
                  <div className="text-xs text-soft">{c.role}</div>
                </div>
              </div>
              <div className="mt-2 line-clamp-2 text-xs text-soft">{c.tagline}</div>
            </Card>
          ))}
          <Card active={useCustomChar} onClick={() => setUseCustomChar(true)}>
            <div className="font-medium">Build your own…</div>
            <div className="mt-1 text-xs text-soft">Model someone you actually need to talk to.</div>
          </Card>
        </div>

        {useCustomChar && (
          <div className="mt-4 space-y-3 animate-rise">
            <p className="text-xs text-soft">
              This is a <span className="font-medium">simulated</span> character built from your description — not the real
              person.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <input className="attune-input" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Sam" />
              </Field>
              <Field label="Their relationship to you">
                <input className="attune-input" value={custom.relationship} onChange={(e) => setCustom({ ...custom, relationship: e.target.value })} placeholder="my older brother" />
              </Field>
            </div>
            <Field label="How they communicate">
              <input className="attune-input" value={custom.communicationStyle} onChange={(e) => setCustom({ ...custom, communicationStyle: e.target.value })} placeholder="calm on the surface, but goes cold when criticized" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="What they care about">
                <input className="attune-input" value={custom.cares} onChange={(e) => setCustom({ ...custom, cares: e.target.value })} placeholder="being respected, fairness" />
              </Field>
              <Field label="What makes them defensive">
                <input className="attune-input" value={custom.makesDefensive} onChange={(e) => setCustom({ ...custom, makesDefensive: e.target.value })} placeholder="feeling blamed" />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="What they want here">
                <input className="attune-input" value={custom.wants} onChange={(e) => setCustom({ ...custom, wants: e.target.value })} placeholder="to not feel like the bad guy" />
              </Field>
              <Field label="How direct they are">
                <select className="attune-input" value={custom.directness} onChange={(e) => setCustom({ ...custom, directness: e.target.value })}>
                  <option>very direct</option>
                  <option>direct</option>
                  <option>somewhat indirect</option>
                  <option>very indirect / avoids conflict</option>
                </select>
              </Field>
            </div>
          </div>
        )}
      </Section>

      {/* Difficulty */}
      <Section step={4} title="How hard should they be?">
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <Chip key={d.id} active={d.id === difficulty} onClick={() => setDifficulty(d.id)}>
              {d.name}
            </Chip>
          ))}
        </div>
        <p className="mt-3 text-sm text-soft">{DIFFICULTIES.find((d) => d.id === difficulty)?.blurb}</p>
      </Section>

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-soft">
          You&apos;ll speak out loud. The character listens, reacts, and remembers.
        </p>
        <button className="attune-btn-primary shrink-0" disabled={!canStart} onClick={begin}>
          Begin →
        </button>
      </div>
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-6 place-items-center rounded-full text-xs font-medium surface-2 text-soft">
          {Number.isInteger(step) ? step : "•"}
        </span>
        <h2 className="font-display text-lg">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`attune-chip ${active ? "attune-chip-on" : ""}`}>
      {children}
    </button>
  );
}

function Card({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`attune-card text-left ${active ? "attune-card-on" : ""}`}>
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-soft">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
