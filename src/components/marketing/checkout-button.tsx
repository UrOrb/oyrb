"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tier, BillingCycle } from "@/lib/plans";

interface CheckoutButtonProps {
  tier: Tier;
  /** Defaults to "monthly" so legacy callers keep working. */
  cycle?: BillingCycle;
  /** "trial" → bounce to /dashboard/start-trial (phone-verify required).
   *  "skip"  → POST /api/checkout with skipTrial=true (charge today). */
  mode?: "trial" | "skip";
  className?: string;
  children: React.ReactNode;
}

export function CheckoutButton({
  tier,
  cycle = "monthly",
  mode = "trial",
  className,
  children,
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      if (mode === "trial") {
        router.push(`/dashboard/start-trial?tier=${tier}&cycle=${cycle}`);
        return;
      }
      // Skip-trial path: charge today, no eligibility / phone-verify gate.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cycle, skipTrial: true }),
      });
      if (res.status === 401) {
        router.push(`/signup?tier=${tier}&cycle=${cycle}&trial=0`);
        return;
      }
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Redirecting…" : children}
    </button>
  );
}
