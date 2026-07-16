// Resend inbound email webhook → Chronicle (email.inbound event).
// Route handlers are for webhooks ONLY; all user mutations are Server
// Actions (CLAUDE.md hard rule).
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { z } from "zod";

import { sendEvent } from "@/inngest/client";

const inboundSchema = z.object({
  type: z.string(),
  data: z.object({
    from: z.string(),
    to: z.union([z.string(), z.array(z.string())]),
    subject: z.string().default(""),
    text: z.string().default(""),
  }),
});

export async function POST(req: Request) {
  const payload = await req.text();

  // Resend signs webhooks with Svix headers — verify against the signing
  // secret from the Resend dashboard (whsec_...). Without the secret set
  // (local dev), verification is skipped.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    try {
      new Webhook(secret).verify(payload, {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      });
    } catch {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = inboundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  if (parsed.data.type !== "email.received") {
    return NextResponse.json({ ignored: true });
  }

  const { from, to, subject, text } = parsed.data.data;
  await sendEvent({
    name: "email.inbound",
    data: {
      from,
      to: Array.isArray(to) ? (to[0] ?? "") : to,
      subject,
      text,
    },
  });
  return NextResponse.json({ ok: true });
}
