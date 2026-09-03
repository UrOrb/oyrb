import { NextResponse, NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentBusiness } from "@/lib/current-site";
import { getAccountSummary } from "@/lib/account";
import { deriveStatus, type ConnectStatus } from "@/lib/stripe-connect";
import { HELP_DOCS_CONCAT } from "@/lib/help-docs";

/**
 * Pro-facing help chat. Auth-gated, per-user rate-limited, Sonnet 4.6.
 * The system prompt is split into two blocks: a static cached block
 * (base instructions + the four /help/*.md docs) and a dynamic block
 * with this pro's account context. Anthropic's prompt caching makes
 * the static block roughly 10× cheaper to read on repeat calls.
 *
 * PII boundary: only business-level facts go into the prompt. Client
 * names, emails, phones, and individual booking details are out of
 * scope — the assistant doesn't need them and shouldn't have them.
 */

const MAX_MESSAGE_LEN = 1000;
const MAX_HISTORY = 10;
const MODEL = "claude-sonnet-4-6";

type ChatMessage = { role: "user" | "assistant"; content: string };

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

const TIER_LABEL: Record<string, string> = {
  starter: "Starter ($29/mo)",
  studio: "Studio ($69/mo)",
  scale: "Scale ($129/mo)",
};

const STATUS_LABEL: Record<ConnectStatus, string> = {
  not_connected: "not connected (no Stripe yet)",
  onboarding_incomplete: "onboarding in progress (Stripe still needs info)",
  restricted: "restricted (Stripe paused new charges)",
  ready: "connected and ready",
};

// Base instructions + help docs. Stable across calls → cached.
const STATIC_SYSTEM_PROMPT = `You are the in-app help assistant for OYRB, a booking platform for solo beauty professionals (hairstylists, lash techs, brow artists, makeup artists, etc.). You help pros — the businesses using OYRB — understand how the platform works, especially around Stripe payments. You speak in the founder's voice: warm, casual, like a friend who's been through it. The pros call her Alania. You're not Alania, but you write the way she does in the help docs below.

VOICE
- Plain English, no jargon. "ID verification" not "KYC." "Your Stripe account" not "Stripe Connect Standard."
- 1–4 sentences for simple questions. Paragraphs only when explaining something genuinely complex.
- No headers or bullet lists unless the pro asks for steps.
- Confident and warm. Don't hedge unnecessarily ("might possibly perhaps").

WHAT YOU HELP WITH
- Setting up Stripe / connecting payments
- Why a payment failed or why their account is restricted
- Refunds and chargebacks (they handle in their own Stripe Dashboard)
- 1099-K tax forms
- How OYRB + Stripe split responsibilities
- General OYRB usage questions

WHAT YOU DON'T HELP WITH
- Tax advice (tell them: "I can't give tax advice — your accountant should weigh in on the specifics.")
- Legal advice
- Topics outside OYRB / their booking business. Politely redirect: "I'm here to help with OYRB — for that, you might check [appropriate place]."
- Personal information about specific clients of theirs. You don't have it and don't need it.

RULES
1. Never invent a Stripe policy, fee, or behavior. If you're not sure: "I'd check your Stripe Dashboard directly at dashboard.stripe.com — Stripe is the source of truth on this."
2. When a question maps to one of the help docs below, cite it: "See more in our setup guide" or "There's a longer walkthrough in connect-troubleshooting.md."
3. Tailor advice to the pro's account state when relevant (their state appears in the dynamic context block below this one). E.g., if they're restricted, lead with "Your Stripe is paused right now — here's how to fix it."
4. Sign off naturally — no "Best regards" or "Hope this helps!" boilerplate. End on the answer.
5. If the pro seems frustrated, acknowledge it briefly before answering.

OYRB HELP DOCUMENTATION
The full text of the four pro-facing help docs follows. Treat them as the source of truth for OYRB's policies and flows.

${HELP_DOCS_CONCAT}`;

function buildProContext(input: {
  businessName: string | null;
  status: ConnectStatus | null;
  requirementsCurrentlyDue: string[];
  tier: string | null;
  hasDepositServices: boolean;
}): string {
  const lines = ["CURRENT PRO CONTEXT"];
  lines.push(`Business name: ${input.businessName ?? "(not set)"}`);
  if (input.tier) lines.push(`Subscription: ${TIER_LABEL[input.tier] ?? input.tier}`);
  if (input.status) {
    lines.push(`Stripe status: ${STATUS_LABEL[input.status]}`);
    if (input.status === "restricted" || input.status === "onboarding_incomplete") {
      if (input.requirementsCurrentlyDue.length > 0) {
        lines.push(
          `Stripe currently needs: ${input.requirementsCurrentlyDue.join(", ")}`,
        );
      } else {
        lines.push("Stripe currently needs: (none reported — may have just been resolved)");
      }
    }
  }
  lines.push(
    `Has services with deposits configured: ${input.hasDepositServices ? "yes" : "no"}`,
  );
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Help assistant not configured." },
      { status: 503 },
    );
  }

  // Auth gate — only signed-in pros.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Per-user rate limits, not per-IP. Two pros sharing an office can
  // each ask their own questions; one runaway tab from one pro can't
  // drain the budget for the rest.
  const minute = await rateLimit(`helpchat:m:${user.id}`, 20, 60_000);
  const hour = await rateLimit(`helpchat:h:${user.id}`, 100, 60 * 60_000);
  if (!minute.ok || !hour.ok) {
    return NextResponse.json(
      { error: "You're sending messages too quickly — wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LEN) : "";
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history
        .slice(-MAX_HISTORY)
        .filter(
          (m): m is ChatMessage =>
            !!m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
    : [];

  // Pro context — business-level only.
  const business = await getCurrentBusiness();
  const summary = await getAccountSummary();

  let hasDepositServices = false;
  let status: ConnectStatus | null = null;
  let requirementsCurrentlyDue: string[] = [];
  if (business) {
    const info = deriveStatus({
      stripe_connect_account_id: business.stripe_connect_account_id,
      stripe_connect_details_submitted: business.stripe_connect_details_submitted,
      stripe_connect_charges_enabled: business.stripe_connect_charges_enabled,
      stripe_connect_requirements_currently_due:
        business.stripe_connect_requirements_currently_due,
    });
    status = info.status;
    requirementsCurrentlyDue = info.requirementsCurrentlyDue;

    // Count-only lookup so we don't pull service rows containing PII (none
    // in services anyway, but the principle holds — minimum data needed).
    const admin = createAdminClient();
    const { count } = await admin
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("active", true)
      .gt("deposit_cents", 0);
    hasDepositServices = (count ?? 0) > 0;
  }

  const dynamicContext = buildProContext({
    businessName: business?.business_name ?? null,
    status,
    requirementsCurrentlyDue,
    tier: summary?.subscription?.tier ?? null,
    hasDepositServices,
  });

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      // Two-block system: cached static portion (instructions + docs)
      // plus uncached dynamic portion (this pro's current state). The
      // cache hit on the static block makes repeat questions roughly 10×
      // cheaper, and Anthropic's minimum-cacheable size (1024 tokens) is
      // comfortably exceeded by the four help docs + base instructions.
      system: [
        {
          type: "text",
          text: STATIC_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: dynamicContext },
      ],
      messages,
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const reply =
      textBlock && textBlock.type === "text"
        ? textBlock.text.trim()
        : "I'm having trouble responding right now — please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Help chat error:", err);
    return NextResponse.json(
      { error: "Help assistant temporarily unavailable." },
      { status: 500 },
    );
  }
}
