import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import {
  REASON_LABELS,
  STATUS_LABELS,
  FILEABLE_BOOKING_STATUSES,
  type DisputeStatus,
  type ReasonCode,
} from "@/lib/disputes";
import { ProFileDisputeForm } from "./pro-file-dispute-form";

/**
 * Per-booking Dispute Inquiry summary card. Renders inside the pro-side
 * booking detail page's vertical stack.
 *
 * Shows existing inquiries (either side) for this booking, then — only
 * when no pro-filed inquiry exists yet AND the booking is in a fileable
 * status — surfaces a low-prominence affordance to file one.
 *
 * "Low-prominence" is intentional: disputes are an escape hatch, not a
 * promoted feature. The link sits below existing inquiries, uses a
 * tertiary visual weight, and only mentions "File a Dispute Inquiry"
 * once.
 */
type Props = {
  bookingId: string;
  bookingStatus: string;
  clientName: string;
};

type DisputeRow = {
  id: string;
  reporter_type: "client" | "pro";
  reason_code: ReasonCode;
  status: DisputeStatus;
  filed_at: string;
  counter_deadline: string;
  resolved_at: string | null;
};

export async function DisputeInquiryPanel({ bookingId, bookingStatus, clientName }: Props) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("dispute_inquiries")
    .select("id, reporter_type, reason_code, status, filed_at, counter_deadline, resolved_at")
    .eq("booking_id", bookingId)
    .order("filed_at", { ascending: false });

  const rows = (data ?? []) as DisputeRow[];
  const proFiled = rows.find((r) => r.reporter_type === "pro");
  const eligibleToFile = !proFiled && FILEABLE_BOOKING_STATUSES.includes(bookingStatus);

  if (rows.length === 0 && !eligibleToFile) {
    // Nothing to show — booking isn't fileable and there's no history.
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Dispute Inquiries
        </h2>
        {rows.length > 0 && (
          <span className="text-[11px] text-[#A3A3A3]">{rows.length} on file</span>
        )}
      </header>

      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/disputes/${r.id}`}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-3 text-sm hover:border-[#B8896B]"
              >
                <div>
                  <p className="font-medium text-[#0A0A0A]">{REASON_LABELS[r.reason_code]}</p>
                  <p className="mt-0.5 text-[11px] text-[#737373]">
                    {r.reporter_type === "pro" ? "You filed" : `${clientName} filed`} · Filed{" "}
                    {new Date(r.filed_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#525252]">
                  {STATUS_LABELS[r.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {eligibleToFile && (
        <div className="mt-4 border-t border-[#E7E5E4] pt-4">
          <ProFileDisputeForm bookingId={bookingId} clientName={clientName} />
        </div>
      )}
    </section>
  );
}
