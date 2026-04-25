import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { refreshAccountStatus } from "@/lib/stripe-connect";

/**
 * GET /api/stripe/connect/return?biz=<id>
 *
 * Stripe redirects here after the pro finishes (or abandons mid-flow)
 * the hosted onboarding. We refresh the account status, write the latest
 * flags back to our row, and bounce the user to /dashboard/payments where
 * the UI reflects the new state.
 *
 * Auth: must be signed in AND own the business — same browser, same
 * session that started onboarding.
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

  if (!biz || biz.owner_id !== user.id) {
    return NextResponse.redirect(new URL("/dashboard/payments?err=not_found", url));
  }
  if (!biz.stripe_connect_account_id) {
    return NextResponse.redirect(new URL("/dashboard/payments?err=no_account", url));
  }

  try {
    await refreshAccountStatus({
      businessId: biz.id,
      accountId: biz.stripe_connect_account_id,
    });
  } catch (err) {
    console.error("refreshAccountStatus failed:", err);
    return NextResponse.redirect(new URL("/dashboard/payments?err=refresh_failed", url));
  }

  return NextResponse.redirect(new URL("/dashboard/payments?onboarded=1", url));
}
