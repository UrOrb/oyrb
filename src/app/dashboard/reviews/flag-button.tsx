"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate language" },
  { value: "false_info", label: "False information" },
  { value: "offensive", label: "Offensive / discriminatory" },
  { value: "other", label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

export function FlagReviewButton({
  reviewId,
  disabled,
}: {
  reviewId: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("spam");
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    start(async () => {
      try {
        const res = await fetch("/api/dashboard/reviews/flag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_id: reviewId, reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus("error");
          setErr(data.error ?? `Couldn't flag (HTTP ${res.status}).`);
          return;
        }
        setStatus("sent");
        setOpen(false);
      } catch (e) {
        setStatus("error");
        setErr(e instanceof Error ? e.message : "Network error");
      }
    });
  };

  if (status === "sent") {
    return (
      <span className="text-[11px] font-medium text-amber-800">Flagged — admin notified</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] px-2.5 py-1 text-[11px] font-medium text-[#737373] hover:border-amber-300 hover:text-amber-700 disabled:opacity-50"
        title="Flag for admin review"
      >
        <Flag size={10} /> Flag
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-[11px] font-medium text-amber-900">
        Flag for admin review. The review stays live until admin decides.
      </p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as Reason)}
        className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-xs"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-[#E7E5E4] bg-white px-2.5 py-1 text-[11px] font-medium"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Flagging…" : "Flag"}
        </button>
      </div>
      {err && <span className="max-w-[220px] text-[10px] text-red-700">{err}</span>}
    </div>
  );
}
