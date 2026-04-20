import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { PlanChangeForm } from "./plan-change-form";
import { EndTrialButton } from "./end-trial-button";
import { GoalForm } from "./goal-form";
import { getCurrentBusiness } from "@/lib/current-site";
import { getAccountSummary } from "@/lib/account";
import { ensureGoalSettings } from "@/lib/goal-tracking";
import {
  TIERS,
  ADDON_MONTHLY_CENTS,
  ADDON_ANNUAL_CENTS,
  fmtMoney,
  fmtPriceLabel,
} from "@/lib/plans";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  const account = await getAccountSummary();
  const goalSettings = await ensureGoalSettings(user.id);

  if (!business) {
    return (
      <div>
        <h1 className="font-display text-2xl font-medium">Settings</h1>
        <p className="mt-4 text-sm text-[#737373]">Complete checkout first to access settings.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-[#737373]">Account info, domain, billing, and preferences.</p>

      {account?.subscription && <BillingPanel summary={account} />}

      <div className="mt-8">
        <SettingsForm
          business={{
            id: business.id,
            business_name: business.business_name,
            subscription_tier: business.subscription_tier,
            custom_domain: business.custom_domain ?? null,
            custom_domain_verified: !!business.custom_domain_verified,
          }}
          userEmail={user.email ?? ""}
        />
      </div>

      {/* Goal tracking — lives at anchor #goal so the dashboard's "Edit"
          link jumps straight here. */}
      <div id="goal" className="mt-8 scroll-mt-20 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-base font-semibold">Goal Tracking</h2>
        <p className="mt-0.5 text-xs text-[#737373]">
          Set a monthly income target and choose what counts toward it. Progress is calculated across
          all the sites you own; resets at the start of each UTC month.
        </p>
        <div className="mt-5">
          <GoalForm initial={goalSettings} />
        </div>
      </div>
    </div>
  );
}

function BillingPanel({ summary }: { summary: NonNullable<Awaited<ReturnType<typeof getAccountSummary>>> }) {
  const sub = summary.subscription!;
  const tier = TIERS[sub.tier];
  const cycle = sub.billing_cycle;
  const planCents = cycle === "monthly" ? tier.monthlyPriceCents : tier.annualPriceCents;
  const addonUnitCents = cycle === "monthly" ? ADDON_MONTHLY_CENTS : ADDON_ANNUAL_CENTS;
  const addonTotalCents = addonUnitCents * sub.addon_count;
  const totalCents = planCents + addonTotalCents;
  const renewalDate = sub.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const cycleLabel = cycle === "monthly" ? "Monthly" : "Annual";
  const cycleSuffix = cycle === "monthly" ? "/mo" : "/yr";

  return (
    <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Billing</h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Current plan, sites, and renewal.
          </p>
        </div>
        {sub.status !== "active" && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              sub.status === "past_due"
                ? "bg-red-100 text-red-700"
                : "bg-[#FAFAF9] text-[#737373]"
            }`}
          >
            {sub.status === "past_due" ? "Past due — update payment method" : sub.status}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-[#FAFAF9] px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3]">Plan</p>
          <p className="mt-1 text-sm font-semibold">{tier.name} · {cycleLabel}</p>
          <p className="text-xs text-[#737373]">{fmtMoney(planCents)}{cycleSuffix}</p>
        </div>
        <div className="rounded-md bg-[#FAFAF9] px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3]">Sites</p>
          <p className="mt-1 text-sm font-semibold">
            {summary.siteCount} of {summary.allowance} used
          </p>
          <p className="text-xs text-[#737373]">
            Plan cap: {tier.siteCap}{" "}
            {sub.tier !== "starter" &&
              `· add-ons used: ${sub.addon_count}/${tier.siteCap - tier.sitesIncluded}`}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3]">Line items</p>
        <ul className="mt-2 divide-y divide-[#F0EFEC] rounded-md border border-[#E7E5E4]">
          <li className="flex items-center justify-between px-4 py-2 text-sm">
            <span>{tier.name} plan ({cycleLabel.toLowerCase()})</span>
            <span className="font-medium">{fmtMoney(planCents)}{cycleSuffix}</span>
          </li>
          {sub.addon_count > 0 && (
            <li className="flex items-center justify-between px-4 py-2 text-sm">
              <span>
                Additional sites × {sub.addon_count}{" "}
                <span className="text-xs text-[#A3A3A3]">
                  ({fmtPriceLabel(addonUnitCents, cycle)} each)
                </span>
              </span>
              <span className="font-medium">{fmtMoney(addonTotalCents)}{cycleSuffix}</span>
            </li>
          )}
          <li className="flex items-center justify-between bg-[#FAFAF9] px-4 py-2 text-sm font-semibold">
            <span>Total</span>
            <span>{fmtMoney(totalCents)}{cycleSuffix}</span>
          </li>
        </ul>
      </div>

      {sub.status === "trialing" && (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-semibold">You&rsquo;re currently in your 14-day free trial.</p>
          <p className="mt-1">
            Your card will be charged {fmtMoney(planCents + addonTotalCents)}{cycleSuffix} on{" "}
            <span className="font-semibold">{renewalDate}</span>. Add-on sites are
            disabled during the trial — skip the trial to start using multiple
            sites today.
          </p>
          <div className="mt-3">
            <EndTrialButton />
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#737373]">
        <p>Next charge: <span className="font-semibold text-[#0A0A0A]">{renewalDate}</span></p>
        <div className="flex gap-2">
          <PlanChangeForm
            currentTier={sub.tier}
            currentCycle={cycle}
            currentSites={summary.siteCount}
            currentAddons={sub.addon_count}
          />
          <Link
            href="/api/stripe/portal"
            className="rounded-md bg-[#0A0A0A] px-3 py-1.5 font-medium text-white hover:opacity-85"
          >
            Manage in Stripe →
          </Link>
        </div>
      </div>
    </div>
  );
}
