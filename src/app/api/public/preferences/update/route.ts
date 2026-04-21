import { NextRequest, NextResponse } from "next/server";
import { resolveToken } from "@/lib/booking-tokens";
import { upsertPreferences } from "@/lib/comm-preferences";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const limit = rateLimit(`prefs:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let body: {
    token?: string;
    rebook_reminders_enabled?: boolean;
    marketing_enabled?: boolean;
    unsubscribe_all?: boolean;
    request_deletion?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  await upsertPreferences(resolved.clientEmail, {
    rebookRemindersEnabled: body.rebook_reminders_enabled,
    marketingEnabled: body.marketing_enabled,
    unsubscribeAll: body.unsubscribe_all,
    requestDataDeletion: body.request_deletion,
  });

  return NextResponse.json({ ok: true });
}
