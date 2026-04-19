"use client";

import { useEffect, useState } from "react";

type Props = {
  knownIds: string[];
  sessionId: string | null;
};

// Polls /api/dashboard/businesses every 1.5s looking for a new business that
// wasn't there when checkout started. As soon as one appears, push the user
// straight into the editor for that site so they can pick a template/theme.
export function NewSiteLandingPoller({ knownIds, sessionId }: Props) {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const known = new Set(knownIds);

    async function tick() {
      if (cancelled) return;
      try {
        const r = await fetch("/api/dashboard/businesses", { cache: "no-store" });
        if (r.ok) {
          const data = (await r.json()) as { sites: Array<{ id: string; created_at: string }> };
          const fresh = data.sites.find((s) => !known.has(s.id));
          if (fresh) {
            window.location.href = `/dashboard/site?siteId=${encodeURIComponent(fresh.id)}&onboarding=1`;
            return;
          }
        }
      } catch {
        // ignore — webhook may take a moment
      }
      setTicks((t) => t + 1);
    }

    const interval = setInterval(tick, 1500);
    tick();
    return () => { cancelled = true; clearInterval(interval); };
  }, [knownIds]);

  // After ~25s, give up gracefully and let them go back to dashboard.
  if (ticks > 16) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-sm font-semibold">Your purchase went through.</p>
        <p className="mt-2 text-xs text-[#737373]">
          We&rsquo;re still finishing the new site setup. You can refresh in a moment, or
          head back to the dashboard.
        </p>
        <a
          href="/dashboard"
          className="mt-4 inline-block rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white"
        >
          Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#E7E5E4] border-t-[#B8896B]" />
      <p className="mt-4 text-sm font-semibold">Setting up your new site…</p>
      <p className="mt-1 text-xs text-[#737373]">
        Payment received{sessionId ? "" : ""}. Just a moment while we get your editor ready.
      </p>
    </div>
  );
}
