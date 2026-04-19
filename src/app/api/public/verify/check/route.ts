import { NextRequest, NextResponse } from "next/server";
import { checkVerificationCode, verifyConfigured } from "@/lib/twilio-verify";
import { SignJWT } from "jose";

const SECRET = process.env.CLIENT_AUTH_SECRET ?? process.env.CRON_SECRET ?? "";
const encoder = new TextEncoder();

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

  const result = await checkVerificationCode(phone, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Invalid code" }, { status: 400 });
  }

  // Issue a short-lived signed token the booking API can trust as proof-of-verification
  if (!SECRET || SECRET.length < 16) {
    return NextResponse.json({ success: true }); // fallback — skip signing if no secret
  }
  const token = await new SignJWT({ phone, kind: "phone_verified" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(encoder.encode(SECRET));

  return NextResponse.json({ success: true, token });
}
