"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PRO_REASON_CODES,
  REASON_LABELS,
  MIN_OTHER_DETAIL_CHARS,
  reasonRequiresDetail,
  type ReasonCode,
} from "@/lib/disputes";

/**
 * Pro-side dispute filing — inline expander on the booking detail page.
 *
 * v1 scope: reason + reason_detail only (no file upload). Pros can
 * email support@oyrb.space with attachments if they have evidence,
 * and the dispute detail page already exposes counter-evidence upload
 * for the responding side. The pro-reporter evidence-upload UI is
 * deferred to a follow-up PR; admins can still resolve a pro-filed
 * inquiry using just the reason + detail text per Section 28's "weight
 * of evidence" framing.
 */
type Props = {
  bookingId: string;
  clientName: string;
};

export function ProFileDisputeForm({ bookingId, clientName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<ReasonCode | "">("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailRequired = reasonCode ? reasonRequiresDetail(reasonCode as ReasonCode) : false;
  const detailMissing =
    detailRequired && reasonDetail.trim().length < MIN_OTHER_DETAIL_CHARS;

  const submitDisabled = !reasonCode || detailMissing || submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonCode) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}/dispute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason_code: reasonCode, reason_detail: reasonDetail.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Couldn't file the inquiry.");
        setSubmitting(false);
        return;
      }
      // Refresh the panel so the new dispute shows in the list, then
      // route the pro to the dispute detail page.
      router.refresh();
      if (json.id) {
        router.push(`/dashboard/disputes/${json.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div>
        <p className="text-xs text-[#737373]">
          Need to file a Dispute Inquiry about {clientName}? Affects their reputation only — OYRB
          does not process refunds.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 text-xs text-[#B8896B] underline hover:text-[#0A0A0A]"
        >
          File a Dispute Inquiry →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-[#737373]">
        File only when something genuinely went wrong. Per Section 28 of our Terms, OYRB does not
        process refunds — Dispute Inquiries affect reputation only and are reviewed by our team
        before any strike is applied. {clientName} has 48 hours to submit counter-evidence.
      </p>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">
          Reason
        </label>
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
          className="mt-1 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm"
          required
        >
          <option value="">Choose a reason…</option>
          {PRO_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {REASON_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      {reasonCode && (
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#525252]">
            What happened?{" "}
            {detailRequired ? (
              <span className="text-[#B8896B]">required</span>
            ) : (
              <span className="text-[#A3A3A3]">optional</span>
            )}
          </label>
          <textarea
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value.slice(0, 1000))}
            rows={4}
            placeholder={
              detailRequired
                ? `Describe what happened — minimum ${MIN_OTHER_DETAIL_CHARS} characters.`
                : "Add any context that would help our review (optional)."
            }
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[10px] text-[#A3A3A3]">{reasonDetail.length}/1000</p>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Filing…" : "File Inquiry"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReasonCode("");
            setReasonDetail("");
            setError(null);
          }}
          disabled={submitting}
          className="rounded-full border border-[#E7E5E4] px-4 py-2 text-xs font-semibold hover:bg-[#FAFAF9]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
