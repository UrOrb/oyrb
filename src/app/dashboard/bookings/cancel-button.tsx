"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm("Cancel this booking? The customer will receive a notification and any waitlisters will be alerted.")) {
      return;
    }
    start(async () => {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to cancel");
        return;
      }
      const n = data.notified ?? 0;
      setMessage(n > 0 ? `Cancelled · ${n} waitlister(s) notified` : "Cancelled");
      router.refresh();
    });
  }

  if (message) {
    return <span className="text-[10px] text-[#737373]">{message}</span>;
  }

  return (
    <button
      onClick={handleCancel}
      disabled={pending}
      className="rounded-full border border-[#E7E5E4] px-2.5 py-1 text-[10px] font-medium text-[#737373] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      <X size={10} className="mr-0.5 inline" />
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}
