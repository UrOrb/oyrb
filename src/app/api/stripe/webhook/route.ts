import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

const TIER_MAP: Record<string, string> = {
  [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
  [process.env.STRIPE_PRICE_STUDIO ?? ""]: "studio",
  [process.env.STRIPE_PRICE_SCALE ?? ""]: "scale",
};

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const tier = session.metadata?.tier;
      const addNewSite = session.metadata?.add_new_site === "true";

      if (!userId || !tier) break;

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? "";

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? "";

      // The user already has at least one business — only update the
      // existing row when this is the *first* checkout. Subsequent purchases
      // (add_new_site=true) always insert a new business owned by the same
      // user, each tied to its own Stripe subscription.
      const { data: existingRows } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", userId);
      const isFirst = !existingRows || existingRows.length === 0;

      if (!isFirst && !addNewSite) {
        // Re-purchase / upgrade on the original site.
        await supabase
          .from("businesses")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_tier: tier,
            subscription_status: "active",
          })
          .eq("owner_id", userId)
          .eq("id", existingRows![0].id);
      } else {
        // First checkout OR explicit add-new-site purchase → insert a new
        // business row tied to its own subscription.
        const { data: { user } } = await supabase.auth.admin.getUserById(userId);
        const baseSlug = (user?.email?.split("@")[0] ?? "studio")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-");

        const featuredUntil = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        const seq = (existingRows?.length ?? 0) + 1;
        const defaultName = isFirst
          ? user?.user_metadata?.full_name ?? "My Studio"
          : `${user?.user_metadata?.full_name ?? "My Studio"} #${seq}`;

        await supabase.from("businesses").insert({
          owner_id: userId,
          business_name: defaultName,
          slug: `${baseSlug}-${Date.now().toString(36)}`,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_tier: tier,
          subscription_status: "active",
          is_featured: true,
          featured_until: featuredUntil,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id ?? "";
      const tier = TIER_MAP[priceId] ?? "starter";

      // One customer can own multiple subscriptions (one per site). Only
      // touch the business whose subscription_id matches.
      await supabase
        .from("businesses")
        .update({
          subscription_status: sub.status === "active" ? "active" : sub.status,
          subscription_tier: tier,
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("businesses")
        .update({ subscription_status: "cancelled" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
