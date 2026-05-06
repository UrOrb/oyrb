import { redirect } from "next/navigation";
import { AlertCircle, Mail } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getStrikeStanding } from "@/lib/strikes";

export const metadata = {
  title: "Storefront paused — OYRB",
};

/**
 * Pro-facing strike-pause landing. Distinct from /billing-pending: the
 * resolution path is "email support@oyrb.space for review", not "update
 * your card." Subscription billing continues unaffected — there's no
 * portal link here on purpose.
 *
 * Per Section 29 of TOS v1.3, recovery is manual only. No "request
 * unpause" button. Pros email Halania, she reviews, she manually
 * unpauses via the admin strikes queue.
 */
export default async function StrikePausedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find every paused business this pro owns. The proxy redirects when
  // ANY owned business is strike-paused; the page lists each.
  const admin = createAdminClient();
  const { data: paused } = await admin
    .from("businesses")
    .select("id, business_name, slug, strike_paused_at")
    .eq("owner_id", user.id)
    .not("strike_paused_at", "is", null)
    .order("strike_paused_at", { ascending: false });

  // Defensive bounce — proxy shouldn't redirect us here without a
  // paused row, but if state changed mid-flight (e.g., admin unpaused
  // between proxy hit and page render), send the pro back to the
  // dashboard rather than show an empty page.
  if (!paused || paused.length === 0) {
    redirect("/dashboard");
  }

  // Standing per business — single rolling-window query each. Typically
  // one business per pro; cheap.
  type PausedRow = {
    id: string;
    business_name: string;
    slug: string;
    strike_paused_at: string | null;
  };
  const standings = await Promise.all(
    (paused as PausedRow[]).map(async (b) => ({
      business: b,
      standing: await getStrikeStanding(b.id),
    })),
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-6 md:p-8">
        <div className="flex items-start gap-3">
          <AlertCircle size={24} className="mt-0.5 shrink-0 text-[#B91C1C]" />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B91C1C]">
              Storefront paused
            </p>
            <h1 className="mt-1 font-display text-2xl font-medium tracking-tight md:text-3xl">
              {standings.length === 1
                ? "Your storefront is paused pending OYRB review."
                : "One or more of your storefronts is paused pending OYRB review."}
            </h1>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm leading-relaxed text-[#525252]">
          <p>
            <strong className="text-[#0A0A0A]">Why this happens:</strong> per Terms of Service §29,
            a storefront is paused when resolved Dispute Inquiries cross a threshold
            (3 strikes, or a weighted total of 5, within a rolling 14-day window). Recovery is
            manual only — pauses lift after an OYRB review of your case.
          </p>
          <p>
            <strong className="text-[#0A0A0A]">What's affected:</strong> your public booking site
            returns 404 to new visitors. Existing bookings keep their appointments — clients
            can still see their booking, reschedule, cancel via their magic-link page, and you
            can still see and manage every booking from this dashboard.
          </p>
          <p>
            <strong className="text-[#0A0A0A]">Subscription billing:</strong> continues normally.
            A pause is a reputation matter, not a billing one. You can update your card or
            cancel your subscription anytime through the standard billing portal.
          </p>
        </div>

        <a
          href="mailto:support@oyrb.space?subject=Strike-pause%20review%20request"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#262626]"
        >
          <Mail size={16} /> Request review
        </a>

        <p className="mt-4 text-xs text-[#737373]">
          Opens an email to OYRB Support. Tell us your side — we'll review the resolved Dispute
          Inquiries together and decide whether to lift the pause.
        </p>
      </div>

      <section className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Affected storefront{standings.length === 1 ? "" : "s"}
        </h2>
        {standings.map(({ business, standing }) => (
          <div
            key={business.id}
            className="rounded-2xl border border-[#E7E5E4] bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-medium text-[#0A0A0A]">
                  {business.business_name}
                </p>
                <p className="mt-0.5 text-xs text-[#A3A3A3]">/s/{business.slug}</p>
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-700">
                Paused
              </span>
            </div>
            <div className="mt-4 grid gap-3 border-t border-[#F5F5F4] pt-4 sm:grid-cols-3">
              <Stat label="Active strikes" value={standing.count.toString()} />
              <Stat label="Weighted total" value={standing.weightedTotal.toString()} />
              <Stat
                label="Paused since"
                value={business.strike_paused_at ? fmtDate(business.strike_paused_at) : "—"}
              />
            </div>
            <p className="mt-3 text-[11px] text-[#737373]">
              Threshold: {standing.thresholdCount} strikes or weighted total{" "}
              {standing.thresholdWeighted}, within a rolling {standing.windowDays}-day window.
              Strikes age out automatically after {standing.windowDays} days of no new resolved
              inquiries.
            </p>
          </div>
        ))}
      </section>

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0A0A0A]">{value}</p>
    </div>
  );
}
