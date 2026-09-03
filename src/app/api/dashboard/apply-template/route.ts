import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import {
  ALL_LAYOUT_IDS,
  canUseTemplate,
  fallbackThemeForAccess,
  isValidTemplateSelection,
} from "@/lib/template-access";
import { loadTemplateUnlocks } from "@/lib/template-access-server";

const VALID_LAYOUTS = new Set<string>(ALL_LAYOUT_IDS);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const business = await getCurrentBusiness();
  if (!business) return NextResponse.json({ error: "No business found" }, { status: 404 });

  let body: { layout?: string | null; theme?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, string> = {};
  const currentLayout = business.template_layout === "zip" ? "original" : business.template_layout;
  const nextLayout = body.layout && VALID_LAYOUTS.has(body.layout) ? body.layout : currentLayout;
  const requestedTheme = body.theme ?? business.template_theme;
  const templateUnlocks = await loadTemplateUnlocks(supabase, user.id, business.id);

  if (body.layout && VALID_LAYOUTS.has(body.layout)) {
    update.template_layout = nextLayout;
  }
  if (body.theme && isValidTemplateSelection(nextLayout, body.theme)) {
    if (!canUseTemplate({
      tier: business.subscription_tier,
      layout: nextLayout,
      theme: body.theme,
      unlocks: templateUnlocks,
    })) {
      return NextResponse.json({ error: "Template not available on your plan" }, { status: 403 });
    }
    update.template_theme = body.theme;
  } else if (body.layout && requestedTheme) {
    update.template_theme = fallbackThemeForAccess(
      business.subscription_tier,
      nextLayout,
      requestedTheme,
      templateUnlocks,
    );
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to apply" }, { status: 400 });
  }

  const { error } = await supabase
    .from("businesses")
    .update(update)
    .eq("id", business.id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, applied: update });
}
