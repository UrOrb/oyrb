import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Creates a Stripe Customer Portal session. Users manage subscription,
// update payment method, download invoices, and cancel — all self-service
// (FTC "click to cancel" compliance).
//
// Accepts both GET and POST so a plain <Link href="/api/stripe/portal">
// from the Settings page works (GET, issues a 302 to the portal URL) and
// a fetch("...", { method: "POST" }) from the Settings form also works
// (POST, returns { url } JSON for the client to follow).
export async function GET(request: NextRequest) {
  const result = await createPortalSession(request);
  if ("error" in result) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings?portal_error=${encodeURIComponent(result.error)}`, request.url)
    );
  }
  return NextResponse.redirect(result.url);
}

export async function POST(request: NextRequest) {
  const result = await createPortalSession(request);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }
  return NextResponse.json({ url: result.url });
}

async function createPortalSession(request: NextRequest): Promise<
  | { url: string }
  | { error: string; status?: number }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized", status: 401 };

  const { data: business } = await supabase
    .from("businesses")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business?.stripe_customer_id) {
    return { error: "No subscription to manage. Subscribe first.", status: 404 };
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${origin}/dashboard/settings`,
    });
    return { url: session.url };
  } catch (err) {
    console.error("Customer Portal error:", err);
    return {
      error:
        "Customer Portal not configured yet. Admin must enable it in Stripe Dashboard → Billing → Customer Portal.",
      status: 500,
    };
  }
}
