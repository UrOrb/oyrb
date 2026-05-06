import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  REASON_LABELS,
  STATUS_LABELS,
  type DisputeStatus,
  type ReasonCode,
} from "@/lib/disputes";
import { ResolveForm } from "./resolve-form";
import { AlertTriangle, FileText } from "lucide-react";

export const metadata = { title: "Admin · Dispute" };
export const dynamic = "force-dynamic";

type AdminDisputeDetail = {
  id: string;
  booking_id: string;
  business_id: string;
  reporter_type: "client" | "pro";
  reporter_email: string;
  reason_code: ReasonCode;
  reason_detail: string | null;
  status: DisputeStatus;
  weight: number;
  filed_at: string;
  counter_deadline: string;
  resolved_at: string | null;
  admin_notes: string | null;
  evidence_urls: string[];
  counter_evidence_urls: string[];
  priority_review_flag: boolean;
  bookings: {
    start_at: string;
    status: string;
    clients: { name: string; email: string | null } | { name: string; email: string | null }[] | null;
  } | null;
  businesses: { business_name: string; slug: string } | null;
};

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes — admin can review

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-10 text-sm text-[#737373]">
        {gate.error} (HTTP {gate.status})
      </div>
    );
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from("dispute_inquiries")
    .select(`
      id, booking_id, business_id, reporter_type, reporter_email, reason_code, reason_detail,
      status, weight, filed_at, counter_deadline, resolved_at, admin_notes,
      evidence_urls, counter_evidence_urls, priority_review_flag,
      bookings(start_at, status, clients(name, email)),
      businesses(business_name, slug)
    `)
    .eq("id", id)
    .maybeSingle();

  const dispute = data as unknown as AdminDisputeDetail | null;
  if (!dispute) notFound();

  // Mint signed download URLs for both sides' evidence so the admin
  // can click through to view files in the private bucket.
  const reporterFiles = await mintSignedFiles(admin, dispute.evidence_urls);
  const counterFiles = await mintSignedFiles(admin, dispute.counter_evidence_urls);

  const filed = new Date(dispute.filed_at);
  const deadline = new Date(dispute.counter_deadline);
  const clientObj = Array.isArray(dispute.bookings?.clients)
    ? dispute.bookings?.clients[0] ?? null
    : dispute.bookings?.clients ?? null;
  const clientName = clientObj?.name ?? "Client";
  const clientEmail = clientObj?.email ?? "—";
  const businessName = dispute.businesses?.business_name ?? "Business";

  const isResolved =
    dispute.status === "resolved_strike" || dispute.status === "resolved_dismissed";

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Link
        href="/dashboard/admin/disputes"
        className="inline-flex items-center gap-1 text-xs font-medium text-[#737373] hover:text-[#0A0A0A]"
      >
        ← Back to queue
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {dispute.priority_review_flag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700">
                <AlertTriangle size={10} /> Priority
              </span>
            )}
            <h1 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              {REASON_LABELS[dispute.reason_code]}
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#525252]">
            Weight: <strong>{dispute.weight}</strong> · Filed{" "}
            {filed.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            {!isResolved && (
              <> · Counter deadline {deadline.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</>
            )}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
          dispute.status === "resolved_strike" ? "bg-red-50 text-red-700"
            : dispute.status === "resolved_dismissed" ? "bg-emerald-50 text-emerald-700"
              : dispute.status === "awaiting_counter" ? "bg-amber-50 text-amber-700"
                : "bg-blue-50 text-blue-700"
        }`}>
          {STATUS_LABELS[dispute.status]}
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {/* Parties */}
        <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
          <h2 className="text-base font-semibold">Parties</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Reporter</dt>
              <dd className="mt-0.5">
                {dispute.reporter_type === "client" ? clientName : businessName}{" "}
                <span className="text-[#A3A3A3]">({dispute.reporter_type})</span>
              </dd>
              <dd className="mt-0.5 text-xs text-[#737373]">{dispute.reporter_email}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#737373]">Respondent</dt>
              <dd className="mt-0.5">
                {dispute.reporter_type === "client" ? businessName : clientName}{" "}
                <span className="text-[#A3A3A3]">({dispute.reporter_type === "client" ? "pro" : "client"})</span>
              </dd>
              {dispute.reporter_type === "pro" && (
                <dd className="mt-0.5 text-xs text-[#737373]">{clientEmail}</dd>
              )}
            </div>
          </dl>
          <p className="mt-3 text-xs text-[#737373]">
            <Link href={`/dashboard/bookings/${dispute.booking_id}`} className="underline">
              View booking →
            </Link>
          </p>
        </section>

        {/* Reason detail */}
        {dispute.reason_detail && (
          <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
            <h2 className="text-base font-semibold">Reporter's account</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#525252]">{dispute.reason_detail}</p>
          </section>
        )}

        {/* Reporter evidence */}
        <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
          <h2 className="text-base font-semibold">Reporter evidence ({reporterFiles.length})</h2>
          <FileList files={reporterFiles} ttlMinutes={SIGNED_URL_TTL_SECONDS / 60} />
        </section>

        {/* Counter-evidence */}
        <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
          <h2 className="text-base font-semibold">Counter-evidence ({counterFiles.length})</h2>
          <FileList files={counterFiles} ttlMinutes={SIGNED_URL_TTL_SECONDS / 60} />
        </section>

        {/* Resolve */}
        {!isResolved && (
          <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
            <h2 className="text-base font-semibold">Resolve</h2>
            <div className="mt-3">
              <ResolveForm disputeId={dispute.id} />
            </div>
          </section>
        )}

        {isResolved && dispute.admin_notes && (
          <section className="rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-6">
            <h2 className="text-base font-semibold">Resolution notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#525252]">{dispute.admin_notes}</p>
            {dispute.resolved_at && (
              <p className="mt-2 text-xs text-[#A3A3A3]">
                Resolved{" "}
                {new Date(dispute.resolved_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function FileList({
  files,
  ttlMinutes,
}: {
  files: Array<{ path: string; url: string | null; filename: string }>;
  ttlMinutes: number;
}) {
  if (files.length === 0) {
    return <p className="mt-2 text-sm text-[#737373]">No files uploaded.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-[#E7E5E4] rounded-md border border-[#E7E5E4]">
      {files.map((f) => (
        <li key={f.path} className="flex items-center justify-between px-3 py-2 text-xs">
          <span className="flex items-center gap-2 truncate text-[#525252]">
            <FileText size={12} className="shrink-0 text-[#737373]" />
            <span className="truncate">{f.filename}</span>
          </span>
          {f.url ? (
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 shrink-0 rounded-full border border-[#E7E5E4] bg-white px-2.5 py-1 text-[10px] font-medium text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
            >
              Open ({ttlMinutes}m)
            </a>
          ) : (
            <span className="ml-3 shrink-0 text-[10px] text-red-700">unavailable</span>
          )}
        </li>
      ))}
    </ul>
  );
}

async function mintSignedFiles(
  admin: ReturnType<typeof createAdminClient>,
  paths: string[],
): Promise<Array<{ path: string; url: string | null; filename: string }>> {
  const out: Array<{ path: string; url: string | null; filename: string }> = [];
  for (const p of paths) {
    const filename = p.split("/").pop() ?? p;
    try {
      const { data } = await admin.storage
        .from("dispute-evidence")
        .createSignedUrl(p, SIGNED_URL_TTL_SECONDS);
      out.push({ path: p, url: data?.signedUrl ?? null, filename });
    } catch {
      out.push({ path: p, url: null, filename });
    }
  }
  return out;
}
