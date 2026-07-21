# Attune — project brief & handoff

**Slogan:** _Attune — Practice the conversation, not just the words._

Attune is a **real-time AI communication coach**. You pick a scenario, a character, and a
difficulty, then **talk out loud** (browser voice) to an AI character that listens, reacts, and
**emotionally adapts** — it can get reassured or defensive, interrupt, soften, hold a boundary,
change its mind. Afterward you get an honest breakdown of how it went. The whole premise:
_experience the reaction, not just rehearse a script._

This file is the orientation doc for anyone (including Claude Code) continuing the project.

---

## Tech stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **@anthropic-ai/sdk** — the AI brain (Claude). Model calls use structured **tool-use** so the
  model returns validated JSON, not free text.
- **Web Speech API** (browser-native) for voice: `SpeechRecognition` (listen) + `speechSynthesis`
  (speak). No external voice service, no keys.
- **Pillow**-generated static image assets (logo/icons/character photos) live in `public/`.
- Hosted on **Vercel**. This repo (`urorb/attune`) is a standalone app at its own root.

## Run it locally

```bash
pnpm install            # or npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
pnpm dev                # → http://localhost:3000
```

Voice (talking TO it) works in **Chrome/Edge desktop and Android Chrome**. On **iOS Safari**,
speech *recognition* is unsupported by Apple, so you type your side; the character still speaks back.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | **yes** | Without it the API routes return a "not configured" message. |
| `ATTUNE_CONVERSE_MODEL` | no | Model for live turns + suggestions. Default `claude-sonnet-5`. |
| `ATTUNE_DEBRIEF_MODEL` | no | Model for debrief + Response Lab. Default `claude-sonnet-5`. |

To cut cost, set both to `claude-haiku-4-5` (about half the price, slightly less nuance).

## Deploying to Vercel — gotchas

- The repo is its own app at the root, so **no Root Directory / branch settings** needed; import
  `urorb/attune`, add `ANTHROPIC_API_KEY`, deploy.
- **Env vars only apply to deployments created AFTER they're added** — redeploy after adding the key.
- **Commit-author check:** Vercel blocks deploys whose commit email isn't linked to a GitHub
  account. Author commits with the GitHub no-reply email `277074987+UrOrb@users.noreply.github.com`
  (or another email verified on the GitHub account), **not** a personal email, or the deploy is
  "Blocked."

---

## How it works (architecture)

### The emotional engine (the heart of the app)

The character carries an invisible **inner state** — eight 0–100 meters:
`trust, respect, comfort, patience, openness, defensiveness, confusion, intensity`
(defined in `src/lib/emotion.ts`). Every turn, the model reads the current state + the
conversation + how the user spoke, then **returns the updated state** along with its spoken reply.
The meters drive behavior: low patience → clipped/interrupting; high defensiveness → deflecting;
rising trust/openness → softening. Emotion also maps to **speech prosody** (rate/pitch) so an
impatient line sounds different from a withdrawn one (`prosodyFor()` in `emotion.ts`).

### Request/response contract

`src/lib/session.ts` defines the shared types between client and API (`SceneConfig`,
`ConverseRequest`, `CharacterTurn`, `Debrief`, Response-Lab + Suggestion types, and the
`PENDING_SCENE_KEY` used to hand a scene from the Lab into the Room).

### API routes (all use Anthropic tool-use for structured output)

- `POST /api/converse` — one conversational turn. Returns the character's spoken reply, current
  emotion + intensity, the full updated 8-meter state, why it moved, behaviors, an optional
  coaching nudge, and goal progress.
- `POST /api/debrief` — end-of-session analysis (emotional arc, what went well, watch-outs, the
  turning point, a stronger rewrite in the user's voice, an exercise, 4 scores, exec read).
- `POST /api/suggest` — in-conversation "How could I respond?" → 2–3 ready-to-say lines.
- `POST /api/response-lab` — paste a received message → subtext read + 3 distinct replies with how
  each lands.

All routes: rate-limited (`src/lib/rate-limit.ts`), degrade gracefully with no API key, and map
Anthropic SDK errors to specific messages via `anthropicErrorInfo()` in `src/lib/anthropic.ts`.

### Prompting

`src/lib/prompt.ts` builds the system prompt that turns Claude into a living character (persona +
scenario + difficulty directive + the inner-state rules + "talk like a real person" rules). It also
turns the user's delivery (pace, fillers, interruptions) into a line the model reads.

### Client / voice loop

- `src/lib/speech.ts` + `src/hooks/use-voice.ts` wrap the Web Speech API: continuous listening,
  auto-send after a ~1.1s pause, delivery-signal extraction, and emotion-mapped TTS. The mic is
  paused while the character speaks (so it doesn't transcribe itself); "Cut in" interrupts.
- `src/components/live-room.tsx` is the state machine for a live session (turns, state history,
  coaching, suggestions, text fallback).
- `src/app/room/room-client.tsx` orchestrates setup → live → debrief and consumes a Lab handoff.

### Themes

Three switchable palettes via a `data-theme` attribute on `<html>`, persisted to localStorage,
applied before paint (no flash). Default **Midnight Lavender**; also **Deep Ocean** and **Clean
Light**. Switcher is bottom-right (`src/components/theme-toggle.tsx`); tokens in
`src/app/globals.css`. Everything resolves through CSS variables, so recoloring = editing tokens.

---

## File map

```
src/
  app/
    layout.tsx            root layout, fonts (Inter/Fraunces/Quicksand), theme init, metadata
    page.tsx              landing (hero, modes, characters, difficulty, CTA)
    globals.css           design tokens + 3 themes + component utility classes
    manifest.ts           PWA manifest (installable to home screen)
    icon.png / apple-icon.png   app + iOS icons (the speech-bubble mark, tile-filling)
    room/                 the practice room: page.tsx (Suspense) + room-client.tsx
    library/page.tsx      browsable scenario catalog by category
    lab/                  Response Lab: page.tsx + lab-client.tsx
    api/converse/route.ts
    api/debrief/route.ts
    api/suggest/route.ts
    api/response-lab/route.ts
  components/
    presence.tsx          the character "orb": photo + emotion-colored glow/pulse
    meters.tsx            the 8 inner-state meters + mood badge + goal bar
    waveform.tsx          mic activity bars
    setup-panel.tsx       scene setup (mode / scenario / character / difficulty / custom)
    live-room.tsx         live conversation state machine
    debrief-panel.tsx     post-conversation breakdown
    logo.tsx              in-app logo (mark + wordmark)
    theme-toggle.tsx      bottom-right theme switcher
  hooks/use-voice.ts      Web Speech listen/speak loop
  lib/
    emotion.ts            8-meter model, emotion spectrum, prosody mapping
    characters.ts         6 characters, difficulties, modes, categories, ~25 scenarios
    session.ts            shared client/API types
    prompt.ts             system-prompt builder
    anthropic.ts          SDK client, model IDs, error mapping
    rate-limit.ts         in-memory per-IP limiter
    speech.ts             Web Speech wrappers + delivery-signal helpers
    logo-svg.ts           (legacy) SVG mark builder — icons are now static PNGs
public/
    mark.png              transparent speech-bubble mark (used in header)
    icon-192/512(-maskable).png   PWA manifest icons
    characters/*.jpg      6 character portraits (maya/jordan/elena/marcus/ava/riley)
```

## Content model (`src/lib/characters.ts`)

- **Modes:** Practice, Corporate Coach, Stage Coach, Talk Now, Response Lab.
- **Difficulties:** Supportive · Realistic · Difficult · High-pressure · Unpredictable (each injects
  a directive into the system prompt).
- **Characters (with photos):** Maya (emotionally aware), Jordan (direct executive), Elena
  (difficult/defensive), Marcus (interviewer), Ava (speech director), Riley (frustrated client).
  Each has a persona, what opens them up / shuts them down, contexts, and a **non-neutral starting
  state**. Users can also **build a custom character** (no photo — shows an initial).
- **Categories + ~25 scenarios** power the Library (Corporate, Interviews & Career, Conflict &
  Repair, Relationships, Difficult People, Everyday Nerve, On Stage).

---

## Current status

**Working end-to-end** (with an API key): setup → voice conversation with live emotional state →
in-chat suggestions → debrief; the Scenario Library; the Response Lab (paste → options → "rehearse
this live" hands off into the Room); three themes; PWA install with a real app icon.

**Known limitations / not yet built:**
- **No persistence.** Everything is in-memory per session — conversations, state, and debriefs are
  not saved. There's no database, no accounts, no history.
- **No "Communication Progress" view** (a page tracking patterns across many sessions —
  over-explaining, defensiveness under pressure, etc.). This was in the original vision; it needs
  persistence first.
- **iPhone voice input:** iOS Safari has no `SpeechRecognition`; users type on iPhone. A cloud STT
  (e.g. record mic → transcription API) would enable true talk-to-it voice on iOS.
- **TTS quality** is the browser default. A premium provider (e.g. ElevenLabs) would sound far more
  human but needs a key + cost.
- **Talk Now** and **Stage Coach** are functional but lighter than the other modes.
- **Cost:** every character reply and every debrief is a paid Claude API call (~a fraction of a
  cent to ~2¢ each). Set a spend cap in the Anthropic console. Rate limits are already in place.

**Active debugging note:** if speaking to a character shows an error, the routes now return a
**specific** message (invalid key / no credit / model access / rate limit) — read that message to
diagnose. Confirm `ANTHROPIC_API_KEY` is set for the **Production** scope in Vercel and that a
redeploy happened after adding it.

## Suggested next steps (roadmap)

1. **Persistence + accounts** (e.g. Supabase or Postgres): save sessions, meter history, and
   debriefs per user. Unlocks everything below.
2. **Communication Progress page**: aggregate patterns across sessions (avoids direct answers,
   over-apologizes, gets defensive under pressure, over-explains, loses structure).
3. **iPhone voice input** via a cloud transcription endpoint (`/api/transcribe`), so iOS users can
   speak, not just type.
4. **Premium TTS** option (per-character voices) behind an env flag.
5. **Deepen Stage Coach** (speech builder + section-by-section rehearsal) and **Talk Now**.
6. **Model/cost controls** in-app (let the user pick Haiku vs Sonnet per session).

## Conventions

- Keep the app **token-driven** for styling — add colors as CSS variables in `globals.css`, not
  hardcoded hex in components (a few intentional inline `var(--...)` styles exist).
- API routes must **degrade gracefully without a key** and stay **rate-limited**.
- Prefer **structured tool-use** for anything the client parses (don't parse free-form model text).
- Characters are **simulated** and labeled as such — never present a custom character as the real
  person.
