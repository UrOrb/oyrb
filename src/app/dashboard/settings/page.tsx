import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";
import { PlanChangeForm } from "./plan-change-form";
import { EndTrialButton } from "./end-trial-button";
import { GoalForm } from "./goal-form";
import { IdentityCard } from "./identity-card";
import { PublicStatsCard } from "./public-stats-card";
import { getCurrentBusiness } from "@/lib/current-site";
import { getAccountSummary } from "@/lib/account";
import { ensureGoalSettings } from "@/lib/goal-tracking";
import { getReputationStats } from "@/lib/reputation-stats";
import {
  TIERS,
  ADDON_MONTHLY_CENTS,
  ADDON_ANNUAL_CENTS,
  fmtMoney,
  fmtPriceLabel,
} from "@/lib/plans";

interface Props {
  searchParams: Promise<{ siteId?: string; identity?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId, identity: identityParam } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  const account = await getAccountSummary();
  const goalSettings = await ensureGoalSettings(user.id);

  // Phase 2.3 — fetch reputation stats for the preview card. We always
  // compute these (even when the toggle is off) so flipping the toggle
  // on shows a fully-populated preview without a roundtrip. The
  // helper returns null when sample size is insufficient — the
  // preview then renders the "Earning trust" empty state.
  const reputationStats = business
    ? await getReputationStats(business.id)
    : null;

  // Fresh read for the identity columns — getCurrentBusiness's snapshot
  // may not reflect the latest webhook-applied state.
  const identityRow = business
    ? await supabase
        .from("businesses")
        .select(
          "identity_verification_status, identity_verified_at, identity_last_attempted_at",
        )
        .eq("id", business.id)
        .maybeSingle()
        .then((r) => r.data as {
          identity_verification_status: string | null;
          identity_verified_at: string | null;
          identity_last_attempted_at: string | null;
        } | null)
    : null;

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

      {/* Booking rules — link card */}
      <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div>
          <h2 className="text-base font-semibold">Booking rules</h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Control slot intervals, last-minute cutoff, break time, and
            recurring daily blocks. Applies to new bookings only.
          </p>
        </div>
        <Link
          href="/dashboard/settings/booking-rules"
          className="shrink-0 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
        >
          Edit rules →
        </Link>
      </div>

      {/* Exports — link card. Phase 8 PR 1 ships contacts CSV; bookings
          and income land in follow-up PRs against the same page. */}
      <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div>
          <h2 className="text-base font-semibold">Exports</h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Download your data as portable CSV files — contacts today,
            bookings and income coming next. Reachable even if billing
            lapses or your storefront is paused.
          </p>
        </div>
        <Link
          href="/dashboard/settings/exports"
          className="shrink-0 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
        >
          Open exports →
        </Link>
      </div>

      {/* Directory listing — link card */}
      <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div>
          <h2 className="text-base font-semibold">Directory Listing</h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Opt in to the public OYRB beauty-pro directory at{" "}
            <code className="text-[#0A0A0A]">oyrb.space/find</code>. Choose exactly
            what clients see; remove yourself anytime.
          </p>
        </div>
        <Link
          href="/dashboard/directory"
          className="shrink-0 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
        >
          Manage listing →
        </Link>
      </div>

      {/* Phase 2.3 — public reputation stats opt-in. Sits next to the
          Directory Listing card because both control public-visibility
          surfaces. */}
      <PublicStatsCard
        initialEnabled={!!business.public_stats_enabled}
        stats={reputationStats}
      />

      {/* Identity verification — optional Stripe-hosted ID check. The
          ✓ Verified badge lights up on the storefront on success. Never
          a gate; status display only. */}
      <IdentityCard
        status={(identityRow?.identity_verification_status ?? "none") as
          | "none" | "pending" | "verified" | "requires_input" | "failed"}
        verifiedAt={identityRow?.identity_verified_at ?? null}
        lastAttemptedAt={identityRow?.identity_last_attempted_at ?? null}
        showProcessingBanner={identityParam === "processing"}
      />

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

      {/* Remove Brand (Phase 8 PR 4) — link-card with neutral
          treatment, amber-on-hover. Replaces the in-form Danger Zone
          that previously called deleteAccount directly. The destructive
          moment lives on its own page so Settings stays calm. mt-16
          (not mt-8) puts deliberate distance between this and Goal
          Tracking — physical distance does part of the demotion. */}
      <div className="mt-16 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#525252]">
              Remove your brand
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
              Start a 14-day removal window. Your storefront comes down
              today; your account deletes after 14 days. Restorable any
              time before then.
            </p>
          </div>
          <Link
            href="/dashboard/settings/remove-brand"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]"
          >
            <span className="group-hover:underline group-hover:decoration-amber-700 group-hover:underline-offset-4">
              Remove brand
            </span>
            <span aria-hidden>→</span>
          </Link>
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
