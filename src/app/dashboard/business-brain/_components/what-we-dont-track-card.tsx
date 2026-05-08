import { Compass } from "lucide-react";

/**
 * "Tracking gaps" card — ongoing transparency framing for the Where
 * They Come From tab. Renamed from "What we don't track yet" once
 * every known acquisition signal landed (Phase 5 closer's survey
 * field was the last gap).
 *
 * The card stays in the page stack as continued transparency, not as
 * a placeholder for missing items. Empty-of-bullets but rhetorically
 * present — pros see a clear "nothing to flag right now" signal,
 * and the card is ready to surface new tracking gaps if any emerge
 * (ad platforms change how they pass data, new channels become
 * relevant, etc.).
 *
 * Component name retained as WhatWeDontTrackCard for git-blame
 * continuity with PRs #33 / #35 / #36 / #37 / this PR. Section
 * heading uses the new "Tracking gaps" wording.
 */
export function WhatWeDontTrackCard() {
  return (
    <section className="rounded-2xl border border-dashed border-[#E7E5E4] bg-[#FAFAF9] p-6">
      <header className="flex items-center gap-2">
        <Compass size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Tracking gaps
        </h2>
      </header>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#525252]">
        <p>
          All currently-known acquisition signals are captured —
          self-reported survey responses, Pass the Torch referrals, UTM
          parameters, classified referrers from the URL, direct visits, and
          storefront view counts.
        </p>
        <p>
          If new tracking gaps emerge as your business grows or as ad
          platforms change how they pass data, we&apos;ll surface them here.
          For now: nothing to flag.
        </p>
      </div>
    </section>
  );
}
