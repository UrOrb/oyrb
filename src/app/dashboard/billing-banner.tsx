import { createClient } from "@/lib/supabase/server";
import { AlertCircle } from "lucide-react";

/**
 * Renders a compliance-style banner across every dashboard page when the
 * pro is in the 2-day grace window after a failed payment. Returns null
 * (no DOM) outside that window:
 *
 *   - status='active' / 'trialing' / 'incomplete' → null
 *   - status='past_due' but grace expired → user is already on
 *     /dashboard/billing-pending via proxy.ts redirect, so they never see
 *     other dashboard pages where this banner mounts. Returning null here
 *     too keeps the banner's behavior single-purpose: "you're in grace,
 *     clock is ticking."
 *
 * The banner is designed for the dashboard shell (between header and main),
 * not as a page-level alert. Embed once in dashboard/layout.tsx.
 */
export async function BillingBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sub } = await supabase
    .from("account_subscriptions")
    .select("status, tier, grace_period_ends_at, past_due_since")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub || sub.status !== "past_due") return null;
  if (!sub.grace_period_ends_at) return null;

  const graceEndsAt = new Date(sub.grace_period_ends_at);
  if (graceEndsAt <= new Date()) return null;

  const failedAt = sub.past_due_since ? new Date(sub.past_due_since) : null;
  const tier = sub.tier
    ? (sub.tier as string).charAt(0).toUpperCase() + (sub.tier as string).slice(1)
    : "subscription";

  const fmtShort = (d: Date) =>
    d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="border-b border-[#E7C9A8] bg-[#FBF4EC] px-6 py-3">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-[#7C5A3F]">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#B8896B]">
            <AlertCircle size={15} />
          </span>
          <p className="leading-relaxed">
            <span className="font-semibold">Payment failed</span>
            {failedAt ? <> on {fmtShort(failedAt)}</> : null} for your OYRB {tier}
            . Your storefront stays live until{" "}
            <span className="font-semibold">{fmtShort(graceEndsAt)}</span>.
          </p>
        </div>
        <a
          href="/api/stripe/portal"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#262626]"
        >
          Update payment method
        </a>
      </div>
    </div>
  );
}
