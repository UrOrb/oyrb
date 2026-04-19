import { createClient } from "@/lib/supabase/server";
import { TIERS, siteAllowance, type Tier, type BillingCycle } from "@/lib/plans";

export type AccountSubscription = {
  user_id: string;
  tier: Tier;
  billing_cycle: BillingCycle;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_addon_item_id: string | null;
  addon_count: number;
  status: "active" | "trialing" | "past_due" | "cancelled" | "incomplete";
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountSummary = {
  subscription: AccountSubscription | null;
  /** Sites the user owns (excludes archived). */
  siteCount: number;
  /** sites_included + addon_count, capped at tier siteCap. */
  allowance: number;
  /** True when at the cap and on the highest tier OR can't add via add-on. */
  atCap: boolean;
  /** True when the user can add another site without buying an add-on. */
  withinIncluded: boolean;
  /** True when the user can buy a $20 add-on right now. */
  canBuyAddon: boolean;
};

export async function getAccountSummary(): Promise<AccountSummary | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: sub }, { count: siteCount }] = await Promise.all([
    supabase
      .from("account_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("archived_at", null),
  ]);

  if (!sub) {
    return {
      subscription: null,
      siteCount: siteCount ?? 0,
      allowance: 0,
      atCap: true,
      withinIncluded: false,
      canBuyAddon: false,
    };
  }

  const subscription = sub as AccountSubscription;
  const tierSpec = TIERS[subscription.tier];
  const allowance = siteAllowance(subscription.tier, subscription.addon_count);
  const count = siteCount ?? 0;

  return {
    subscription,
    siteCount: count,
    allowance,
    atCap: count >= tierSpec.siteCap,
    withinIncluded: count < tierSpec.sitesIncluded,
    canBuyAddon:
      subscription.tier !== "starter" && count < tierSpec.siteCap && subscription.status === "active",
  };
}
