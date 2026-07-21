import { NextResponse } from "next/server";
import type { Anthropic } from "@anthropic-ai/sdk";
import { anthropic, hasApiKey, DEBRIEF_MODEL, anthropicErrorInfo } from "@/lib/anthropic";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import type { ResponseLabRequest, ResponseLabResult, ReplyOption } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 45;

const MAX = 2500;

const tool: Anthropic.Tool = {
  name: "explore_replies",
  description: "Read the incoming message and lay out distinct ways the user could reply and how each would land.",
  input_schema: {
    type: "object",
    properties: {
      read: {
        type: "string",
        description: "What the incoming message is really saying underneath the words — the subtext, in 1–2 sentences.",
      },
      senderFeeling: { type: "string", description: "One short line on the sender's likely emotional state." },
      options: {
        type: "array",
        description: "3 genuinely different ways to respond, from safest to boldest.",
        items: {
          type: "object",
          properties: {
            approach: { type: "string", description: "Short label, e.g. 'Direct & warm', 'Hold the boundary', 'Buy time'." },
            text: { type: "string", description: "The actual reply the user could send, in their natural voice." },
            howItLands: { type: "string", description: "The likely emotional and relational effect on the other person." },
            risk: { type: "string", description: "The main downside or when this reply backfires." },
            recommended: { type: "boolean" },
          },
          required: ["approach", "text", "howItLands", "risk"],
        },
      },
    },
    required: ["read", "senderFeeling", "options"],
  },
};

export async function POST(req: Request) {
  if (!hasApiKey()) {
    return NextResponse.json({ error: "The AI isn't configured yet. Add ANTHROPIC_API_KEY to your environment." }, { status: 503 });
  }
  const ip = clientIp(req);
  if (!rateLimit(`lab:m:${ip}`, 12, 60_000) || !rateLimit(`lab:h:${ip}`, 120, 3_600_000)) {
    return NextResponse.json({ error: "Slow down a moment — too many requests." }, { status: 429 });
  }

  let body: ResponseLabRequest;
  try {
    body = (await req.json()) as ResponseLabRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = (body.message || "").toString().trim().slice(0, MAX);
  if (!message) return NextResponse.json({ error: "Paste the message you received first." }, { status: 400 });
  const from = (body.from || "someone").toString().trim().slice(0, 200);
  const context = (body.context || "").toString().trim().slice(0, MAX);
  const tone = (body.tone || "").toString().trim().slice(0, 100);

  const system = `You are a sharp, emotionally intelligent communication coach helping someone decide how to reply to a message they received. You read subtext accurately and you never give bland, one-size-fits-all advice. Each reply option must be genuinely distinct in strategy — not three flavors of the same thing — and written in a natural, human voice the user could actually send. Be honest about the risk of each. Call explore_replies exactly once.`;

  const user = `The message the user received (from ${from}):
"""
${message}
"""
${context ? `Context / what the user wants: ${context}\n` : ""}${tone ? `Preferred tone for the reply: ${tone}\n` : ""}
Give your read of what's really being said, the sender's likely feeling, and 3 distinct ways to reply — from safest to boldest — each with how it would land and its risk. Mark the one you'd recommend.`;

  try {
    const resp = await anthropic.messages.create({
      model: DEBRIEF_MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: "explore_replies" },
      messages: [{ role: "user", content: user }],
    });

    const toolUse = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) return NextResponse.json({ error: "Couldn't work through it — try again." }, { status: 502 });

    const raw = toolUse.input as Partial<ResponseLabResult>;
    const options: ReplyOption[] = Array.isArray(raw.options)
      ? raw.options.slice(0, 4).map((o) => ({
          approach: String(o?.approach ?? "Option"),
          text: String(o?.text ?? ""),
          howItLands: String(o?.howItLands ?? ""),
          risk: String(o?.risk ?? ""),
          recommended: Boolean(o?.recommended),
        }))
      : [];

    const result: ResponseLabResult = {
      read: String(raw.read ?? ""),
      senderFeeling: String(raw.senderFeeling ?? ""),
      options,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error("response-lab error:", err);
    const info = anthropicErrorInfo(err);
    return NextResponse.json({ error: info.message }, { status: info.status });
  }
}
