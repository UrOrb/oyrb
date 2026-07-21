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

// Turn an Anthropic SDK error into a specific, human-readable message + HTTP
// status, so the UI can tell the user exactly what to fix (bad key, no credit,
// rate limit, …) instead of a generic "unavailable".
export function anthropicErrorInfo(err: unknown): { status: number; message: string } {
  const e = err as {
    status?: number;
    error?: { error?: { message?: string; type?: string } };
    message?: string;
  };
  const status = typeof e?.status === "number" ? e.status : 0;
  const providerMsg = (e?.error?.error?.message || e?.message || "").toString();

  if (status === 401) {
    return { status: 502, message: "Your ANTHROPIC_API_KEY looks invalid or expired. Re-check the key in Vercel → Settings → Environment Variables, then redeploy." };
  }
  if (status === 403) {
    return { status: 502, message: "That API key doesn't have access. Check your Anthropic account permissions and that billing is set up." };
  }
  if (status === 400 && /credit|balance|billing|quota|payment/i.test(providerMsg)) {
    return { status: 502, message: "Your Anthropic account has no credit. Go to console.anthropic.com → Billing and add a payment method or buy credit (even $5), then try again." };
  }
  if (status === 404 && /model/i.test(providerMsg)) {
    return { status: 502, message: "The AI model isn't available on your account yet. Try again shortly, or contact support." };
  }
  if (status === 429) {
    return { status: 429, message: "Anthropic is rate-limiting the account — wait a moment and try again." };
  }
  if (status >= 500) {
    return { status: 502, message: "Anthropic's service is having a hiccup — try again in a moment." };
  }
  // Fallback: surface the provider's own message if we have one.
  return {
    status: 502,
    message: providerMsg
      ? `The character couldn't respond: ${providerMsg.slice(0, 200)}`
      : "The character is unavailable right now — try again in a moment.",
  };
}
