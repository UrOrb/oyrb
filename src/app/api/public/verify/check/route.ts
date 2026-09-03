import { NextRequest, NextResponse } from "next/server";
import { checkVerificationCode, verifyConfigured } from "@/lib/twilio-verify";
import { signPhoneVerificationToken } from "@/lib/client-auth";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!verifyConfigured()) {
    return NextResponse.json({ error: "Verification not configured." }, { status: 503 });
  }

  let body: { phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phone = (body.phone ?? "").trim();
  const code = (body.code ?? "").trim();
  if (!phone || !code) {
    return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
  }
  const ip = ipFromRequest(request);
  const ipCheck = await rateLimit(`verify-check:ip:${ip}`, 10, 60_000);
  const phoneCheck = await rateLimit(`verify-check:p:${phone}`, 8, 10 * 60_000);
  if (!ipCheck.ok || !phoneCheck.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts — please wait a few minutes." },
      { status: 429 },
    );
  }

  const result = await checkVerificationCode(phone, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Invalid code" }, { status: 400 });
  }

  const token = await signPhoneVerificationToken(phone);

  return NextResponse.json({ success: true, token });
}
