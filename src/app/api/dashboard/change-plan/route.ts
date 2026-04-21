import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe, priceIdFor } from "@/lib/stripe";
import { TIERS, type Tier, type BillingCycle } from "@/lib/plans";
import { getAccountSummary } from "@/lib/account";

/**
 * In-app plan / billing-cycle change. Server-side cap enforcement: if the
 * new tier's siteCap is below the user's current site count, the request is
 * rejected with a list of how many sites they need to archive first.
 *
 *   POST { tier: "starter" | "studio" | "scale", cycle: "monthly" | "annual" }
 *
 * On success the user's Stripe subscription is mutated (price swapped, with
 * proration); the webhook reconciles account_subscriptions. Add-on items are
 * left in place — Stripe will continue billing them through the normal cycle.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { tier?: Tier; cycle?: BillingCycle };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tier = body.tier;
  const cycle = body.cycle ?? "monthly";
  if (!tier || (tier !== "starter" && tier !== "studio" && tier !== "scale")) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (cycle !== "monthly" && cycle !== "annual") {
    return NextResponse.json({ error: "Invalid billing cycle" }, { status: 400 });
  }

  const summary = await getAccountSummary();
  if (!summary?.subscription) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const newCap = TIERS[tier].siteCap;
  const sites = summary.siteCount;

  // Enforce the cap. Starter has cap 1 — if you have 3 sites you must archive
  // 2 first. Same logic for any other downgrade.
  if (sites > newCap) {
    const overflow = sites - newCap;
    return NextResponse.json(
      {
        error: `Can't downgrade to ${TIERS[tier].name}: it only allows ${newCap} site${newCap === 1 ? "" : "s"}, and you currently have ${sites}. Archive or delete ${overflow} site${overflow === 1 ? "" : "s"} first, then try again.`,
        code: "downgrade_blocked_by_sites",
        currentSites: sites,
        newCap,
      },
      { status: 409 }
    );
  }

  // Studio→Starter or Scale→Studio: addon_count must also fit. The new tier's
  // headroom is (newCap - sitesIncluded). If the user has more add-ons than
  // that, Stripe would keep billing them — refuse.
  const newHeadroom = newCap - TIERS[tier].sitesIncluded;
  if (summary.subscription.addon_count > newHeadroom) {
    const drop = summary.subscription.addon_count - newHeadroom;
    return NextResponse.json(
      {
        error: `Can't downgrade to ${TIERS[tier].name}: you have ${summary.subscription.addon_count} add-on site${summary.subscription.addon_count === 1 ? "" : "s"} but ${TIERS[tier].name} only supports ${newHeadroom}. Archive ${drop} site${drop === 1 ? "" : "s"} first.`,
        code: "downgrade_blocked_by_addons",
      },
      { status: 409 }
    );
  }

  // Mutate the Stripe subscription. Find the existing base-plan item and
  // swap its price to the new (tier, cycle) price; leave add-on items alone
  // (or update their cycle if the user is also switching cycles — Stripe
  // requires all items on a subscription to share the same interval).
  try {
    const sub = await stripe.subscriptions.retrieve(summary.subscription.stripe_subscription_id, {
      expand: ["items.data.price"],
    });

    const newPlanPriceId = priceIdFor(tier, cycle);
    const items: Array<{ id: string; price: string }> = [];

    for (const item of sub.items.data) {
      const priceId = item.price?.id ?? "";
      const interval = item.price?.recurring?.interval;
      const isCurrentBasePlan =
        !!priceId &&
        priceId !== process.env.STRIPE_PRICE_ADDON_SITE_MONTHLY &&
        priceId !== process.env.STRIPE_PRICE_ADDON_SITE_ANNUAL;

      if (isCurrentBasePlan) {
        items.push({ id: item.id, price: newPlanPriceId });
      } else if (interval && cycle === "annual" && interval !== "year") {
        // Switching to annual — addon item must move to the annual price.
        items.push({ id: item.id, price: process.env.STRIPE_PRICE_ADDON_SITE_ANNUAL! });
      } else if (interval && cycle === "monthly" && interval !== "month") {
        items.push({ id: item.id, price: process.env.STRIPE_PRICE_ADDON_SITE_MONTHLY! });
      }
    }

    await stripe.subscriptions.update(summary.subscription.stripe_subscription_id, {
      items: items.map((i) => ({ id: i.id, price: i.price })),
      proration_behavior: "create_prorations",
      metadata: {
        ...sub.metadata,
        tier,
        billing_cycle: cycle,
      },
    });

    // Optimistic local sync — webhook will confirm.
    const admin = createAdminClient();
    await admin
      .from("account_subscriptions")
      .update({ tier, billing_cycle: cycle, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  } catch (err) {
    console.error("Plan change failed:", err);
    return NextResponse.json(
      { error: "Couldn't update your plan. Please try again or contact support." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
