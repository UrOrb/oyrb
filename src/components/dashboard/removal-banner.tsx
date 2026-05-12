import { AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { restoreRemovalAction } from "@/lib/remove-brand/actions";

/**
 * Renders a persistent grace-period banner across every dashboard page
 * when the pro has at least one business with `removal_initiated_at`
 * set. Returns null (no DOM) otherwise.
 *
 * Treatment:
 *   - bg-amber-50 above 24h remaining
 *   - bg-amber-100 below 24h ("less than 24 hours remaining")
 *   - "Restore now" button is the primary action: bg-[#0A0A0A]
 *     text-white. Restore is the safe action; no destructive
 *     styling.
 *
 * Mounted between header and main in dashboard/layout.tsx, alongside
 * BillingBanner. Same pattern: read state at render time, return
 * null when not applicable, no client-side polling.
 *
 * One-click restore via <form action={restoreRemoval}>. The server
 * action revalidates the dashboard layout and the storefront on
 * success; this banner unmounts on the next render.
 */
export async function RemovalBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Find the in-grace business (if any) the current user owns. Per
  // idx_businesses_owner_removal — a partial index over
  // `removal_initiated_at IS NOT NULL` — this is a cheap index scan.
  // We surface the most-recently-initiated row if (somehow) multiple
  // are in grace at once, which can't happen with single-business
  // accounts but is forward-defensive.
  const { data: rows } = await supabase
    .from("businesses")
    .select(
      "id, business_name, slug, removal_scheduled_for, removal_initiated_at",
    )
    .eq("owner_id", user.id)
    .not("removal_initiated_at", "is", null)
    .order("removal_initiated_at", { ascending: false })
    .limit(1);

  const biz = rows?.[0] as
    | {
        id: string;
        business_name: string;
        slug: string;
        removal_scheduled_for: string | null;
        removal_initiated_at: string | null;
      }
    | undefined;
  if (!biz || !biz.removal_scheduled_for) return null;

  const scheduledFor = new Date(biz.removal_scheduled_for);
  const msRemaining = scheduledFor.getTime() - Date.now();
  // Negative ms shouldn't happen pre-cron-finalize, but defend: if the
  // grace already elapsed, render the most urgent state.
  const isSubDay = msRemaining < 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  const dateLabel = scheduledFor.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const remainingLabel = isSubDay
    ? "less than 24 hours remaining"
    : `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining`;

  // Intensify under 24h: bg-amber-100 / border-amber-300.
  const tone = isSubDay
    ? "border-b border-amber-300 bg-amber-100"
    : "border-b border-amber-200 bg-amber-50";

  return (
    <div className={`${tone} px-6 py-3`}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-[#78350F]">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            Your brand removal is scheduled for{" "}
            <span className="font-semibold">{dateLabel}</span> ({remainingLabel}).
          </p>
        </div>
        <form action={restoreRemovalAction}>
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#262626]"
          >
            Restore now
          </button>
        </form>
      </div>
    </div>
  );
}
