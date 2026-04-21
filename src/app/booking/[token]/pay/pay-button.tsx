"use client";

import { useState, useTransition } from "react";
import { formatCents } from "@/lib/types";

type Props = {
  token: string;
  balanceCents: number;
  // Tip is optionally computed off the *pre-discount service total*
  // rather than the balance, so a $100 service with a $25 deposit still
  // produces a 20% tip of $20, not $15. Caller passes priceCents so the
  // tip math is honest.
  serviceTotalCents: number;
};

const PRESET_PCTS = [0, 15, 18, 20, 25] as const;
const MAX_TIP_CENTS = 500 * 100; // Hard cap matches server-side validation.

export function PayButton({ token, balanceCents, serviceTotalCents }: Props) {
  const [selectedPct, setSelectedPct] = useState<number | "custom">(0);
  const [customDollars, setCustomDollars] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const tipCents = (() => {
    if (selectedPct === "custom") {
      const n = parseFloat(customDollars);
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.min(Math.round(n * 100), MAX_TIP_CENTS);
    }
    return Math.round((serviceTotalCents * selectedPct) / 100);
  })();
  const totalCents = balanceCents + tipCents;

  const go = () => {
    setErr(null);
    start(async () => {
      try {
        const res = await fetch("/api/public/bookings/pay-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, tip_cents: tipCents }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          setErr(data.error ?? `Couldn't start checkout (HTTP ${res.status}).`);
          return;
        }
        window.location.href = data.url;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Network error");
      }
    });
  };

  return (
    <div className="mt-6">
      {/* Tip selector */}
      <div className="rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
          Add a tip? (optional)
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_PCTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPct(p);
                setCustomDollars("");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedPct === p
                  ? "bg-[#0A0A0A] text-white"
                  : "border border-[#E7E5E4] bg-white text-[#525252] hover:bg-white"
              }`}
            >
              {p === 0 ? "No tip" : `${p}%`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedPct("custom")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedPct === "custom"
                ? "bg-[#0A0A0A] text-white"
                : "border border-[#E7E5E4] bg-white text-[#525252] hover:bg-white"
            }`}
          >
            Custom
          </button>
        </div>
        {selectedPct === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-[#525252]">$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="500"
              step="0.01"
              value={customDollars}
              onChange={(e) => setCustomDollars(e.target.value)}
              placeholder="0.00"
              className="w-28 rounded-md border border-[#E7E5E4] px-2 py-1 text-sm"
              aria-label="Custom tip amount in dollars"
            />
          </div>
        )}
        {tipCents > 0 && (
          <div className="mt-3 border-t border-[#E7E5E4] pt-3 text-xs text-[#525252]">
            <p className="flex items-center justify-between">
              <span>Balance</span>
              <span className="font-medium">{formatCents(balanceCents)}</span>
            </p>
            <p className="mt-1 flex items-center justify-between">
              <span>Tip</span>
              <span className="font-medium">{formatCents(tipCents)}</span>
            </p>
            <p className="mt-1 flex items-center justify-between text-sm font-semibold text-[#0A0A0A]">
              <span>Total</span>
              <span>{formatCents(totalCents)}</span>
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={go}
        disabled={pending || totalCents < 50}
        className="mt-4 w-full rounded-full bg-[#0A0A0A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending
          ? "Redirecting to checkout…"
          : `Pay ${formatCents(totalCents)} now`}
      </button>
      {totalCents < 50 && (
        <p className="mt-2 text-[11px] text-[#A3A3A3]">
          Minimum charge is $0.50.
        </p>
      )}
      {err && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </p>
      )}
    </div>
  );
}
