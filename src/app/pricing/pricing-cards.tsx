"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  TIERS,
  ADDON_MONTHLY_CENTS,
  ADDON_ANNUAL_CENTS,
  ANNUAL_SAVINGS_LABEL,
  fmtMoney,
  fmtPriceLabel,
  fmtAnnualAsMonthly,
  fmtAnnualBilled,
  type BillingCycle,
} from "@/lib/plans";

const TIER_LIST = [TIERS.starter, TIERS.studio, TIERS.scale];

export function PricingCards() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <>
      {/* Cycle toggle */}
      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-5 py-1.5 font-medium transition-colors ${
              cycle === "monthly" ? "bg-[#0A0A0A] text-white" : "text-[#525252] hover:text-[#0A0A0A]"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`rounded-full px-5 py-1.5 font-medium transition-colors ${
              cycle === "annual" ? "bg-[#0A0A0A] text-white" : "text-[#525252] hover:text-[#0A0A0A]"
            }`}
          >
            Annual
            <span className="ml-1.5 rounded-full bg-[#B8896B]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#B8896B]">
              Save ~17%
            </span>
          </button>
        </div>
        {cycle === "annual" && (
          <p className="text-xs text-[#B8896B]">{ANNUAL_SAVINGS_LABEL} on every plan + add-on.</p>
        )}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TIER_LIST.map((tier) => {
          const sitesIncludedLabel =
            tier.sitesIncluded === 1 ? "1 site included" : `${tier.sitesIncluded} sites included`;
          const addonsAvailable = tier.id !== "starter" && tier.siteCap > tier.sitesIncluded;
          const extraSlots = tier.siteCap - tier.sitesIncluded;
          // Add-on copy: in monthly mode show $20/mo each; in annual mode show
          // the per-month equivalent ($17/mo) with "billed annually" so it
          // matches the headline plan-price treatment.
          const addonCopy = addonsAvailable
            ? cycle === "monthly"
              ? `Add up to ${extraSlots} more ${extraSlots === 1 ? "site" : "sites"} for ${fmtPriceLabel(ADDON_MONTHLY_CENTS, "monthly")} each.`
              : `Add up to ${extraSlots} more ${extraSlots === 1 ? "site" : "sites"} for ${fmtAnnualAsMonthly(ADDON_ANNUAL_CENTS)}/mo each, billed annually.`
            : "Site limit: 1. Upgrade for additional sites.";

          return (
            <div
              key={tier.id}
              className={`flex flex-col rounded-lg border p-8 ${
                tier.highlight ? "border-[#B8896B] bg-white" : "border-[#E7E5E4]"
              }`}
            >
              {tier.highlight && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#B8896B]/10 px-3 py-1 text-xs font-medium text-[#B8896B]">
                    Most popular
                  </span>
                </div>
              )}
              <p className="font-medium">{tier.name}</p>

              {/* Headline price: monthly cycle shows the actual monthly charge.
                  Annual cycle shows the per-month equivalent (whole-dollar
                  rounded) with the full annual amount in secondary text and
                  the "Save ~17%" badge alongside. Stripe still charges the
                  full annual sum up front — display only. */}
              {cycle === "monthly" ? (
                <>
                  <p className="font-display mt-2 text-5xl font-medium">
                    {fmtMoney(tier.monthlyPriceCents)}
                    <span className="text-lg font-normal text-[#737373]">/mo</span>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display mt-2 text-5xl font-medium">
                    {fmtAnnualAsMonthly(tier.annualPriceCents)}
                    <span className="text-lg font-normal text-[#737373]">/mo</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#525252]">
                    <span>{fmtAnnualBilled(tier.annualPriceCents)}</span>
                    <span className="rounded-full bg-[#B8896B]/15 px-2 py-0.5 text-[10px] font-semibold text-[#B8896B]">
                      {ANNUAL_SAVINGS_LABEL}
                    </span>
                  </p>
                </>
              )}

              <p className="mt-2 text-sm text-[#737373]">{tier.description}</p>

              <div className="mt-4 rounded-md bg-[#FAFAF9] px-3 py-2 text-xs">
                <p className="font-semibold text-[#0A0A0A]">{sitesIncludedLabel}</p>
                <p className="mt-0.5 text-[#737373]">{addonCopy}</p>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#525252]">
                    <Check size={14} className="mt-0.5 shrink-0 text-[#B8896B]" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={`/signup?tier=${tier.id}&cycle=${cycle}`}
                className={`mt-8 block rounded-md py-3 text-center text-sm font-medium transition-opacity hover:opacity-80 ${
                  tier.highlight
                    ? "bg-[#0A0A0A] text-white"
                    : "border border-[#E7E5E4] text-[#0A0A0A] hover:bg-[#F5F5F4]"
                }`}
              >
                Get started
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}
