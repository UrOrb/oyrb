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
  // Default to annual — converts more buyers, locks in longer commitments.
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const isAnnual = cycle === "annual";

  return (
    <>
      {/* Cycle toggle: clickable labels on either side + a sliding-pill
          switch in the middle. The labels themselves toggle (so users who
          tap the word "Monthly" get monthly), and the switch flips between
          the two. "Save ~17%" badge sits next to "Annual" for reinforcement. */}
      <div className="mt-12 flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-2 py-1 transition-colors ${
              !isAnnual ? "font-semibold text-[#0A0A0A]" : "text-[#A3A3A3] hover:text-[#525252]"
            }`}
            aria-pressed={!isAnnual}
          >
            Monthly
          </button>

          <button
            type="button"
            onClick={() => setCycle(isAnnual ? "monthly" : "annual")}
            className="relative h-7 w-14 rounded-full bg-[#E7E5E4] transition-colors"
            aria-label={`Switch to ${isAnnual ? "monthly" : "annual"} billing`}
          >
            <span
              className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-[#0A0A0A] transition-transform duration-200 ${
                isAnnual ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`flex items-center gap-2 rounded-full px-2 py-1 transition-colors ${
              isAnnual ? "font-semibold text-[#0A0A0A]" : "text-[#A3A3A3] hover:text-[#525252]"
            }`}
            aria-pressed={isAnnual}
          >
            Annual
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Save ~17%
            </span>
          </button>
        </div>
        {isAnnual && (
          <p className="text-xs text-[#737373]">{ANNUAL_SAVINGS_LABEL} on every plan + add-on.</p>
        )}
      </div>

      <div className="mt-10 grid items-stretch gap-4 md:grid-cols-3">
        {TIER_LIST.map((tier) => {
          const sitesIncludedLabel =
            tier.sitesIncluded === 1 ? "1 site included" : `${tier.sitesIncluded} sites included`;
          const addonsAvailable = tier.id !== "starter" && tier.siteCap > tier.sitesIncluded;
          const extraSlots = tier.siteCap - tier.sitesIncluded;
          const addonCopy = addonsAvailable
            ? !isAnnual
              ? `Add up to ${extraSlots} more ${extraSlots === 1 ? "site" : "sites"} for ${fmtPriceLabel(ADDON_MONTHLY_CENTS, "monthly")} each.`
              : `Add up to ${extraSlots} more ${extraSlots === 1 ? "site" : "sites"} for ${fmtAnnualAsMonthly(ADDON_ANNUAL_CENTS)}/mo each, billed annually.`
            : "Site limit: 1. Upgrade for additional sites.";

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col rounded-lg border p-8 transition-shadow ${
                tier.highlight
                  ? "border-2 border-[#B8896B] bg-white shadow-lg md:scale-[1.02]"
                  : "border-[#E7E5E4]"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#B8896B] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  Most popular
                </span>
              )}
              <p className="font-medium">{tier.name}</p>
              {tier.recommendedFor && (
                <p className="mt-0.5 text-xs text-[#B8896B]">{tier.recommendedFor}</p>
              )}

              {/* Headline price area — fixed height so the card never jumps
                  when toggling Monthly ↔ Annual. Annual shows the per-month
                  equivalent ($24.17, $57.50, $107.50) plus the full billed
                  amount in secondary text. Stripe still charges the full
                  annual sum up front. */}
              <div className="mt-6 min-h-[110px]">
                {!isAnnual ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-5xl font-medium">
                        {fmtMoney(tier.monthlyPriceCents)}
                      </span>
                      <span className="text-xl text-[#737373]">/mo</span>
                    </div>
                    <p className="mt-1 text-sm text-[#737373]">billed monthly</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-5xl font-medium">
                        {fmtAnnualAsMonthly(tier.annualPriceCents)}
                      </span>
                      <span className="text-xl text-[#737373]">/mo</span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#737373]">
                      <span>{fmtAnnualBilled(tier.annualPriceCents)}</span>
                    </p>
                  </>
                )}
              </div>

              <p className="mt-1 text-sm text-[#737373]">{tier.description}</p>

              <div className="mt-4 rounded-md bg-[#FAFAF9] px-3 py-2 text-xs">
                <p className="font-semibold text-[#0A0A0A]">{sitesIncludedLabel}</p>
                <p className="mt-0.5 text-[#737373]">{addonCopy}</p>
              </div>

              <ul className="mt-6 flex flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[#525252]">
                    <Check size={14} className="mt-0.5 shrink-0 text-[#B8896B]" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-2 pt-8">
                <Link
                  href={`/signup?tier=${tier.id}&cycle=${cycle}&trial=1`}
                  className={`block rounded-md py-3 text-center text-sm font-medium transition-opacity hover:opacity-80 ${
                    tier.highlight
                      ? "bg-[#0A0A0A] text-white"
                      : "border border-[#E7E5E4] text-[#0A0A0A] hover:bg-[#F5F5F4]"
                  }`}
                >
                  Start 14-day trial
                </Link>
                <Link
                  href={`/signup?tier=${tier.id}&cycle=${cycle}&trial=0`}
                  className={`block rounded-md py-2 text-center text-xs font-medium underline-offset-2 transition-colors ${
                    tier.id === "starter"
                      ? "text-[#737373] hover:text-[#0A0A0A]"
                      : "text-[#B8896B] hover:underline"
                  }`}
                >
                  Skip trial — start now
                  {tier.id !== "starter" && (
                    <span className="ml-1 text-[#A3A3A3]">(unlock add-on sites)</span>
                  )}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
