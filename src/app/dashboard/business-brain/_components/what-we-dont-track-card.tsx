import { Compass } from "lucide-react";

/**
 * Honest "what we can't tell you yet" card. Shrinks over time as
 * tracking work lands. Phase 5 PR #35 ungated UTM + classified
 * referrer attribution; PR #36 ungated Pass the Torch persistence;
 * Phase 5 closer (this PR) ungated storefront view tracking + view-
 * to-booking conversion analytics. One bullet remains:
 *
 *   - "How did you hear about us?" survey field on the booking
 *     widget (optional dropdown for the truth that no URL signal
 *     can capture — offline word-of-mouth, walk-bys, etc.)
 *
 * Card stays in the stack with this final bullet — honest scoping
 * remains useful framing even when only one item is left.
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
          {" "}a &ldquo;How did you hear about us?&rdquo; question on the booking form for the
          truth that no URL signal can capture — offline word-of-mouth, walk-bys, &ldquo;a
          friend told me,&rdquo; that kind of thing.
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
