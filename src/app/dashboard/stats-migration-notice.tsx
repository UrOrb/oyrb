"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { acknowledgeStatsMigration } from "./actions";

// One-time banner for pros whose businesses still carry legacy
// stat_*_value entries in template_content. Disappears the first time
// they either click "Review" or dismiss it — acknowledgement stamped
// to businesses.stats_migration_acknowledged_at.
export function StatsMigrationNotice({ businessId }: { businessId: string }) {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    start(async () => {
      try {
        await acknowledgeStatsMigration(businessId);
      } catch {
        // best-effort — banner is gone client-side either way
      }
    });
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#B8896B]/40 bg-[#FAF6F1] p-4">
      <div>
        <p className="text-sm font-semibold">We&apos;ve updated how stats work.</p>
        <p className="mt-0.5 text-xs text-[#525252]">
          Your stats strip now auto-verifies from real platform data. Review
          which three stats show on your site.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
        >
          Dismiss
        </button>
        <Link
          href="/dashboard/site"
          onClick={dismiss}
          className="rounded-md bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-white hover:opacity-85"
        >
          Review my selections →
        </Link>
      </div>
    </div>
  );
}
