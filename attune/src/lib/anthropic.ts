import Anthropic from "@anthropic-ai/sdk";

// Single shared client. The key is read from the environment; when it's absent
// the API routes short-circuit with a clear message instead of throwing here.
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

export const hasApiKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

// Fast, capable model for the live back-and-forth; a strong model for the
// end-of-session analysis. Both overridable via env.
export const CONVERSE_MODEL = process.env.ATTUNE_CONVERSE_MODEL || "claude-sonnet-5";
export const DEBRIEF_MODEL = process.env.ATTUNE_DEBRIEF_MODEL || "claude-sonnet-5";
