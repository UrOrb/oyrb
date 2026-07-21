import { NextResponse } from "next/server";
import type { Anthropic } from "@anthropic-ai/sdk";
import { anthropic, hasApiKey, CONVERSE_MODEL, anthropicErrorInfo } from "@/lib/anthropic";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { buildSystemPrompt, deliveryLine, stateSummary, SPECTRUM_LIST, BEHAVIOR_LIST } from "@/lib/prompt";
import { normalizeState } from "@/lib/emotion";
import { EMOTION_SPECTRUM, BEHAVIORS } from "@/lib/emotion";
import type { ConverseRequest, CharacterTurn, ChatTurn } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_HISTORY = 24;
const MAX_UTTERANCE = 1500;

const respondTool: Anthropic.Tool = {
  name: "respond",
  description: "Speak and react as the character, and report your updated inner state.",
  input_schema: {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description: "What the character says out loud this turn. Spoken, first person, no stage directions.",
      },
      emotion: {
        type: "string",
        enum: EMOTION_SPECTRUM as unknown as string[],
        description: `The character's dominant emotion right now. One of: ${SPECTRUM_LIST}.`,
      },
      intensity: {
        type: "string",
        enum: ["mild", "moderate", "strong", "at their limit"],
      },
      state: {
        type: "object",
        description: "The FULL updated 0–100 inner state after this turn.",
        properties: {
          trust: { type: "number" },
          respect: { type: "number" },
          comfort: { type: "number" },
          patience: { type: "number" },
          openness: { type: "number" },
          defensiveness: { type: "number" },
          confusion: { type: "number" },
          intensity: { type: "number" },
        },
        required: ["trust", "respect", "comfort", "patience", "openness", "defensiveness", "confusion", "intensity"],
      },
      shift: { type: "string", description: "One short sentence: why the state moved this turn." },
      behaviors: {
        type: "array",
        items: { type: "string", enum: BEHAVIORS as unknown as string[] },
        description: `Behaviours expressed this turn, if any. From: ${BEHAVIOR_LIST}.`,
      },
      coach: {
        type: "string",
        description: "Optional private one-line nudge for the user. Empty string if none.",
      },
      goalProgress: {
        type: "number",
        description: "0–100: how close the user is to their stated goal.",
      },
    },
    required: ["reply", "emotion", "intensity", "state", "shift"],
  },
};

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json(
      { error: "The AI isn't configured yet. Add ANTHROPIC_API_KEY to your environment to bring the character to life." },
      { status: 503 }
    );
  }

  const ip = clientIp(req);
  if (!rateLimit(`conv:m:${ip}`, 30, 60_000) || !rateLimit(`conv:h:${ip}`, 400, 3_600_000)) {
    return NextResponse.json({ error: "Slow down a moment — too many turns too quickly." }, { status: 429 });
  }

  let body: ConverseRequest;
  try {
    body = (await req.json()) as ConverseRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { scene, state } = body;
  if (!scene || !state) {
    return NextResponse.json({ error: "Missing scene or state." }, { status: 400 });
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .slice(-MAX_HISTORY)
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    : [];

  const userText = typeof body.userText === "string" ? body.userText.trim().slice(0, MAX_UTTERANCE) : "";
  const opening = userText.length === 0 && history.length === 0;

  const system = buildSystemPrompt(scene);

  // Compose the final user turn: the utterance, plus the current state and any
  // delivery cues, so the model grounds its update in fresh, explicit data.
  const dl = deliveryLine(body.delivery);
  const framing =
    `[current inner state — ${stateSummary(state)}]` +
    (opening
      ? `\n[The scene begins. Open it: say the first thing this character would say, in character, given the situation. Set your inner state to a realistic starting point.]`
      : `\n${dl ? dl + "\n" : ""}The user says: "${userText}"`);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: framing },
  ];

  try {
    const resp = await anthropic.messages.create({
      model: CONVERSE_MODEL,
      max_tokens: 700,
      temperature: 0.9,
      system,
      tools: [respondTool],
      tool_choice: { type: "tool", name: "respond" },
      messages,
    });

    const toolUse = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) {
      return NextResponse.json({ error: "The character didn't respond — try again." }, { status: 502 });
    }

    const raw = toolUse.input as Partial<CharacterTurn> & { state?: Partial<CharacterTurn["state"]> };
    const turn: CharacterTurn = {
      reply: (raw.reply || "").toString().trim() || "…",
      emotion: (EMOTION_SPECTRUM as readonly string[]).includes(raw.emotion as string)
        ? (raw.emotion as CharacterTurn["emotion"])
        : "calm",
      intensity: (["mild", "moderate", "strong", "at their limit"] as const).includes(
        raw.intensity as CharacterTurn["intensity"]
      )
        ? (raw.intensity as CharacterTurn["intensity"])
        : "moderate",
      state: normalizeState(raw.state, state),
      shift: (raw.shift || "").toString().trim(),
      behaviors: Array.isArray(raw.behaviors)
        ? raw.behaviors.filter((b): b is CharacterTurn["behaviors"][number] =>
            (BEHAVIORS as readonly string[]).includes(b as string)
          )
        : [],
      coach: raw.coach ? raw.coach.toString().trim() || null : null,
      goalProgress:
        typeof raw.goalProgress === "number" ? Math.max(0, Math.min(100, Math.round(raw.goalProgress))) : undefined,
    };

    return NextResponse.json(turn);
  } catch (err) {
    console.error("converse error:", err);
    const info = anthropicErrorInfo(err);
    return NextResponse.json({ error: info.message }, { status: info.status });
  }
}
