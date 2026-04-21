"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
  proSiteUrl: string;
  businessName: string;
};

export function BookingActions({ token, proSiteUrl, businessName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function cancel() {
    setErr(null);
    start(async () => {
      const res = await fetch(`/api/public/bookings/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Couldn't cancel — reach out to your pro directly.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-[#E7E5E4] pt-4">
      <div className="flex flex-wrap gap-2">
        <a
          href={proSiteUrl}
          className="inline-flex items-center rounded-full border border-[#E7E5E4] px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF9]"
        >
          Reschedule on {businessName}&apos;s site
        </a>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center rounded-full border border-[#E7E5E4] px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Cancel appointment
          </button>
        )}
      </div>

      {confirming && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50/50 p-4">
          <p className="text-sm font-medium text-red-900">Cancel this appointment?</p>
          <p className="mt-1 text-xs text-red-800">
            Cancellation is subject to {businessName}&apos;s policy. A deposit may be non-refundable.
          </p>
          <label className="mt-3 block text-xs font-medium text-red-900">
            Reason (optional — helps the pro)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm"
          />
          {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={cancel}
              disabled={pending}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Cancelling…" : "Yes, cancel"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Keep appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
