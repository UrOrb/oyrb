"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, X } from "lucide-react";

type Props = { bookingId: string };

/**
 * Pro-side reschedule control on the booking detail page.
 *
 * Two render modes:
 *   - Collapsed → chip button matching the other actions-panel chips
 *   - Expanded → full-width inline form with a datetime-local picker
 *
 * Pattern matches the manual-booking form's expander (Phase 1.1) so
 * the detail page's visual rhythm stays consistent. Clicking "Save new
 * time" triggers a confirm() dialog before POSTing, then routes
 * router.refresh() on success so the detail page (and notification
 * timeline) re-render with the new time + the new booking_rescheduled_by_pro
 * notification_log row.
 */
export function RescheduleBookingButton({ bookingId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setError(null);
    setNewStart("");
  }

  function submit() {
    if (!newStart) {
      setError("Pick a new date and time first.");
      return;
    }
    const parsed = new Date(newStart);
    if (isNaN(parsed.getTime())) {
      setError("Couldn't parse that date and time. Try again.");
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      setError("Pick a time in the future.");
      return;
    }
    if (
      !confirm(
        "Reschedule this booking? The client will receive an email about the change.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      // datetime-local emits "YYYY-MM-DDTHH:mm" without a timezone —
      // new Date() interprets that as local time. toISOString() converts
      // to UTC so the server parses unambiguously regardless of where
      // it runs.
      const isoUtc = new Date(newStart).toISOString();
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_start_at: isoUtc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't reschedule. Try a different time.");
        return;
      }
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
      >
        <Calendar size={12} /> Reschedule
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Reschedule booking</p>
        <button
          type="button"
          onClick={reset}
          className="text-[#737373] hover:text-[#0A0A0A]"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
      <p className="mt-1 text-xs text-[#737373]">
        The client will be emailed with the new time. Service duration stays
        the same; only the start time changes.
      </p>

      <label className="mt-3 block text-xs text-[#525252]">
        New date &amp; time
        <input
          type="datetime-local"
          value={newStart}
          onChange={(e) => setNewStart(e.target.value)}
          className="mt-1 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm focus:border-[#B8896B] focus:outline-none"
        />
      </label>

      {error && (
        <div role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="rounded-full border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#FAFAF9] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !newStart}
          className="rounded-full bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save new time"}
        </button>
      </div>
    </div>
  );
}
