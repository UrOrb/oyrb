import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import { reportListing } from "@/app/dashboard/directory/actions";
import { DIRECTORY_AGREEMENT_VERSION } from "@/lib/directory";

// Rate limit: max 6 reports per IP per minute to prevent brigading.
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const rl = rateLimit(`report:${ip}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many reports — slow down." }, { status: 429 });
  }

  let body: { slug?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const reason = (body.reason ?? "").trim();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  // Resolve slug → user_id using the admin client (anon RLS can't read
  // non-live rows, and we don't want to require the listing be live for
  // a report to land).
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("directory_listings")
    .select("user_id")
    .eq("slug", slug)
    .eq("agreement_version", DIRECTORY_AGREEMENT_VERSION)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const result = await reportListing(row.user_id as string, reason, ip);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
