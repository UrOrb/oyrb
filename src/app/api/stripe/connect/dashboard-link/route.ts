import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { STRIPE_STANDARD_DASHBOARD_URL } from "@/lib/stripe-connect";

/**
 * POST /api/stripe/connect/dashboard-link
 *
 * Returns the URL the pro should open to manage their Stripe account.
 *
 * NOTE: Stripe Standard accounts have NO programmatic magic-login links
 * (createLoginLink is Express-only). Pros sign in to dashboard.stripe.com
 * directly with their own Stripe email/password — exactly the same login
 * they used during onboarding. We expose this as an endpoint anyway so
 * the dashboard frontend doesn't have to hardcode the URL and so we can
 * later swap implementations (e.g. if we add Express tiers) without
 * touching the UI.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const business = await getCurrentBusiness();
  if (!business) {
    return NextResponse.json({ error: "No active business" }, { status: 400 });
  }
  if (business.owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const accountId = (business as unknown as {
    stripe_connect_account_id: string | null;
  }).stripe_connect_account_id;

  if (!accountId) {
    return NextResponse.json(
      { error: "No Stripe account linked yet" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    url: STRIPE_STANDARD_DASHBOARD_URL,
    note: "Sign in with the email/password you used during Stripe onboarding.",
  });
}
