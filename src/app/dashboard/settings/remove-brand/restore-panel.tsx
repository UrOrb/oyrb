"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreRemoval } from "@/lib/remove-brand/actions";

/**
 * In-grace panel — same page, different mode. Mirrors the banner
 * affordance with more timeline detail (deletion date, days
 * remaining) and the same one-click Restore action. No friction:
 * restore is the safe action, gating it would discourage the right
 * behavior.
 */
export function RestorePanel({
  businessName,
  scheduledFor,
}: {
  businessName: string;
  scheduledFor: Date;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dateLabel = scheduledFor.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const msRemaining = scheduledFor.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  const isSubDay = msRemaining > 0 && msRemaining < 24 * 60 * 60 * 1000;

  function onSubmit(_: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await restoreRemoval();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/dashboard/settings/remove-brand?restored=1");
      router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <p className="text-sm leading-relaxed text-[#525252]">
        <strong>{businessName}</strong> is in the removal grace period.
      </p>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#78350F]">
          Scheduled deletion
        </p>
        <p className="mt-1 text-base font-semibold text-[#0A0A0A]">
          {dateLabel}
        </p>
        <p className="mt-1 text-sm text-[#78350F]">
          {isSubDay
            ? "Less than 24 hours remaining."
            : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining.`}
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-[#E7E5E4] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">
          Changed your mind?
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[#737373]">
          Restore puts everything back exactly where it was — same
          storefront visibility, same directory listing (if you had
          one), same subscription state. One click, no friction.
        </p>
        <form action={onSubmit} className="mt-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:opacity-85 disabled:opacity-50"
          >
            {pending ? "Restoring…" : "Restore my brand"}
          </button>
          {error && (
            <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </p>
          )}
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-5">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">
          What&apos;s happening now
        </h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#525252]">
          <li>Your storefront is offline — visitors see a 404.</li>
          <li>Your directory tile is hidden from /find.</li>
          <li>
            New bookings are refused, but existing bookings will be
            honored and reminders continue to send.
          </li>
          <li>
            Your Stripe subscription is set to cancel at the end of your
            current billing period.
          </li>
          <li>
            You can still log in, view your data, and download CSVs
            from{" "}
            <a
              href="/dashboard/settings/exports"
              className="underline hover:text-[#0A0A0A]"
            >
              Exports
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
