import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertCircle, CreditCard, Download } from "lucide-react";

export const metadata = {
  title: "Billing pending — OYRB",
};

export default async function BillingPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("account_subscriptions")
    .select("status, tier, past_due_since, grace_period_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // If the pro has no past_due record, they shouldn't be here. Bounce them
  // back to the dashboard rather than show an empty page.
  if (!sub || sub.status !== "past_due") {
    redirect("/dashboard");
  }

  const now = new Date();
  const failedAt = sub.past_due_since ? new Date(sub.past_due_since) : null;
  const graceEndsAt = sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : null;
  const graceExpired = graceEndsAt ? graceEndsAt < now : false;

  const fmtDayTime = (d: Date) =>
    d.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="mx-auto max-w-2xl">
      <div
        className="rounded-2xl border p-6 md:p-8"
        style={{
          borderColor: graceExpired ? "#FCA5A5" : "#FCD34D",
          backgroundColor: graceExpired ? "#FEF2F2" : "#FFFBEB",
        }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            size={24}
            className="mt-0.5 shrink-0"
            style={{ color: graceExpired ? "#B91C1C" : "#B45309" }}
          />
          <div className="flex-1">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: graceExpired ? "#B91C1C" : "#B45309" }}
            >
              {graceExpired ? "Subscription paused" : "Payment needed"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-medium tracking-tight md:text-3xl">
              {graceExpired
                ? "Your storefront is unpublished."
                : "Your card was declined."}
            </h1>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-[#525252]">
          {failedAt && (
            <p>
              <strong className="text-[#0A0A0A]">What failed:</strong> Stripe
              tried to charge your OYRB{" "}
              {sub.tier ? sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1) : ""}{" "}
              subscription on {fmtDayTime(failedAt)} and the card was declined.
            </p>
          )}

          {graceEndsAt && !graceExpired && (
            <p>
              <strong className="text-[#0A0A0A]">Grace window:</strong> Your
              storefront stays live until {fmtDayTime(graceEndsAt)}. Update your
              payment method before then and nothing changes — clients keep
              booking, your data is untouched.
            </p>
          )}

          {graceExpired && (
            <p>
              <strong className="text-[#0A0A0A]">Where you stand:</strong> Your
              public booking site is currently unpublished and clients can&apos;t
              book new appointments. Existing bookings are preserved. Update
              your card and your storefront re-publishes automatically — no
              manual republish required.
            </p>
          )}
        </div>

        <a
          href="/api/stripe/portal"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]"
        >
          <CreditCard size={16} /> Update payment method
        </a>

        <p className="mt-4 text-xs text-[#737373]">
          Opens the secure Stripe Customer Portal. You can update your card,
          download invoices, or cancel from there. Your data stays on OYRB
          regardless.
        </p>
      </div>

      {/* Phase 8 PR 3 — pros locked out of the dashboard can still
          pull a portable copy of any of their data while their billing
          is being resolved. /dashboard/settings/* is proxy-exempt
          (src/proxy.ts:18-22). Card retargeted from the contacts-only
          link to the Exports hub once all three CSVs went live, so
          pros pick which export they need rather than being pre-routed. */}
      <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0A0A0A]">
              Need a copy of your data?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#737373]">
              Your data stays on OYRB regardless — but if you want a
              portable copy of your clients, bookings, or income right
              now, download them as CSVs.
            </p>
          </div>
          <a
            href="/dashboard/settings/exports"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            <Download size={14} /> Open Exports →
          </a>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#737373]">
        Need help? Email{" "}
        <a href="mailto:support@oyrb.space" className="underline hover:text-[#0A0A0A]">
          support@oyrb.space
        </a>
        .
      </p>
    </div>
  );
}
