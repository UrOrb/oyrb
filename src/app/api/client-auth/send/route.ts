import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { signMagicToken } from "@/lib/client-auth";
import { resend } from "@/lib/email";

const FROM = process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("email", email);

  // Always claim success even if no bookings found (prevents email enumeration)
  if (!count || count === 0) {
    return NextResponse.json({ success: true });
  }

  if (!resend) {
    console.warn("Resend not configured — skipping magic link email");
    return NextResponse.json({ success: true });
  }

  const token = await signMagicToken(email);
  const link = `${APP_URL}/api/client-auth/callback?token=${encodeURIComponent(token)}`;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Your sign-in link for OYRB",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Sign in</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">Your sign-in link is ready</h1>
          <p style="color:#525252;font-size:15px;line-height:1.5;margin:0 0 20px;">Click below to see your upcoming and past appointments. This link works once and expires in 20 minutes.</p>
          <a href="${link}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:14px;font-weight:600;margin:8px 0 24px;">View my bookings</a>
          <p style="color:#A3A3A3;font-size:12px;margin:24px 0 0;border-top:1px solid #E7E5E4;padding-top:16px;">If you didn't request this, you can safely ignore this email. No account changes will be made.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Magic link email failed:", err);
  }

  return NextResponse.json({ success: true });
}
