import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode, verifyConfigured } from "@/lib/twilio-verify";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!verifyConfigured()) {
    return NextResponse.json(
      { error: "Phone verification isn't configured yet. Please continue without it." },
      { status: 503 }
    );
  }

  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = (body.phone ?? "").trim();
  if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 });

  // Each SMS Twilio sends costs real money. Cap by IP and by phone number so
  // an attacker can't loop through numbers from one IP or hammer one number.
  const ip = ipFromRequest(request);
  const ipCheck = rateLimit(`verify:ip:${ip}`, 5, 60_000);
  const phoneCheck = rateLimit(`verify:p:${phone}`, 3, 10 * 60_000);
  if (!ipCheck.ok || !phoneCheck.ok) {
    return NextResponse.json(
      { error: "Too many verification requests — please wait a few minutes." },
      { status: 429 }
    );
  }

  const result = await sendVerificationCode(phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Couldn't send code" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
