"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle } from "lucide-react";
import {
  TIERS,
  ADDON_MONTHLY_CENTS,
  ADDON_ANNUAL_CENTS,
  fmtMoney,
  type Tier,
  type BillingCycle,
} from "@/lib/plans";

type Props = {
  currentTier: Tier;
  currentCycle: BillingCycle;
  currentSites: number;
  currentAddons: number;
};

const TIER_OPTIONS: Tier[] = ["starter", "studio", "scale"];

export function PlanChangeForm({ currentTier, currentCycle, currentSites, currentAddons }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<Tier>(currentTier);
  const [cycle, setCycle] = useState<BillingCycle>(currentCycle);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const newSpec = TIERS[tier];
  const newPlanCents = cycle === "monthly" ? newSpec.monthlyPriceCents : newSpec.annualPriceCents;
  const addonUnitCents = cycle === "monthly" ? ADDON_MONTHLY_CENTS : ADDON_ANNUAL_CENTS;
  const addonTotalCents = currentAddons * addonUnitCents;
  const totalCents = newPlanCents + addonTotalCents;
  const cycleSuffix = cycle === "monthly" ? "/mo" : "/yr";

  // Local mirror of the server-side cap check so users see the warning before
  // they hit submit. The server still enforces — this is just hint copy.
  const overSiteCap = currentSites > newSpec.siteCap;
  const overAddonCap =
    currentAddons > Math.max(0, newSpec.siteCap - newSpec.sitesIncluded);
  const wouldDowngrade = overSiteCap || overAddonCap;
  const noChange = tier === currentTier && cycle === currentCycle;

  function reset() {
    setTier(currentTier);
    setCycle(currentCycle);
    setMsg(null);
  }

  async function submit() {
    setMsg(null);
    start(async () => {
      const r = await fetch("/api/dashboard/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cycle }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ type: "err", text: j?.error ?? "Couldn't change plan." });
        return;
      }
      setMsg({ type: "ok", text: "Plan updated. Stripe will email a prorated receipt." });
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
      >
        Change plan
      </button>
    );
  }

  return (
    <div className="mt-4 w-full rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Change plan</p>
        <button
          type="button"
          onClick={() => { reset(); setOpen(false); }}
          className="text-[11px] text-[#737373] hover:text-[#0A0A0A]"
        >
          Close
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">Tier</p>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-md border border-[#E7E5E4] bg-white p-1 text-xs">
            {TIER_OPTIONS.map((t) => {
              const active = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`rounded-sm px-2 py-1 font-medium transition-colors ${
                    active ? "bg-[#0A0A0A] text-white" : "text-[#525252] hover:text-[#0A0A0A]"
                  }`}
                >
                  {TIERS[t].name}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">Billing</p>
          <div className="mt-1 grid grid-cols-2 gap-1 rounded-md border border-[#E7E5E4] bg-white p-1 text-xs">
            {(["monthly", "annual"] as BillingCycle[]).map((c) => {
              const active = cycle === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className={`rounded-sm px-2 py-1 font-medium transition-colors ${
                    active ? "bg-[#0A0A0A] text-white" : "text-[#525252] hover:text-[#0A0A0A]"
                  }`}
                >
                  {c === "monthly" ? "Monthly" : "Annual · save ~17%"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-3 rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span>{TIERS[tier].name} plan ({cycle})</span>
          <span className="font-medium">{fmtMoney(newPlanCents)}{cycleSuffix}</span>
        </div>
        {currentAddons > 0 && (
          <div className="mt-1 flex items-center justify-between text-[#737373]">
            <span>Add-on sites × {currentAddons}</span>
            <span>{fmtMoney(addonTotalCents)}{cycleSuffix}</span>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between border-t border-[#F0EFEC] pt-1 font-semibold">
          <span>New total</span>
          <span>{fmtMoney(totalCents)}{cycleSuffix}</span>
        </div>
      </div>

      {/* Downgrade warning */}
      {wouldDowngrade && (
        <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">This downgrade is blocked.</p>
            {overSiteCap && (
              <p className="mt-0.5">
                {TIERS[tier].name} allows {newSpec.siteCap} sites; you have {currentSites}.
                Archive {currentSites - newSpec.siteCap} site
                {currentSites - newSpec.siteCap === 1 ? "" : "s"} first.
              </p>
            )}
            {overAddonCap && !overSiteCap && (
              <p className="mt-0.5">
                {TIERS[tier].name} supports {Math.max(0, newSpec.siteCap - newSpec.sitesIncluded)} add-on
                site(s); you have {currentAddons}. Archive enough sites to drop below the limit first.
              </p>
            )}
          </div>
        </div>
      )}

      {msg && (
        <p
          className={`mt-3 flex items-center gap-1 text-xs ${
            msg.type === "ok" ? "text-green-700" : "text-red-600"
          }`}
        >
          {msg.type === "ok" && <Check size={12} />} {msg.text}
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={pending || noChange}
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || noChange || wouldDowngrade}
          className="rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Updating…" : noChange ? "No change" : "Confirm change"}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-[#A3A3A3]">
        Stripe will issue a prorated invoice for the difference. New cycle starts on the next renewal date.
      </p>
    </div>
  );
}
