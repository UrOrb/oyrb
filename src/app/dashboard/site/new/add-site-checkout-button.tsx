"use client";

import { useState } from "react";

type Props = {
  /** "included" → just provision a free slot. "addon" → charge the add-on. */
  mode: "included" | "addon";
  className?: string;
  children: React.ReactNode;
};

export function AddSiteCheckoutButton({ mode, className, children }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/dashboard/add-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j?.error ?? "Couldn't add a new site.");
        setBusy(false);
        return;
      }
      // Server returns the newly created business id; jump into the editor
      // with onboarding=1 so we can show a "pick a template first" hint.
      const siteId = j?.siteId as string | undefined;
      window.location.href = siteId
        ? `/dashboard/site?siteId=${encodeURIComponent(siteId)}&onboarding=1`
        : "/dashboard";
    } catch {
      setErr("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={go} disabled={busy} className={className}>
        {busy ? "Working…" : children}
      </button>
      {err && (
        <p className="mt-2 text-xs text-red-600">{err}</p>
      )}
    </div>
  );
}
