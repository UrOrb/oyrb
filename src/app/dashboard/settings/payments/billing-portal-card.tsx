"use client";

import { useState, useTransition } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { SectionCard } from "../section-card";

export function BillingPortalCard({ initialError }: { initialError?: string }) {
  const [portalPending, startPortal] = useTransition();
  const [portalError, setPortalError] = useState<string | null>(initialError ?? null);

  const openPortal = () => {
    setPortalError(null);
    startPortal(async () => {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setPortalError(data.error ?? "Could not open portal.");
        return;
      }
      window.location.href = data.url;
    });
  };

  return (
    <SectionCard
      title="Manage subscription"
      subtitle="Update payment methods, download invoices, change your plan, or cancel through Stripe."
    >
      <button
        type="button"
        onClick={openPortal}
        disabled={portalPending}
        className="inline-flex items-center gap-2 rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
      >
        <CreditCard size={14} />
        {portalPending ? "Opening..." : "Open billing portal"}
        <ExternalLink size={11} />
      </button>
      {portalError && <p className="text-xs text-red-600">{portalError}</p>}
    </SectionCard>
  );
}
