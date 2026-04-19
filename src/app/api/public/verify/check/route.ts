import { NextRequest, NextResponse } from "next/server";
import { checkVerificationCode, verifyConfigured } from "@/lib/twilio-verify";
import { SignJWT } from "jose";

// Dedicated secret only — do not fall back to CRON_SECRET. See lib/client-auth.ts.
const SECRET = process.env.CLIENT_AUTH_SECRET ?? "";
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
  if (!SECRET || SECRET.length < 32) {
    // Without a strong secret we can't issue a trustworthy proof-of-verification
    // token. Fail loud so the booking pipeline can decide what to do; do not
    // silently degrade to "success without token" — that would mean the
    // downstream booking endpoint accepts unverified phones as verified.
    return NextResponse.json(
      { error: "Server missing CLIENT_AUTH_SECRET (>= 32 chars). Please contact support." },
      { status: 500 }
    );
  }
  const token = await new SignJWT({ phone, kind: "phone_verified" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(encoder.encode(SECRET));

  return NextResponse.json({ success: true, token });
}
