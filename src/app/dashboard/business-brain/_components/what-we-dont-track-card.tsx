import { Compass } from "lucide-react";

/**
 * Honest "what we can't tell you yet" card. The card stays in the
 * stack as the Phase 5 / Phase 6 tracking work lands; its content
 * just shrinks over time. Phase 5 (UTM parsing + classified
 * referrer tracking) ungated Instagram / TikTok / Google / ads
 * attribution — those bullets are gone. What remains:
 *
 *   - Per-booking Pass the Torch attribution (still email-metadata
 *     only; persisting it requires touching the Stripe webhook
 *     reconciliation path)
 *   - Storefront view tracking (would unlock view → booking
 *     conversion analytics)
 *   - "How did you hear about us?" survey field on the booking
 *     widget (optional dropdown for the truth that no URL signal
 *     can capture)
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
          <strong className="text-[#0A0A0A]">Coming in a future update:</strong> per-booking
          attribution for Trusted Pros referrals, storefront-view-to-booking conversion rates,
          and a &ldquo;How did you hear about us?&rdquo; question on the booking form for the
          truth that no URL signal can capture (offline word-of-mouth, walk-bys, etc.). Each is
          its own focused piece of work.
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
