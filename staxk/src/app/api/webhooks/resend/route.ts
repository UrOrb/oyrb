// Resend inbound email webhook → Chronicle (email.inbound event).
// Route handlers are for webhooks ONLY; all user mutations are Server
// Actions (CLAUDE.md hard rule).
import { NextResponse } from "next/server";
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
  // Shared-secret check; swap for svix signature verification when the
  // dashboard secret is configured.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const parsed = inboundSchema.safeParse(await req.json());
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
