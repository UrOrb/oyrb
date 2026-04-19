"use client";

import { useEffect, useState } from "react";

/**
 * Demo overlay: persistent top banner + one-time welcome modal + source-
 * traffic greeting. Renders only when NEXT_PUBLIC_DEMO_MODE === "true".
 *
 * - Banner: fixed top strip with a link to the real signup. z-40 so it
 *   sits above page content but below anything the booking/chat widgets
 *   push on top.
 * - Welcome modal: shown on first visit, dismissed with a cookie good
 *   for 7 days.
 * - Source tag: ?src=ig|tiktok|x|linkedin|email|direct → stored in
 *   localStorage and surfaces as a personalized greeting inside the
 *   welcome modal. Also posts to a light-weight logger endpoint so the
 *   owner can count traffic sources.
 */
const COOKIE = "oyrb_demo_welcome_dismissed";

const SOURCE_LABELS: Record<string, string> = {
  ig: "Instagram",
  tiktok: "TikTok",
  x: "X / Twitter",
  linkedin: "LinkedIn",
  email: "email",
  direct: "direct",
};

export function DemoOverlay() {
  const [showModal, setShowModal] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);

  useEffect(() => {
    // Capture ?src= on mount, keep it in localStorage for later bannering.
    try {
      const url = new URL(window.location.href);
      const src = url.searchParams.get("src");
      if (src && SOURCE_LABELS[src]) {
        localStorage.setItem("oyrb_demo_source", src);
        // Fire-and-forget analytics log — server keeps counts.
        fetch(`/api/demo/log-source?src=${encodeURIComponent(src)}`, { method: "POST" }).catch(() => {});
      }
      const saved = localStorage.getItem("oyrb_demo_source");
      if (saved && SOURCE_LABELS[saved]) setSourceLabel(SOURCE_LABELS[saved]);
    } catch {}

    // First-visit modal: cookie-gated, 7-day cooldown.
    const dismissed = document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE}=1`));
    if (!dismissed) setShowModal(true);
  }, []);

  function dismiss() {
    document.cookie = `${COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    setShowModal(false);
  }

  return (
    <>
      {/* Persistent banner — fixed at top of viewport, renders on every
          page in demo mode. */}
      <div className="fixed inset-x-0 top-0 z-40 flex flex-wrap items-center justify-center gap-2 bg-[#0A0A0A] px-4 py-1.5 text-center text-[11px] font-medium text-white shadow-sm md:text-xs">
        <span className="hidden sm:inline">🎬</span>
        <span>
          <strong>Live Demo</strong> — try anything! Resets every 24 hours.
        </span>
        <a
          href="/s/luxe-studio-demo"
          target="_blank"
          rel="noreferrer"
          className="rounded border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-white/20 md:text-[11px]"
        >
          👁️ Preview public site
        </a>
        <a
          href="https://oyrb.space/signup"
          className="rounded bg-[#B8896B] px-2 py-0.5 text-[10px] font-semibold text-white hover:opacity-85 md:text-[11px]"
        >
          Sign up for the real thing →
        </a>
      </div>
      {/* Push page content down so the banner doesn't cover it. The banner
          wraps to two lines on narrow viewports — bump the mobile height
          so there's no overlap. */}
      <div aria-hidden className="h-12 md:h-8" />

      {showModal && <WelcomeModal sourceLabel={sourceLabel} onDismiss={dismiss} />}
    </>
  );
}

function WelcomeModal({
  sourceLabel,
  onDismiss,
}: {
  sourceLabel: string | null;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-welcome-title"
    >
      <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {sourceLabel && (
          <p className="mb-2 inline-block rounded-full bg-[#B8896B]/10 px-3 py-0.5 text-[11px] font-semibold text-[#B8896B]">
            👋 Welcome from {sourceLabel}!
          </p>
        )}
        <h2 id="demo-welcome-title" className="font-display text-2xl font-medium tracking-tight">
          Welcome to OYRB! 🎉
        </h2>
        <p className="mt-2 text-sm text-[#525252]">
          You&rsquo;re now logged in as <strong>Jasmine Carter</strong>, a
          sample beauty professional. You have full access to her dashboard,
          site editor, bookings, and settings — try anything!
        </p>
        <p className="mt-2 text-xs text-[#737373]">
          Edit text, swap templates, change themes, add bookings, tweak
          services — all in real time. Your changes reset every 24 hours.
          No real charges, no real emails, no real texts. It&rsquo;s a sandbox.
        </p>
        <p className="mt-2 text-xs text-[#737373]">
          Want to see what her clients see? Click{" "}
          <span className="font-semibold">&ldquo;Preview public site&rdquo;</span>{" "}
          in the black banner at the top.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white hover:opacity-85"
          >
            Got it, let me explore
          </button>
          <a
            href="https://oyrb.space/signup"
            className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            Sign up to build your own →
          </a>
        </div>
      </div>
    </div>
  );
}
