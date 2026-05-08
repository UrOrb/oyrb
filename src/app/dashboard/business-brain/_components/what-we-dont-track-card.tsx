import { Compass } from "lucide-react";

/**
 * Honest "what we can't tell you yet" card. Shrinks over time as
 * tracking work lands. Phase 5 PR #35 ungated UTM + classified
 * referrer attribution (Instagram / TikTok / Google / ads); Phase 5
 * closer (this PR) ungated Pass the Torch per-booking attribution.
 * What remains:
 *
 *   - Storefront view tracking (would unlock view → booking
 *     conversion analytics)
 *   - "How did you hear about us?" survey field on the booking
 *     widget (optional dropdown for the truth that no URL signal
 *     can capture — offline word-of-mouth, walk-bys, etc.)
 */
export function WhatWeDontTrackCard() {
  return (
    <section className="rounded-2xl border border-dashed border-[#E7E5E4] bg-[#FAFAF9] p-6">
      <header className="flex items-center gap-2">
        <Compass size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          What we don&apos;t track yet
        </h2>
      </header>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#525252]">
        <p>
          <strong className="text-[#0A0A0A]">Coming in a future update:</strong>
          {" "}storefront-view-to-booking conversion rates, and a &ldquo;How did you hear about
          us?&rdquo; question on the booking form for the truth that no URL signal can capture
          (offline word-of-mouth, walk-bys, etc.). Each is its own focused piece of work.
        </p>
        <p>
          <strong className="text-[#0A0A0A]">For now,</strong> if you want to know how a client
          specifically heard about you, ask them when they book and jot it in the booking&apos;s
          notes field — you&apos;ll have the answer next to every appointment.
        </p>
      </div>
    </section>
  );
}
