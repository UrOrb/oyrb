"use client";

import { useState, useTransition } from "react";
import { formatCents } from "@/lib/types";

type Props = {
  token: string;
  balanceCents: number;
};

export function PayButton({ token, balanceCents }: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const go = () => {
    setErr(null);
    start(async () => {
      try {
        const res = await fetch("/api/public/bookings/pay-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) {
          setErr(data.error ?? `Couldn't start checkout (HTTP ${res.status}).`);
          return;
        }
        // Hard redirect — Stripe Checkout is a full-page flow.
        window.location.href = data.url;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Network error");
      }
    });
  };

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={go}
        disabled={pending || balanceCents <= 0}
        className="w-full rounded-full bg-[#0A0A0A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending
          ? "Redirecting to checkout…"
          : `Pay ${formatCents(balanceCents)} now`}
      </button>
      {err && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </p>
      )}
    </div>
  );
}
