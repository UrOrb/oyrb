import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { stripe, addonPriceIdFor } from "@/lib/stripe";
import { TIERS } from "@/lib/plans";
import { getAccountSummary } from "@/lib/account";

/**
 * Provisions another site for the signed-in user.
 *
 *   mode: "included" → user has free slots remaining; just create the row.
 *   mode: "addon"    → user has used their included slots and is paying the
 *                      $20/mo (or $200/yr) add-on. Bump the addon line item
 *                      on their existing Stripe subscription, then create
 *                      the row. Stripe handles proration.
 *
 * Both branches enforce the tier's hard cap server-side; the dashboard UI
 * is just a hint, never a guarantee.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { mode?: "included" | "addon" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const summary = await getAccountSummary();
  if (!summary?.subscription) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }
  const sub = summary.subscription;
  const tierSpec = TIERS[sub.tier];

  // Hard cap — no matter the mode.
  if (summary.siteCount >= tierSpec.siteCap) {
    return NextResponse.json(
      { error: `Your ${tierSpec.name} plan caps out at ${tierSpec.siteCap} sites.` },
      { status: 403 }
    );
  }

  const mode = body.mode ?? (summary.withinIncluded ? "included" : "addon");

  // included → just provision the row.
  if (mode === "included") {
    if (!summary.withinIncluded) {
      return NextResponse.json(
        { error: "You've used your plan's included sites — try again with the add-on flow." },
        { status: 400 }
      );
    }
    const newId = await provisionSite(user.id);
    return NextResponse.json({ siteId: newId, charged: false });
  }

  // addon → only Studio / Scale, only when not over the cap, only when payment is current.
  if (sub.tier === "starter") {
    return NextResponse.json(
      { error: "Add-on sites aren't available on Starter — please upgrade." },
      { status: 403 }
    );
  }
  if (sub.status !== "active") {
    return NextResponse.json(
      { error: "Your subscription isn't active — please update billing first." },
      { status: 402 }
    );
  }

  // Mutate the Stripe subscription: either bump the existing addon item's
  // quantity by 1, or attach a new addon item if this is the user's first
  // add-on. Stripe will issue a prorated invoice automatically.
  try {
    const cycle = sub.billing_cycle;
    const addonPrice = addonPriceIdFor(cycle);

    if (sub.stripe_addon_item_id) {
      // Bump quantity.
      const item = await stripe.subscriptionItems.retrieve(sub.stripe_addon_item_id);
      await stripe.subscriptionItems.update(sub.stripe_addon_item_id, {
        quantity: (item.quantity ?? 0) + 1,
        proration_behavior: "create_prorations",
      });
    } else {
      // Attach a fresh add-on line item with quantity 1, save its id.
      const created = await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: addonPrice,
        quantity: 1,
        proration_behavior: "create_prorations",
      });
      const admin = createAdminClient();
      await admin
        .from("account_subscriptions")
        .update({ stripe_addon_item_id: created.id })
        .eq("user_id", user.id);
    }
  } catch (err) {
    console.error("Stripe addon update failed:", err);
    return NextResponse.json(
      { error: "Couldn't update your subscription. Please try again or contact support." },
      { status: 502 }
    );
  }

  // The webhook will reconcile addon_count from the subscription event, but
  // we also bump it here so the dashboard reflects the new allowance the
  // moment the user lands. Webhook is idempotent.
  const admin = createAdminClient();
  await admin
    .from("account_subscriptions")
    .update({ addon_count: sub.addon_count + 1 })
    .eq("user_id", user.id);

  const newId = await provisionSite(user.id);
  return NextResponse.json({ siteId: newId, charged: true });
}

async function provisionSite(userId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: { user } } = await admin.auth.admin.getUserById(userId);
  const baseSlug = (user?.email?.split("@")[0] ?? "studio")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  const { data: existing } = await admin
    .from("businesses")
    .select("id")
    .eq("owner_id", userId);
  const seq = (existing?.length ?? 0) + 1;
  const defaultName = seq === 1
    ? user?.user_metadata?.full_name ?? "My Studio"
    : `${user?.user_metadata?.full_name ?? "My Studio"} #${seq}`;

  const { data: inserted, error } = await admin
    .from("businesses")
    .insert({
      owner_id: userId,
      business_name: defaultName,
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      subscription_status: "active",
      is_featured: true,
      featured_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(`Failed to insert business row: ${error?.message ?? "unknown"}`);
  }
  return inserted.id;
}
