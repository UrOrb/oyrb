"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function EndTrialButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function go() {
    if (!confirm(
      "End your free trial now and charge your card today? You'll get add-on " +
      "site access immediately. The trial offer can't be reclaimed."
    )) return;

    setErr(null);
    setBusy(true);
    start(async () => {
      try {
        const r = await fetch("/api/dashboard/end-trial-now", { method: "POST" });
        const j = await r.json();
        if (!r.ok) {
          setErr(j?.error ?? "Couldn't end the trial.");
          setBusy(false);
          return;
        }
        router.refresh();
      } catch {
        setErr("Network error. Please try again.");
        setBusy(false);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={go}
        disabled={busy || pending}
        className="rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
      >
        {busy || pending ? "Ending trial…" : "Skip trial and start now"}
      </button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}
