import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { TEMPLATE_THEMES, LAYOUT_TYPES } from "@/lib/template-themes";

const VALID_LAYOUTS = new Set<string>(LAYOUT_TYPES.map((l) => l.id));

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { layout?: string | null; theme?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (body.layout && VALID_LAYOUTS.has(body.layout)) {
    update.template_layout = body.layout;
  }
  if (body.theme && TEMPLATE_THEMES[body.theme]) {
    update.template_theme = body.theme;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to apply" }, { status: 400 });
  }

  // Scope to the active site only. Matching on owner_id alone restyled
  // EVERY site the user owns — reachable whenever a multi-site pro still
  // has a stale oyrb_pending_template in localStorage from signup. The
  // post-signup case (one business, no cookie) resolves to that first
  // business, so the original flow is unchanged.
  const business = await getCurrentBusiness();
  if (!business) {
    return NextResponse.json({ error: "No site to apply to" }, { status: 404 });
  }

  const { error } = await supabase
    .from("businesses")
    .update(update)
    .eq("id", business.id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, applied: update });
}
