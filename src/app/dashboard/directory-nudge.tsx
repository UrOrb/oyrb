"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Shown on /dashboard after a pro publishes their site, IF they haven't
// opted into the directory yet. Dismissal is stored in localStorage so the
// nudge doesn't keep re-appearing on every page load. Re-surfaces after
// 30 days (if still not listed) — that's long enough to not nag, short
// enough to catch people who changed their mind.
const DISMISS_KEY = "oyrb_directory_nudge_dismissed_at";
const RESURFACE_AFTER_DAYS = 30;

type Props = {
  // Server pre-computes these so we don't have to re-query from the
  // client. When both are false the component renders nothing.
  sitePublished: boolean;
  alreadyListed: boolean;
};

export function DirectoryNudge({ sitePublished, alreadyListed }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sitePublished || alreadyListed) return;
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const dismissedAt = parseInt(raw, 10);
        const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (Number.isFinite(daysSince) && daysSince < RESURFACE_AFTER_DAYS) return;
      }
    } catch {
      // localStorage unavailable — fail-open (show the nudge)
    }
    setVisible(true);
  }, [sitePublished, alreadyListed]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#B8896B]/40 bg-[#FAF6F1] p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold">
          Want to be found by new clients?
        </p>
        <p className="mt-0.5 text-xs text-[#525252]">
          List your profile on the public OYRB directory — you choose exactly
          what shows, and you can remove it anytime.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
        >
          Maybe later
        </button>
        <Link
          href="/dashboard/directory"
          className="rounded-md bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-white hover:opacity-85"
        >
          Yes, list me →
        </Link>
      </div>
    </div>
  );
}
