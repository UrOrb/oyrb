import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  REASON_LABELS,
  STATUS_LABELS,
  type DisputeStatus,
  type ReasonCode,
} from "@/lib/disputes";
import { CounterEvidenceForm } from "./counter-evidence-form";

export const metadata = { title: "Dispute Inquiry — OYRB" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

type DisputeDetail = {
  id: string;
  booking_id: string;
  business_id: string;
  reporter_type: "client" | "pro";
  reason_code: ReasonCode;
  reason_detail: string | null;
  status: DisputeStatus;
  weight: number;
  filed_at: string;
  counter_deadline: string;
  resolved_at: string | null;
  evidence_urls: string[];
  counter_evidence_urls: string[];
  priority_review_flag: boolean;
  bookings: { start_at: string; clients: { name: string } | { name: string }[] | null } | null;
  businesses: { owner_id: string; business_name: string } | null;
};

export default async function ProDisputeDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use admin client for this read since RLS allows pro SELECT but
  // we want to apply our own owner check + 404 leak protection.
  const admin = createAdminClient();
  const { data } = await admin
    .from("dispute_inquiries")
    .select(`
      id, booking_id, business_id, reporter_type, reason_code, reason_detail,
      status, weight, filed_at, counter_deadline, resolved_at,
      evidence_urls, counter_evidence_urls, priority_review_flag,
      bookings(start_at, clients(name)),
      businesses(owner_id, business_name)
    `)
    .eq("id", id)
    .maybeSingle();

  const dispute = data as unknown as DisputeDetail | null;
  if (!dispute || !dispute.businesses || dispute.businesses.owner_id !== user.id) {
    notFound();
  }

  const filed = new Date(dispute.filed_at);
  const deadline = new Date(dispute.counter_deadline);
  const now = new Date();
  const hoursRemaining = Math.max(
    0,
    Math.round((deadline.getTime() - now.getTime()) / (60 * 60 * 1000)),
  );
  const clientObj = Array.isArray(dispute.bookings?.clients)
    ? dispute.bookings?.clients[0] ?? null
    : dispute.bookings?.clients ?? null;
  const clientName = clientObj?.name ?? "Client";
  const reporterDisplay = dispute.reporter_type === "client" ? clientName : "You (the pro)";

  const statusCls =
    dispute.status === "resolved_strike"
      ? "bg-red-50 text-red-700"
      : dispute.status === "resolved_dismissed"
        ? "bg-emerald-50 text-emerald-700"
        : dispute.status === "awaiting_counter"
          ? "bg-amber-50 text-amber-700"
          : "bg-blue-50 text-blue-700";

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Link
        href="/dashboard/disputes"
        className="inline-flex items-center gap-1 text-xs font-medium text-[#737373] hover:text-[#0A0A0A]"
      >
        ← Back to inquiries
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
            {REASON_LABELS[dispute.reason_code]}
          </h1>
          <p className="mt-1 text-sm text-[#525252]">
            Filed by <strong>{reporterDisplay}</strong> on{" "}
            {filed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusCls}`}>
          {STATUS_LABELS[dispute.status]}
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {/* Reason detail (always visible) */}
        {dispute.reason_detail && (
          <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
            <h2 className="text-base font-semibold">What the reporter said</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#525252]">
              {dispute.reason_detail}
            </p>
          </section>
        )}

        {/* Reporter evidence section: NEVER expose the file URLs to the
            opposing side. Only show the count + a privacy note. The
            admin (Halania) sees both sides via the admin queue. */}
        {dispute.reporter_type === "client" && (
          <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
            <h2 className="text-base font-semibold">Reporter evidence</h2>
            <p className="mt-2 text-sm text-[#525252]">
              {dispute.evidence_urls.length === 0
                ? "No files were uploaded by the reporter."
                : `The reporter uploaded ${dispute.evidence_urls.length} file${dispute.evidence_urls.length === 1 ? "" : "s"}. For privacy, OYRB does not surface the reporter's evidence to you. OYRB will review documentation from both sides when the counter-evidence window closes.`}
            </p>
          </section>
        )}

        {/* Counter-evidence section */}
        <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
          <h2 className="text-base font-semibold">Your counter-evidence</h2>
          {dispute.status === "awaiting_counter" ? (
            <>
              <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <strong>You have ~{hoursRemaining} hour{hoursRemaining === 1 ? "" : "s"} left.</strong>{" "}
                Window closes {deadline.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
              </div>
              {dispute.counter_evidence_urls.length > 0 && (
                <div className="mt-4 rounded-md bg-[#FAFAF9] p-3 text-xs text-[#525252]">
                  Already uploaded: <strong>{dispute.counter_evidence_urls.length}</strong> file
                  {dispute.counter_evidence_urls.length === 1 ? "" : "s"}. You can add more below.
                </div>
              )}
              <div className="mt-4">
                <CounterEvidenceForm
                  disputeId={dispute.id}
                  existingPaths={dispute.counter_evidence_urls}
                />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-[#525252]">
              The counter-evidence window has closed.
              {dispute.counter_evidence_urls.length > 0
                ? ` You uploaded ${dispute.counter_evidence_urls.length} file${dispute.counter_evidence_urls.length === 1 ? "" : "s"}.`
                : " No counter-evidence was uploaded."}
            </p>
          )}
        </section>

        {/* Disclosure */}
        <section className="rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-6">
          <p className="text-xs leading-relaxed text-[#525252]">
            <strong className="text-[#0A0A0A]">OYRB does not process refunds.</strong> The Dispute
            Inquiry system affects ratings only — it isn&apos;t a refund or arbitration tool. See{" "}
            <Link href="/terms#section-28" className="underline hover:text-[#0A0A0A]">
              Terms of Service §28
            </Link>{" "}
            for the full process.
          </p>
        </section>
      </div>
    </div>
  );
}
