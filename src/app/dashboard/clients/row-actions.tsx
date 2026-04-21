"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";

export function ClientRowActions({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState<"idle" | "sent" | "error" | "blocked">("idle");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function send() {
    setErr(null);
    start(async () => {
      const res = await fetch("/api/dashboard/send-rebook-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) setStatus("blocked");
        else setStatus("error");
        setErr(data.error ?? "Couldn't send");
        return;
      }
      setStatus("sent");
    });
  }

  if (status === "sent") return <span className="text-xs text-green-700">Sent ✓</span>;
  if (status === "blocked") return <span className="text-xs text-[#A3A3A3]">Unsubscribed</span>;

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={send}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] px-3 py-1 text-[11px] font-medium hover:bg-[#FAFAF9] disabled:opacity-50"
        title="Send rebook reminder now"
      >
        <Send size={10} /> {pending ? "Sending…" : "Remind"}
      </button>
      {err && <span className="text-[10px] text-red-700">{err}</span>}
    </div>
  );
}
