"use client";

import { useState } from "react";

type Props = { listingUserIdSlug: string };

export function ReportListingButton({ listingUserIdSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setStatus("sending");
    setErr(null);
    try {
      const res = await fetch("/api/directory/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: listingUserIdSlug, reason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Report failed");
      }
      setStatus("ok");
      setReason("");
    } catch (e) {
      setStatus("err");
      setErr(e instanceof Error ? e.message : "Report failed");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-[#737373] underline hover:text-[#0A0A0A]"
      >
        Report this listing
      </button>
    );
  }

  if (status === "ok") {
    return (
      <p className="text-xs text-green-700">
        Thanks — OYRB will review this listing. Listings reported 3+ times auto-hide pending review.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-[#E7E5E4] bg-[#FAFAF8] p-3">
      <p className="text-xs font-semibold text-[#0A0A0A]">Report this listing</p>
      <p className="mt-0.5 text-[11px] text-[#737373]">
        Tell us what&apos;s wrong — OYRB reviews every report. No visitor PII is logged.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="e.g. contains personal contact info, impersonation, spam…"
        className="mt-2 w-full rounded-md border border-[#E7E5E4] px-2 py-1.5 text-xs"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={status === "sending"}
          className="rounded-md border border-[#E7E5E4] bg-white px-2.5 py-1 text-[11px] text-[#525252] hover:bg-[#F5F5F4]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={status === "sending" || !reason.trim()}
          className="rounded-md bg-[#0A0A0A] px-3 py-1 text-[11px] font-medium text-white hover:opacity-85 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Submit report"}
        </button>
        {err && <span className="text-[11px] text-red-600">{err}</span>}
      </div>
    </div>
  );
}
