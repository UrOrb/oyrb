"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { PassTheTorchVisibility } from "@/lib/types";
import { updatePassTheTorchVisibility } from "./actions";

const OPTIONS: Array<{
  value: PassTheTorchVisibility;
  label: string;
  hint: string;
}> = [
  {
    value: "always",
    label: "🟢 Always visible (show off your community)",
    hint: "Section appears on every visit, whenever you have accepted referrals.",
  },
  {
    value: "smart",
    label:
      "🎯 Smart: only when I'm fully booked, on vacation, or don't offer the service (recommended)",
    hint: "Hidden on healthy days; surfaces on vacation, when a referral link brings a client over, or inside the booking widget when there's no availability.",
  },
  {
    value: "vacation_only",
    label: "🌴 Vacation only (just when I'm away)",
    hint: "Section only appears while your vacation window is active.",
  },
];

const inputCls =
  "block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#B8896B] focus:outline-none disabled:bg-[#FAFAF9] disabled:text-[#A3A3A3]";

type Props = {
  value: PassTheTorchVisibility;
  /** Master toggle state — when off, the dropdown is disabled because
   *  the section won't render regardless. */
  enabled: boolean;
};

export function VisibilitySelect({ value, enabled }: Props) {
  const [current, setCurrent] = useState<PassTheTorchVisibility>(value);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, start] = useTransition();

  function handleChange(next: PassTheTorchVisibility) {
    setError(null);
    setSavedAt(null);
    const prev = current;
    setCurrent(next); // optimistic
    start(async () => {
      const result = await updatePassTheTorchVisibility({ visibility: next });
      if ("error" in result) {
        setCurrent(prev);
        setError(result.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  const activeHint = OPTIONS.find((o) => o.value === current)?.hint;

  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <label
        htmlFor="ptt-visibility"
        className="text-sm font-medium text-[#0A0A0A]"
      >
        When should Pro Referrals show on my storefront?
      </label>

      <select
        id="ptt-visibility"
        value={current}
        disabled={!enabled || pending}
        onChange={(e) => handleChange(e.target.value as PassTheTorchVisibility)}
        className={`${inputCls} mt-2`}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div className="mt-2 flex items-start gap-2">
        {pending && <Loader2 size={12} className="mt-0.5 animate-spin text-[#737373]" />}
        <p className="text-xs leading-relaxed text-[#737373]">
          {activeHint}
        </p>
      </div>

      {!enabled && (
        <p className="mt-2 text-xs text-[#A3A3A3]">
          Turn the section on above to use this setting.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[#A3A3A3]">
        Note: the booking widget always surfaces your referrals when a
        client hits a service you don&apos;t offer or a fully-booked window
        — regardless of this setting.
      </p>

      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {savedAt && !error && (
        <p className="mt-2 text-xs text-[#737373]">Saved.</p>
      )}
    </div>
  );
}
