import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode, verifyConfigured } from "@/lib/twilio-verify";

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

  const result = await sendVerificationCode(phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Couldn't send code" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
