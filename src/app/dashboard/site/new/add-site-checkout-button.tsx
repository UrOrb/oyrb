"use client";

import { useState } from "react";
import type { PriceTier } from "@/lib/stripe";

type Props = {
  tier: PriceTier;
  className?: string;
  children: React.ReactNode;
};

export function AddSiteCheckoutButton({ tier, className, children }: Props) {
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, addNew: true }),
      });
      const j = await r.json();
      if (j?.url) {
        window.location.href = j.url as string;
      } else {
        alert(j?.error ?? "Couldn't start checkout. Please try again.");
        setBusy(false);
      }
    } catch {
      alert("Network error starting checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} onClick={start} className={className}>
      {busy ? "Starting checkout…" : children}
    </button>
  );
}
