import { NextResponse } from "next/server";
import type { Anthropic } from "@anthropic-ai/sdk";
import { anthropic, hasApiKey, DEBRIEF_MODEL } from "@/lib/anthropic";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { characterById, DIFFICULTIES } from "@/lib/characters";
import { stateSummary } from "@/lib/prompt";
import type { DebriefRequest, Debrief } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 45;

const debriefTool: Anthropic.Tool = {
  name: "deliver_debrief",
  description: "Deliver a complete, specific coaching breakdown of the conversation.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string", description: "One warm, honest sentence summing up how it went." },
      emotionalArc: {
        type: "string",
        description: "2–3 sentences tracing how the other person moved emotionally, and what moved them.",
      },
      didWell: { type: "array", items: { type: "string" }, description: "2–4 specific things the user did well." },
      watchOuts: {
        type: "array",
        items: { type: "string" },
        description: "2–4 specific patterns to watch — vague answers, over-explaining, defensiveness, etc.",
      },
      turningPoint: {
        type: "object",
        properties: {
          quote: { type: "string", description: "The user line that shifted things most (quote or close paraphrase)." },
          why: { type: "string", description: "Why it created the strongest reaction." },
        },
        required: ["quote", "why"],
      },
      strongerVersion: {
        type: "object",
        description: "A stronger rewrite of one weak moment, in the user's own natural voice.",
        properties: {
          context: { type: "string", description: "Which moment this replaces." },
          rewrite: { type: "string", description: "The stronger thing they could have said." },
        },
        required: ["context", "rewrite"],
      },
      exercise: { type: "string", description: "One short, concrete practice exercise for next time." },
      execRead: {
        type: "string",
        description: "For corporate scenes only: how a leader/exec would likely interpret the user. Empty otherwise.",
      },
      scores: {
        type: "object",
        properties: {
          clarity: { type: "number" },
          directness: { type: "number" },
          empathy: { type: "number" },
          composure: { type: "number" },
        },
        required: ["clarity", "directness", "empathy", "composure"],
      },
    },
    required: ["headline", "emotionalArc", "didWell", "watchOuts", "exercise", "scores"],
  },
};

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "The AI isn't configured yet. Add ANTHROPIC_API_KEY to your environment." }, { status: 503 });
  }

  const ip = clientIp(req);
  if (!rateLimit(`deb:h:${ip}`, 60, 3_600_000)) {
    return NextResponse.json({ error: "Too many debriefs — take a breather." }, { status: 429 });
  }

  let body: DebriefRequest;
  try {
    body = (await req.json()) as DebriefRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { scene, history } = body;
  if (!scene || !Array.isArray(history) || history.length === 0) {
    return NextResponse.json({ error: "Nothing to analyze yet." }, { status: 400 });
  }

  const ch = scene.customCharacter ? scene.customCharacter.name : characterById(scene.characterId)?.name ?? "the other person";
  const difficulty = DIFFICULTIES.find((d) => d.id === scene.difficulty)?.name ?? scene.difficulty;
  const isCorporate = scene.mode === "corporate";

  const transcript = history
    .map((m) => `${m.role === "user" ? "USER" : ch.toUpperCase()}: ${m.content}`)
    .join("\n");

  const arc = (body.stateHistory ?? [])
    .map((s) => `  turn ${s.turn}: ${stateSummary(s.state)}`)
    .join("\n");

  const system = `You are an elite communication coach reviewing a practice conversation. You are specific, honest and encouraging — never generic. You quote real moments. You do not flatter. Your read of the emotional arc is grounded in the actual meter movements you're given.

The user was practicing this situation: ${scene.scenarioSetup}
Their goal: ${scene.userGoal}
They practiced against ${ch} at "${difficulty}" difficulty.
${isCorporate ? "This is a CORPORATE scenario — include an exec/leadership read of how the user came across.\n" : ""}
Call deliver_debrief exactly once. Keep every field concrete and tied to what actually happened. The stronger-version rewrite must sound like the user's own voice, just sharper.`;

  const user = `TRANSCRIPT\n${transcript}\n\nHOW ${ch.toUpperCase()}'S INNER STATE MOVED (0–100 meters)\n${arc || "  (not recorded)"}\n\nFinal state: ${stateSummary(body.finalState)}`;

  try {
    const resp = await anthropic.messages.create({
      model: DEBRIEF_MODEL,
      max_tokens: 1200,
      temperature: 0.6,
      system,
      tools: [debriefTool],
      tool_choice: { type: "tool", name: "deliver_debrief" },
      messages: [{ role: "user", content: user }],
    });

    const toolUse = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) return NextResponse.json({ error: "Couldn't produce a debrief — try again." }, { status: 502 });

    const raw = toolUse.input as Partial<Debrief>;
    const clampScore = (n: unknown) => (typeof n === "number" ? Math.max(0, Math.min(100, Math.round(n))) : 50);
    const debrief: Debrief = {
      headline: (raw.headline || "").toString(),
      emotionalArc: (raw.emotionalArc || "").toString(),
      didWell: Array.isArray(raw.didWell) ? raw.didWell.map(String).slice(0, 5) : [],
      watchOuts: Array.isArray(raw.watchOuts) ? raw.watchOuts.map(String).slice(0, 5) : [],
      turningPoint:
        raw.turningPoint && typeof raw.turningPoint === "object"
          ? { quote: String(raw.turningPoint.quote ?? ""), why: String(raw.turningPoint.why ?? "") }
          : null,
      strongerVersion:
        raw.strongerVersion && typeof raw.strongerVersion === "object"
          ? { context: String(raw.strongerVersion.context ?? ""), rewrite: String(raw.strongerVersion.rewrite ?? "") }
          : null,
      exercise: (raw.exercise || "").toString(),
      execRead: isCorporate && raw.execRead ? String(raw.execRead) : null,
      scores: {
        clarity: clampScore(raw.scores?.clarity),
        directness: clampScore(raw.scores?.directness),
        empathy: clampScore(raw.scores?.empathy),
        composure: clampScore(raw.scores?.composure),
      },
    };

    return NextResponse.json(debrief);
  } catch (err) {
    console.error("debrief error:", err);
    return NextResponse.json({ error: "Couldn't produce a debrief right now — try again." }, { status: 500 });
  }
}
