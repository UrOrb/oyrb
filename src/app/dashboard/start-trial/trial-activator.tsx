"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, AlertTriangle } from "lucide-react";
import type { Tier, BillingCycle } from "@/lib/plans";

type Props = {
  userEmail: string;
  tier: Tier;
  cycle: BillingCycle;
};

type Step = "phone" | "code" | "verified";

/**
 * Drives the trial-start flow: phone → SMS code → POST /api/checkout with
 * the resulting phone-verified JWT. The actual eligibility check happens
 * server-side in /api/checkout (so a banned email/phone never makes it to
 * Stripe checkout). We surface the friendly error message to the user and
 * offer to skip the trial as a fallback.
 */
export function TrialActivator({ userEmail, tier, cycle }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  async function sendCode() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/public/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j?.error ?? "Couldn't send the code.");
        setBusy(false);
        return;
      }
      setStep("code");
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkCode() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/public/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const j = await r.json();
      if (!r.ok || !j?.token) {
        setErr(j?.error ?? "That code didn't match. Try again.");
        setBusy(false);
        return;
      }
      setToken(j.token as string);
      setStep("verified");
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startTrial() {
    if (!token) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          cycle,
          skipTrial: false,
          phoneToken: token,
          phone,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.url) {
        // 409 = trial-eligibility block. Surface message + give them the
        // skip-trial fallback so the lead isn't lost.
        if (r.status === 409) {
          setBlocked(j?.error ?? "Free trial isn't available for this account.");
        } else {
          setErr(j?.error ?? "Couldn't start your trial.");
        }
        setBusy(false);
        return;
      }
      window.location.href = j.url as string;
    } catch {
      setErr("Network error. Please try again.");
      setBusy(false);
    }
  }

  if (blocked) {
    return (
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Free trial isn&rsquo;t available</p>
            <p className="mt-1 text-xs text-amber-900">{blocked}</p>
            <p className="mt-2 text-xs text-amber-900">
              You can still sign up for the {tier} plan and start using OYRB right away.
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard?skip=${tier}&cycle=${cycle}`}
          className="mt-4 inline-block rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
        >
          Sign up as a paying customer
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-lg border border-[#E7E5E4] bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
        Verify your phone
      </p>
      <p className="mt-1 text-xs text-[#737373]">
        We&rsquo;ll text a 6-digit code. One trial per phone number — verifying
        keeps trials fair and lets us skip the upsell next time.
      </p>

      <p className="mt-4 text-[11px] text-[#A3A3A3]">Email on file: <span className="font-mono">{userEmail}</span></p>

      <div className="mt-3">
        <label className="block text-xs font-medium text-[#525252]">Phone number</label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 555-1234"
          disabled={step !== "phone"}
          className="mt-1 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm focus:border-[#B8896B] focus:outline-none disabled:bg-[#FAFAF9] disabled:text-[#A3A3A3]"
        />
      </div>

      {step !== "phone" && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-[#525252]">SMS code</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            maxLength={8}
            disabled={step === "verified"}
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm focus:border-[#B8896B] focus:outline-none disabled:bg-[#FAFAF9]"
          />
        </div>
      )}

      {err && <p className="mt-3 text-xs text-red-600">{err}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {step === "phone" && (
          <button
            type="button"
            onClick={sendCode}
            disabled={busy || !phone.trim()}
            className="rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        )}
        {step === "code" && (
          <button
            type="button"
            onClick={checkCode}
            disabled={busy || code.length < 4}
            className="rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Verify code"}
          </button>
        )}
        {step === "verified" && (
          <button
            type="button"
            onClick={startTrial}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
          >
            <Check size={12} /> {busy ? "Starting trial…" : "Start 14-day free trial"}
          </button>
        )}
        <Link
          href={`/dashboard?skip=${tier}&cycle=${cycle}`}
          className="text-[11px] text-[#B8896B] hover:underline"
        >
          Skip trial — start now
        </Link>
      </div>
    </div>
  );
}
