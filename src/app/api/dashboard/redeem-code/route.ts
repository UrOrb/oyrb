import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { isValidUnlockSelection } from "@/lib/template-access";
import { rateLimit } from "@/lib/rate-limit";

// Etsy redemption-code template unlock. Server-only: authentication and the
// business lookup use the SAME pattern as apply-template/route.ts; every
// write goes through the service-role client + the redeem_template_code()
// Postgres function (migration 063). The theme/layout are ALWAYS read from
// the code row, never from the request body.

type RedemptionCode = {
  id: string;
  code: string;
  layout_id: string | null;
  theme_id: string;
  max_redemptions: number | null;
  redemption_count: number;
  active: boolean;
  source: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Redeem is a code-guessing surface — cap attempts per user.
  const limit = await rateLimit(`redeem-code:${user.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const business = await getCurrentBusiness();
  if (!business) {
    return NextResponse.json(
      { error: "Create your site before redeeming a code." },
      { status: 409 },
    );
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // No Zod in this project (see actions.ts / apply-template/route.ts for the
  // house style) — validate by hand. Codes are stored uppercase.
  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  if (rawCode.length < 1 || rawCode.length > 64) {
    return NextResponse.json({ error: "Enter a valid code." }, { status: 400 });
  }
  const code = rawCode.toUpperCase();

  const admin = createAdminClient();

  const { data: codeRow, error: lookupError } = await admin
    .from("template_redemption_codes")
    .select(
      "id, code, layout_id, theme_id, max_redemptions, redemption_count, active, source",
    )
    .eq("code", code)
    .maybeSingle<RedemptionCode>();

  if (lookupError) {
    console.error("redeem-code: lookup failed", lookupError);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
  if (!codeRow || !codeRow.active) {
    return NextResponse.json({ error: "That code isn’t valid." }, { status: 404 });
  }
  const layoutId: string | null =
    typeof codeRow.layout_id === "string" ? codeRow.layout_id : null;
  const themeId = codeRow.theme_id;
  // Bad code config — never write an unlock the access checker would reject.
  if (!themeId || !isValidUnlockSelection(layoutId, themeId)) {
    console.error("redeem-code: code has invalid template config", {
      codeId: codeRow.id,
      layoutId,
      themeId,
    });
    return NextResponse.json(
      { error: "This code is misconfigured. Contact support." },
      { status: 500 },
    );
  }

  // Let the transaction function decide exhausted vs already_redeemed.
  // A code can be at its redemption cap and still be a valid idempotent
  // retry for the same business.
  const { data: rpcData, error: rpcError } = await admin.rpc(
    "redeem_template_code",
    {
      p_code_id: codeRow.id,
      p_user_id: user.id,
      p_business_id: business.id,
    },
  );
  if (rpcError) {
    console.error("redeem-code: redeem_template_code failed", rpcError);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }

  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  const status: string | undefined = row?.out_status;

  if (status === "not_found") {
    return NextResponse.json({ error: "That code isn’t valid." }, { status: 404 });
  }
  if (status === "exhausted") {
    return NextResponse.json(
      { error: "That code has already been fully redeemed." },
      { status: 409 },
    );
  }
  if (status === "already_redeemed") {
    return NextResponse.json(
      {
        alreadyRedeemed: true,
        theme: themeId,
        layout: layoutId,
        message: "You’ve already redeemed this code — the template is unlocked.",
      },
      { status: 200 },
    );
  }
  if (status !== "ok") {
    console.error("redeem-code: unexpected status", status);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, theme: themeId, layout: layoutId },
    { status: 200 },
  );
}
