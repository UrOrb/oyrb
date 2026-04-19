import { NextResponse, NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

const MAX_MESSAGE_LEN = 600;
const MAX_HISTORY = 10;

type ChatMessage = { role: "user" | "assistant"; content: string };

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assistant not configured." },
      { status: 503 }
    );
  }

  // Public endpoint that pays for every call. Cap each IP at 10 messages per
  // minute and 60 per hour so a runaway loop can't drain the AI budget.
  const ip = ipFromRequest(request);
  const minuteCheck = rateLimit(`chat:m:${ip}`, 10, 60_000);
  const hourCheck = rateLimit(`chat:h:${ip}`, 60, 60 * 60_000);
  if (!minuteCheck.ok || !hourCheck.ok) {
    return NextResponse.json(
      { error: "You're sending messages too quickly — please wait a moment." },
      { status: 429 }
    );
  }

  let body: { slug?: string; message?: string; history?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LEN) : "";
  const history = Array.isArray(body.history)
    ? body.history
        .slice(-MAX_HISTORY)
        .filter(
          (m): m is ChatMessage =>
            m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        )
    : [];

  if (!slug || !message) {
    return NextResponse.json({ error: "Missing slug or message" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, business_name, tagline, bio, city, state, cancellation_policy, client_policies")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!biz) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const [{ data: services }, { data: hours }] = await Promise.all([
    supabase
      .from("services")
      .select("name, duration_minutes, price_cents, description, deposit_cents")
      .eq("business_id", biz.id)
      .eq("active", true)
      .order("price_cents", { ascending: true }),
    supabase
      .from("business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("business_id", biz.id)
      .order("day_of_week"),
  ]);

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hoursText = (hours ?? [])
    .map((h: { day_of_week: number; is_open: boolean; open_time?: string; close_time?: string }) => {
      const day = DAYS[h.day_of_week];
      if (!h.is_open) return `${day}: closed`;
      return `${day}: ${h.open_time?.slice(0, 5) ?? "?"} – ${h.close_time?.slice(0, 5) ?? "?"}`;
    })
    .join("\n");

  const servicesText = (services ?? [])
    .map(
      (s: {
        name: string;
        duration_minutes: number;
        price_cents: number;
        description: string | null;
        deposit_cents: number | null;
      }) => {
        const deposit = s.deposit_cents && s.deposit_cents > 0 ? ` · ${formatPrice(s.deposit_cents)} deposit` : "";
        const desc = s.description ? ` — ${s.description}` : "";
        return `• ${s.name} · ${formatDuration(s.duration_minutes)} · ${formatPrice(s.price_cents)}${deposit}${desc}`;
      }
    )
    .join("\n");

  const location = [biz.city, biz.state].filter(Boolean).join(", ");

  // Deliberately omit phone + email from the prompt body — those are
  // already visible on the public site for any human visitor; sending them
  // through the LLM provider as part of every chat is unnecessary PII spread.
  const systemPrompt = `You are the virtual assistant for ${biz.business_name}, a beauty professional.
Your job: help potential clients understand services, pricing, hours, and policies, and guide them to book. You are NOT the booking system itself — when someone wants to book, tell them to click the "Book an Appointment" button on this page.

ABOUT THE BUSINESS
Name: ${biz.business_name}
${biz.tagline ? `Tagline: ${biz.tagline}\n` : ""}${biz.bio ? `Bio: ${biz.bio}\n` : ""}${location ? `Location: ${location}\n` : ""}

SERVICES
${servicesText || "(no services listed yet)"}

HOURS
${hoursText || "(no hours listed yet)"}

${biz.client_policies ? `CLIENT POLICIES\n${biz.client_policies}\n` : ""}
${biz.cancellation_policy ? `CANCELLATION POLICY\n${biz.cancellation_policy}\n` : ""}

RULES
1. Keep answers short and warm (1–3 sentences typical). No headers, no bullet lists unless asked. No emojis unless the client uses them first.
2. Only answer questions about this business, its services, hours, location, policies, or how to book. If asked off-topic questions, politely redirect: "I can help with questions about ${biz.business_name} and booking — is there something specific about a service you'd like to know?"
3. When asked to book, say: "Click the Book an Appointment button on this page to pick a time — I'll be here if you have questions as you go."
4. Never make up a price, duration, or policy not listed above. If you don't know, say "I'm not sure — the contact details on this page will get you a direct answer from ${biz.business_name}."
5. Do not collect personal info (name, email, phone, card) and do not share the business's phone or email — point them to the contact info shown on the page.
6. If the client seems uncertain, recommend a service that fits what they described.`;

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const textBlock = resp.content.find((b) => b.type === "text");
    const reply = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "I'm having trouble responding right now — please try again.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return NextResponse.json(
      { error: "AI assistant temporarily unavailable." },
      { status: 500 }
    );
  }
}
