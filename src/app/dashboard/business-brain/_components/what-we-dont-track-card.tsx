import { Compass } from "lucide-react";

/**
 * Honest "what we can't tell you yet" card. Closes the Where They
 * Come From tab with a transparent statement about what richer
 * attribution requires — and gives pros a workaround they can use
 * today (the booking notes field).
 *
 * This card stays in place even after Phase 5 ships UTM parsing,
 * Pass the Torch attribution, and the survey field — its content
 * just shrinks over time as more is tracked. For now it covers the
 * full set of unimplemented attribution signals.
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
          <strong className="text-[#0A0A0A]">Coming in a future update:</strong> tracking for
          Instagram and TikTok referrals, Google search and paid ads (UTM parameters),
          word-of-mouth via your Trusted Pros network, and a &ldquo;How did you hear about
          us?&rdquo; question on the booking form. Each is its own focused piece of work —
          we&apos;d rather ship them right than guess.
        </p>
        <p>
          <strong className="text-[#0A0A0A]">For now,</strong> if you want to know how clients
          found you, ask them when they book and jot it in the booking&apos;s notes field —
          you&apos;ll have the answer next to every appointment, even if this tab can&apos;t
          aggregate it for you yet.
        </p>
      </div>
    </section>
  );
}
