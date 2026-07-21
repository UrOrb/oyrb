# Attune

**A real-time AI communication coach that speaks, listens, reacts, and emotionally adapts like a real conversation partner.**

Attune isn't a script generator. You speak out loud to a character who listens, reacts, and *remembers* — one that can get reassured or defensive, interrupt, soften, hold a boundary, misunderstand you, or change its mind. The promise:

> Don't just practice what to say. Practice what happens **after** you say it.

## What it does

- **Speak naturally** — the app listens through your browser's microphone (Web Speech API) and the character replies with a real voice whose pace and pitch shift with its emotion. No keys, no installs.
- **A living emotional engine** — behind every reply, eight invisible 0–100 meters move: **trust, respect, comfort, patience, openness, defensiveness, confusion, intensity**. Dodge a direct question and trust falls; take real accountability and openness rises. The meters drive how the character talks back.
- **Real personalities** — Maya (emotionally aware), Jordan (direct executive), Elena (difficult communicator), Marcus (interviewer), Ava (speech director), Riley (frustrated client) — or build a custom character based on someone you actually need to talk to.
- **Difficulty that fights back** — Supportive · Realistic · Difficult · High-pressure · Unpredictable.
- **Five modes** — Practice a Conversation, Corporate Coach, Stage Coach, Talk Now, Response Lab.
- **In-the-moment coaching** — an optional discreet nudge ("Answer the question directly", "You're getting defensive").
- **An honest breakdown** — after each session: the emotional arc, what you did well, what to watch, the turning point, a stronger version *in your own voice*, and a short exercise.

## Run it

```bash
cd attune
pnpm install          # or npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
pnpm dev
```

Open http://localhost:3000 and click **Enter the room**. Voice works best in Chrome or Edge (Web Speech API). If your browser doesn't support speech recognition, you can type instead — everything else still works.

## Environment

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Your Anthropic API key. |
| `ATTUNE_CONVERSE_MODEL` | no | Model for the live conversation (default `claude-sonnet-5`). |
| `ATTUNE_DEBRIEF_MODEL` | no | Model for the end-of-session breakdown (default `claude-sonnet-5`). |

## How it's built

- **Next.js (App Router) + React 19 + TypeScript + Tailwind v4.**
- **Voice is entirely client-side** — `src/lib/speech.ts` + `src/hooks/use-voice.ts` wrap `SpeechRecognition` (listening, auto-send on a pause, delivery signals like pace/fillers) and `speechSynthesis` (emotion-mapped prosody).
- **The character** — `POST /api/converse` calls Claude with a tool that forces a structured turn: the spoken reply, current emotion + intensity, the full updated 8-meter state, why it moved, behaviours (interrupted, held boundary, went quiet…), an optional coaching nudge, and goal progress.
- **The debrief** — `POST /api/debrief` reviews the transcript *and the recorded meter movements* to produce a grounded, specific coaching report.
- **The emotional engine** lives in `src/lib/emotion.ts`; characters, scenarios and difficulties in `src/lib/characters.ts`.

### Layout

```
src/
  app/
    page.tsx              landing
    room/                 the practice room (setup → live → debrief)
    api/converse/         one conversational turn (Claude tool-use)
    api/debrief/          end-of-session analysis
  components/             presence orb, meters, setup, live room, debrief
  hooks/use-voice.ts      Web Speech listen/speak loop
  lib/                    emotion engine, characters, prompt builder, session types
```

## Notes & limits

- Characters are **simulated**, clearly labeled as such — never a stand-in for a real person.
- Web Speech recognition quality and available voices vary by browser/OS. The mic is paused while the character speaks to avoid it transcribing itself; use **Cut in** to interrupt.
- This is a first, focused build: one polished voice loop done well, with the emotional engine, personalities, difficulties, live coaching, and the post-conversation breakdown all working end-to-end.
