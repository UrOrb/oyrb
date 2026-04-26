import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";

/**
 * POST /api/stripe/connect/disconnect  body: { confirm: true }
 *
 * Soft disconnect — clears OYRB's pointer to the Stripe account and
 * resets the status flags. We do NOT delete the underlying Stripe
 * account. That account is the pro's property: they can re-link it
 * later, fully delete it from dashboard.stripe.com, or use it with
 * another platform. If they re-link via OYRB, we create a NEW account
 * (the orphan stays in their account list).
 *
 * Confirmation gate is a defense against accidental clicks — the UI
 * shows a confirm dialog but the API enforces it server-side too.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { confirm?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Confirmation required. Send { confirm: true }." },
      { status: 400 }
    );
  }

  const business = await getCurrentBusiness();
  if (!business) {
    return NextResponse.json({ error: "No active business" }, { status: 400 });
  }
  if (business.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("businesses")
    .update({
      stripe_connect_account_id: null,
      stripe_connect_onboarding_complete: false,
      stripe_connect_charges_enabled: false,
      stripe_connect_payouts_enabled: false,
      stripe_connect_details_submitted: false,
      stripe_connect_requirements_currently_due: null,
    })
    .eq("id", business.id);

  if (error) {
    console.error("Disconnect failed:", error);
    return NextResponse.json({ error: "Could not disconnect" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
