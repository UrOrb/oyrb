import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_SITE_COOKIE } from "@/lib/current-site";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { siteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const siteId = body.siteId;
  if (!siteId) return NextResponse.json({ error: "Missing siteId" }, { status: 400 });

  // Confirm ownership before persisting the cookie.
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", siteId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!biz) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const jar = await cookies();
  jar.set(ACTIVE_SITE_COOKIE, siteId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return NextResponse.json({ ok: true });
}
