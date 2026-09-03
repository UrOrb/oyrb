/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { getStrikeStanding, STRIKE_WINDOW_DAYS } from "@/lib/strikes";
import { REASON_LABELS, type ReasonCode } from "@/lib/disputes";
import { UnpauseButton } from "./unpause-button";

export const metadata = { title: "Admin · Business strike review" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ business_id: string }> };

type DisputeForReview = {
  id: string;
  reason_code: ReasonCode;
  weight: number;
  status: string;
  resolved_at: string | null;
  filed_at: string;
  reporter_email: string;
  reporter_type: "client" | "pro";
  admin_notes: string | null;
};

/**
 * Per-business strike review page. Lists the resolved strikes that
 * make up the current standing (rolling window), surfaces the pause
 * marker, and offers the manual unpause button.
 *
 * Admin-only. requireAdmin gate matches the existing pattern.
 */
export default async function AdminStrikeBusinessPage({ params }: Props) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-10 text-sm text-[#737373]">
        {gate.error} (HTTP {gate.status})
      </div>
    );
  }

  const { business_id } = await params;
  const admin = createAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, business_name, slug, owner_id, is_published, strike_paused_at, last_strike_at")
    .eq("id", business_id)
    .maybeSingle();

  if (!business) notFound();

  const standing = await getStrikeStanding(business_id);

  const sinceIso = new Date(Date.now() - STRIKE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: windowDisputes } = await admin
    .from("dispute_inquiries")
    .select("id, reason_code, weight, status, resolved_at, filed_at, reporter_email, reporter_type, admin_notes")
    .eq("business_id", business_id)
    .eq("status", "resolved_strike")
    .eq("reporter_type", "client")
    .gte("resolved_at", sinceIso)
    .order("resolved_at", { ascending: false });

  // Plus a small tail of older / dismissed disputes for context.
  const { data: olderDisputes } = await admin
    .from("dispute_inquiries")
    .select("id, reason_code, weight, status, resolved_at, filed_at, reporter_email, reporter_type, admin_notes")
    .eq("business_id", business_id)
    .order("resolved_at", { ascending: false, nullsFirst: false })
    .limit(20);

  const windowList = (windowDisputes ?? []) as DisputeForReview[];
  const recentTail = ((olderDisputes ?? []) as DisputeForReview[])
    .filter((d) => !windowList.find((w) => w.id === d.id))
    .slice(0, 10);

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "—";

  return (
    <div>
      <Link
        href="/dashboard/admin/strikes"
        className="text-xs text-[#737373] underline hover:text-[#0A0A0A]"
      >
        ← All strikes
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {business.business_name}
          </h1>
          <p className="mt-0.5 text-xs text-[#737373]">/s/{business.slug}</p>
        </div>
        {standing.isPaused ? (
          <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-700">
            Strike-paused
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Active
          </span>
        )}
      </div>

      <section className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
          Standing (rolling {STRIKE_WINDOW_DAYS}-day window)
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Active strikes"
            value={`${standing.count} / ${standing.thresholdCount}`}
          />
          <Stat
            label="Weighted total"
            value={`${standing.weightedTotal} / ${standing.thresholdWeighted}`}
          />
          <Stat label="Paused at" value={fmtDate(standing.pausedAt?.toISOString() ?? null)} />
        </div>
        {standing.isPaused && (
          <div className="mt-4 border-t border-[#F5F5F4] pt-4">
            <UnpauseButton businessId={business.id} />
            <p className="mt-2 text-[11px] text-[#737373]">
              Unpausing clears the pause marker and re-publishes the storefront. Past dispute
              records remain. Strikes inside the {STRIKE_WINDOW_DAYS}-day window still display
              in the pro&apos;s standing until they age out naturally.
            </p>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
          Strikes within the window ({windowList.length})
        </h2>
        <div className="mt-3 space-y-2">
          {windowList.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#E7E5E4] p-5 text-center text-xs text-[#737373]">
              No strikes within the rolling window.
            </div>
          ) : (
            windowList.map((d) => <DisputeRow key={d.id} dispute={d} />)
          )}
        </div>
      </section>

      {recentTail.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
            Older / non-strike history
          </h2>
          <div className="mt-3 space-y-2 opacity-80">
            {recentTail.map((d) => <DisputeRow key={d.id} dispute={d} />)}
          </div>
        </section>
      )}
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

function DisputeRow({ dispute }: { dispute: DisputeForReview }) {
  return (
    <Link
      href={`/dashboard/admin/disputes/${dispute.id}`}
      className="block rounded-lg border border-[#E7E5E4] bg-white p-4 hover:border-[#B8896B]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{REASON_LABELS[dispute.reason_code]}</p>
          <p className="mt-0.5 text-[11px] text-[#737373]">
            {dispute.reporter_type === "client" ? "Client-filed" : "Pro-filed"} · weight{" "}
            {dispute.weight} · resolved {dispute.resolved_at
              ? new Date(dispute.resolved_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
        <span className="rounded-full bg-[#FAFAF9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#525252]">
          {dispute.status.replace("resolved_", "")}
        </span>
      </div>
      {dispute.admin_notes && (
        <p className="mt-2 text-[11px] text-[#737373] line-clamp-2">
          &ldquo;{dispute.admin_notes}&rdquo;
        </p>
      )}
    </Link>
  );
}
