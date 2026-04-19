import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAccountSummary } from "@/lib/account";
import { TIERS, ADDON_MONTHLY_CENTS, ADDON_ANNUAL_CENTS, fmtPriceLabel } from "@/lib/plans";
import { AddSiteCheckoutButton } from "./add-site-checkout-button";

export const metadata = { title: "Add a new site" };

export default async function AddNewSitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const summary = await getAccountSummary();

  // No subscription yet → kick them through normal onboarding.
  if (!summary || !summary.subscription) {
    redirect("/dashboard");
  }

  const sub = summary.subscription;
  const tier = TIERS[sub.tier];
  const cycle = sub.billing_cycle;
  const addonCents = cycle === "monthly" ? ADDON_MONTHLY_CENTS : ADDON_ANNUAL_CENTS;
  const headroomToCap = tier.siteCap - summary.siteCount;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#0A0A0A]"
      >
        ← Back to dashboard
      </Link>

      <h1 className="font-display mt-4 text-2xl font-medium tracking-tight">Add a new site</h1>
      <p className="mt-1 text-sm text-[#737373]">
        Each site is fully separate — its own template, theme, content, calendar,
        and clients. Editing one never touches another.
      </p>

      <div className="mt-6 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-[#0A0A0A]">
              You&rsquo;re on {tier.name} ({cycle === "monthly" ? "monthly" : "annual"})
            </p>
            <p className="mt-0.5 text-[#737373]">
              Sites used: {summary.siteCount} of {summary.allowance} ·
              {" "}Plan cap: {tier.siteCap}
            </p>
          </div>
          <Link href="/dashboard/settings" className="text-[#B8896B] hover:underline">
            Manage billing →
          </Link>
        </div>
      </div>

      {/* Branch on tier + cap */}
      <div className="mt-8">
        {sub.tier === "starter" ? (
          <UpgradeNeeded reason="starter" />
        ) : summary.siteCount >= tier.siteCap ? (
          sub.tier === "scale" ? (
            <CapMaxed />
          ) : (
            <UpgradeNeeded reason="capped" currentTierName={tier.name} />
          )
        ) : summary.withinIncluded ? (
          <FreeSlot
            remainingFree={tier.sitesIncluded - summary.siteCount}
          />
        ) : (
          <AddonOffer
            cycle={cycle}
            addonCents={addonCents}
            headroomToCap={headroomToCap}
          />
        )}
      </div>
    </div>
  );
}

// ── State branches ──────────────────────────────────────────────────────────

function UpgradeNeeded({
  reason,
  currentTierName,
}: {
  reason: "starter" | "capped";
  currentTierName?: string;
}) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lock size={14} className="text-[#B8896B]" />
        Upgrade your plan to add more sites
      </div>
      <p className="mt-2 text-xs text-[#737373]">
        {reason === "starter"
          ? "The Starter plan includes 1 site. Upgrade to Studio to manage 2 (and add up to 1 more), or to Scale for 3 (with 2 add-on slots)."
          : `${currentTierName} is at its site cap. Upgrade to Scale to add up to 5 total sites.`}
      </p>
      <Link
        href="/pricing"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
      >
        See plans <ArrowRight size={12} />
      </Link>
    </div>
  );
}

function CapMaxed() {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <p className="text-sm font-semibold">You&rsquo;ve reached the maximum number of sites.</p>
      <p className="mt-2 text-xs text-[#737373]">
        Scale tops out at 5 sites. To free up a slot, archive or delete one of
        your existing sites from its settings page.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F5F5F4]"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

function FreeSlot({ remainingFree }: { remainingFree: number }) {
  return (
    <div className="rounded-lg border border-[#B8896B] bg-white p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Plus size={14} className="text-[#B8896B]" />
        Your plan includes another site at no extra cost
      </div>
      <p className="mt-2 text-xs text-[#737373]">
        You have {remainingFree} more {remainingFree === 1 ? "site" : "sites"} included with your
        current plan. Click below to spin one up — you&rsquo;ll go straight into
        template + theme selection.
      </p>
      <AddSiteCheckoutButton
        mode="included"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
      >
        Add new site <ArrowRight size={12} />
      </AddSiteCheckoutButton>
    </div>
  );
}

function AddonOffer({
  cycle,
  addonCents,
  headroomToCap,
}: {
  cycle: "monthly" | "annual";
  addonCents: number;
  headroomToCap: number;
}) {
  return (
    <div className="rounded-lg border border-[#B8896B] bg-white p-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Plus size={14} className="text-[#B8896B]" />
        Add another site for {fmtPriceLabel(addonCents, cycle)}
      </div>
      <p className="mt-2 text-xs text-[#737373]">
        You&rsquo;ve used your plan&rsquo;s included sites. Add another for{" "}
        <span className="font-semibold">{fmtPriceLabel(addonCents, cycle)}</span>{" "}
        — billed on the same {cycle} cycle as your current plan, prorated to today.
        You can add up to {headroomToCap} more before hitting your plan cap.
      </p>
      <p className="mt-2 text-[11px] text-[#A3A3A3]">
        Confirming charges your card on file and immediately drops you into
        template + theme selection for the new site.
      </p>
      <AddSiteCheckoutButton
        mode="addon"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
      >
        Confirm + add site <ArrowRight size={12} />
      </AddSiteCheckoutButton>
    </div>
  );
}
