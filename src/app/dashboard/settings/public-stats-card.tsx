"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ReputationCard } from "@/components/storefront/reputation-card";
import type { ReputationStats } from "@/lib/reputation-stats";
import { togglePublicStats } from "./actions";

/**
 * Settings card: "Show public reputation stats" toggle + preview.
 *
 * Renders the same <ReputationCard> the public storefront uses, in
 * preview mode (dimmed + caption), so the pro can see exactly what
 * clients will see before flipping the toggle on. Stats are computed
 * server-side and passed in as a prop — this component just controls
 * the toggle state and the preview's visibility.
 *
 * The card uses a neutral grey theme for the preview because we don't
 * want the settings page to depend on the pro's storefront theme
 * resolution (and the pro can switch themes anyway). On the actual
 * storefront the card inherits the live theme.
 */
type Props = {
  initialEnabled: boolean;
  stats: ReputationStats | null;
};

const PREVIEW_THEME = {
  accent: "#B8896B",
  ink: "#0A0A0A",
  muted: "#737373",
  surface: "#FFFFFF",
  border: "#E7E5E4",
  bodyFont:
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  displayFont:
    "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  radius: 14,
};

export function PublicStatsCard({ initialEnabled, stats }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(next: boolean) {
    setError(null);
    setEnabled(next); // optimistic
    startTransition(async () => {
      const res = await togglePublicStats(next);
      if (!res.ok) {
        setEnabled(!next); // revert
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold">Public reputation stats</h2>
          <p className="mt-2 text-sm text-[#525252]">
            Show clients trust signals on your storefront — completion rate,
            repeat-client rate, and a &ldquo;no recent issues&rdquo; badge —
            computed from your real bookings over the last 90 days.
          </p>

          <div className="mt-4 space-y-3 text-xs text-[#525252]">
            <div>
              <p className="font-semibold uppercase tracking-wider text-[#0A0A0A]">
                What shows publicly
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li>A tier label (Rising / Established / Trusted) based on your stats</li>
                <li>Completion rate (% of confirmed bookings that became completed)</li>
                <li>Repeat-client rate (% of bookings from returning clients)</li>
                <li>A &ldquo;no recent issues&rdquo; badge if you have zero strikes in the last 14 days</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-wider text-[#0A0A0A]">
                What never shows
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                <li>Specific dispute counts, reasons, or client identities</li>
                <li>Comparisons to other pros</li>
                <li>Numeric overall scores</li>
              </ul>
            </div>
            <p className="leading-relaxed">
              Stats are hidden automatically when you have fewer than 10 completed bookings in
              the 90-day window — so you control when the card appears just by enabling it
              after you have enough booking history.
            </p>
            <p className="leading-relaxed">
              Your storefront stays exactly the same with this off.
            </p>
          </div>
        </div>

        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={enabled}
            disabled={pending}
            onChange={(e) => handleToggle(e.target.checked)}
            className="h-4 w-4 accent-[#0A0A0A]"
          />
          <span className="text-sm font-medium">
            {enabled ? "Showing on storefront" : "Show on my storefront"}
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      {/* Preview — always rendered when toggled on so the pro sees
          exactly what the public sees. The component handles the
          empty / partial / full card states internally based on the
          stats prop. */}
      {enabled && (
        <div className="mt-6 border-t border-[#E7E5E4] pt-6">
          <ReputationCard stats={stats} theme={PREVIEW_THEME} preview />
        </div>
      )}
    </div>
  );
}
