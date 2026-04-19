import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Creates a Stripe Customer Portal session. Users manage subscription,
// update payment method, download invoices, and cancel — all self-service
// (FTC "click to cancel" compliance).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No subscription to manage. Subscribe first." },
      { status: 404 }
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${origin}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Customer Portal error:", err);
    return NextResponse.json(
      {
        error:
          "Customer Portal not configured yet. Admin must enable it in Stripe Dashboard → Billing → Customer Portal.",
      },
      { status: 500 }
    );
  }
}
