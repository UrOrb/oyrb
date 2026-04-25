import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/stripe/connect/refresh?biz=<id>
 *
 * Stripe redirects here when the AccountLink expires or the pro hits the
 * "back" / "refresh" button mid-onboarding. We mint a fresh AccountLink
 * for the same account and 302 them to it so they pick up where they
 * left off.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("biz");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/payments", url));
  }
  if (!businessId) {
    return NextResponse.redirect(new URL("/dashboard/payments", url));
  }

  const admin = createAdminClient();
  const { data: biz } = await admin
    .from("businesses")
    .select("id, owner_id, stripe_connect_account_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!biz || biz.owner_id !== user.id || !biz.stripe_connect_account_id) {
    return NextResponse.redirect(new URL("/dashboard/payments", url));
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
    const link = await stripe.accountLinks.create({
      account: biz.stripe_connect_account_id,
      refresh_url: `${appUrl}/api/stripe/connect/refresh?biz=${encodeURIComponent(biz.id)}`,
      return_url: `${appUrl}/api/stripe/connect/return?biz=${encodeURIComponent(biz.id)}`,
      type: "account_onboarding",
    });
    return NextResponse.redirect(link.url, { status: 302 });
  } catch (err) {
    console.error("Connect refresh error:", err);
    return NextResponse.redirect(new URL("/dashboard/payments?err=refresh_failed", url));
  }
}
