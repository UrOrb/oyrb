// Resend inbound email webhook → Chronicle (email.inbound event).
// Route handlers are for webhooks ONLY; all user mutations are Server
// Actions (CLAUDE.md hard rule).
import { createHmac, timingSafeEqual } from "node:crypto";

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

// Resend signs webhooks with svix: HMAC-SHA256 over `${id}.${timestamp}.${body}`
// keyed by the base64 secret after the `whsec_` prefix. The svix-signature
// header may hold several space-separated `v1,<base64>` entries (key rotation).
function verifySvix(secret: string, headers: Headers, payload: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false; // replay window

  const key = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice(6) : secret,
    "base64",
  );
  const expected = Buffer.from(
    createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64"),
  );
  return signatures.split(" ").some((entry) => {
    const sig = Buffer.from(entry.split(",")[1] ?? "");
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

export async function POST(req: Request) {
  const body = await req.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret && !verifySvix(secret, req.headers, body)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const parsed = inboundSchema.safeParse(json);
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
