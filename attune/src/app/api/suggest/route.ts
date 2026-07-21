import { NextResponse } from "next/server";
import type { Anthropic } from "@anthropic-ai/sdk";
import { anthropic, hasApiKey, CONVERSE_MODEL, anthropicErrorInfo } from "@/lib/anthropic";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { characterById, DIFFICULTIES } from "@/lib/characters";
import { stateSummary } from "@/lib/prompt";
import type { SuggestRequest, SuggestResult, Suggestion, ChatTurn } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

const tool: Anthropic.Tool = {
  name: "offer_suggestions",
  description: "Offer the user a few concrete things they could say next, and why each works.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        description: "2–3 distinct, ready-to-say lines the user could speak next.",
        items: {
          type: "object",
          properties: {
            approach: { type: "string", description: "Short label for the strategy, e.g. 'Acknowledge, then hold'." },
            text: { type: "string", description: "The actual words the user could say, in a natural spoken voice." },
            why: { type: "string", description: "One line: why this works right now, given how the other person feels." },
          },
          required: ["approach", "text", "why"],
        },
      },
    },
    required: ["suggestions"],
  },
};

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "The AI isn't configured yet. Add ANTHROPIC_API_KEY to your environment." }, { status: 503 });
  }
  const ip = clientIp(req);
  if (!rateLimit(`sug:m:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "One moment — too many hints too fast." }, { status: 429 });
  }

  let body: SuggestRequest;
  try {
    body = (await req.json()) as SuggestRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { scene, state } = body;
  if (!scene || !state) return NextResponse.json({ error: "Missing context." }, { status: 400 });

  const history: ChatTurn[] = Array.isArray(body.history) ? body.history.slice(-16) : [];
  const who = scene.customCharacter?.name || characterById(scene.characterId)?.name || "the other person";
  const difficulty = DIFFICULTIES.find((d) => d.id === scene.difficulty)?.name ?? scene.difficulty;

  const transcript = history.map((m) => `${m.role === "user" ? "YOU" : who.toUpperCase()}: ${m.content}`).join("\n") || "(the conversation is just starting)";

  const system = `You are a discreet, in-the-ear communication coach. The user is mid-conversation and wants a hint on what to say next. Offer 2–3 genuinely different, ready-to-speak lines — real words they could say out loud right now, not abstract advice. Keep each natural and human. Ground them in how ${who} currently feels. Call offer_suggestions exactly once.`;

  const user = `Situation: ${scene.scenarioSetup}
The user's goal: ${scene.userGoal}
They're talking to ${who} (${difficulty} difficulty).
${who}'s current inner state (0–100): ${stateSummary(state)}

Conversation so far:
${transcript}

Give the user 2–3 strong things they could say next.`;

  try {
    const resp = await anthropic.messages.create({
      model: CONVERSE_MODEL,
      max_tokens: 500,
      temperature: 0.8,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: "offer_suggestions" },
      messages: [{ role: "user", content: user }],
    });

    const toolUse = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) return NextResponse.json({ error: "No hint right now — try again." }, { status: 502 });

    const raw = toolUse.input as Partial<SuggestResult>;
    const suggestions: Suggestion[] = Array.isArray(raw.suggestions)
      ? raw.suggestions.slice(0, 3).map((s) => ({
          approach: String(s?.approach ?? "Try this"),
          text: String(s?.text ?? ""),
          why: String(s?.why ?? ""),
        }))
      : [];

    return NextResponse.json({ suggestions } satisfies SuggestResult);
  } catch (err) {
    console.error("suggest error:", err);
    const info = anthropicErrorInfo(err);
    return NextResponse.json({ error: info.message }, { status: info.status });
  }
}
