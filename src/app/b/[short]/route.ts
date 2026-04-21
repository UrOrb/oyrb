import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Short-URL resolver for SMS. We embed the first 12 chars of the token in
// the SMS and look up the full token by prefix. Collisions are negligible:
// 12 base64url chars = 72 bits, and we have <<2^36 tokens. If two match,
// we 404 and ask the client to use the email link instead.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ short: string }> }
) {
  const { short } = await params;
  if (!short || short.length < 8) {
    return new NextResponse("Invalid short link", { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, count } = await supabase
    .from("booking_access_tokens")
    .select("token", { count: "exact" })
    .like("token", `${short}%`)
    .gte("expires_at", new Date().toISOString())
    .limit(2);

  if (!data || data.length === 0) {
    return new NextResponse("This link has expired. Check your email for a new one.", { status: 410 });
  }
  if ((count ?? data.length) > 1) {
    return new NextResponse("Ambiguous link — open the link from your email instead.", { status: 409 });
  }

  return NextResponse.redirect(new URL(`/booking/${data[0].token}`, _req.url), 302);
}
