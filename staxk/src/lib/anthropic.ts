import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Every agent's reasoning is a Claude API call with structured JSON output,
// Zod-validated before it touches the database (CLAUDE.md hard rule).
const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — agents cannot reason.");
  }
  client ??= new Anthropic();
  return client;
}

export async function agentJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    system: `${opts.system}\n\nRespond with a single JSON object and nothing else.`,
    messages: [{ role: "user", content: opts.prompt }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Agent returned no JSON: ${text.slice(0, 200)}`);
  }
  return opts.schema.parse(JSON.parse(text.slice(jsonStart, jsonEnd + 1)));
}
