import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";

/**
 * POST /api/stripe/connect/onboard
 *
 * Starts the Stripe Connect (Standard) onboarding flow for the current
 * business. Idempotent: if the business already has a stripe_connect_account_id
 * but hasn't completed onboarding, we re-use the same account and just
 * mint a fresh AccountLink instead of creating a duplicate account.
 *
 * Response: { url: string } — the Stripe-hosted onboarding URL the
 * client should redirect to.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "Account is missing an email" }, { status: 400 });
    }

    const business = await getCurrentBusiness();
    if (!business) {
      return NextResponse.json({ error: "No active business" }, { status: 400 });
    }
    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const admin = createAdminClient();
    let accountId =
      (business as unknown as { stripe_connect_account_id: string | null })
        .stripe_connect_account_id ?? null;

    // No account yet → create one and persist immediately so a network
    // failure on AccountLinks.create doesn't orphan a Stripe account.
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: user.email,
        country: "US",
        metadata: {
          oyrb_business_id: business.id,
          oyrb_user_id: user.id,
        },
      });
      accountId = account.id;
      const { error: upErr } = await admin
        .from("businesses")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", business.id);
      if (upErr) {
        console.error("Failed to persist stripe_connect_account_id", upErr);
        return NextResponse.json(
          { error: "Could not save Connect account; try again." },
          { status: 500 }
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/stripe/connect/refresh?biz=${encodeURIComponent(business.id)}`,
      return_url: `${appUrl}/api/stripe/connect/return?biz=${encodeURIComponent(business.id)}`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("Connect onboard error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start onboarding" },
      { status: 500 }
    );
  }
}
