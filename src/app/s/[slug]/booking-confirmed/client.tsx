"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { ClientAccountOffer } from "../client-account-offer";

type Status = "checking" | "confirmed" | "error";

export function BookingConfirmedClient({
  slug,
  sessionId,
}: {
  slug: string;
  sessionId: string;
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setError("Missing session ID.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/bookings/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not confirm booking.");
          setStatus("error");
        } else {
          if (typeof data.email === "string") setEmail(data.email);
          setStatus("confirmed");
        }
      } catch {
        if (!cancelled) {
          setError("Network error while confirming.");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      {status === "checking" && (
        <>
          <Loader2 size={32} className="animate-spin text-[#B8896B]" />
          <p className="mt-6 text-sm text-[#525252]">Confirming your booking…</p>
          <p className="mt-2 text-xs text-[#A3A3A3]">Don&rsquo;t refresh — this takes a few seconds.</p>
        </>
      )}

      {status === "confirmed" && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#B8896B]/15">
            <Check size={32} className="text-[#B8896B]" />
          </div>
          <h1 className="font-display mt-6 text-2xl font-medium tracking-tight">
            Booking confirmed ✦
          </h1>
          <p className="mt-3 text-sm text-[#525252]">
            Your deposit was received and your appointment is locked in. A
            confirmation email is on its way.
          </p>
          <Link
            href={`/s/${slug}`}
            className="mt-8 rounded-md border border-[#E7E5E4] px-5 py-2.5 text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F4]"
          >
            Back to the studio
          </Link>
          <div className="mt-6 w-full text-left">
            <ClientAccountOffer email={email} />
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h1 className="font-display mt-6 text-2xl font-medium tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-[#525252]">{error}</p>
          <p className="mt-4 text-xs text-[#737373]">
            Your card may have been charged. Please contact the business or
            email support@oyrb.space and we&rsquo;ll resolve it.
          </p>
          <Link
            href={`/s/${slug}`}
            className="mt-8 rounded-md border border-[#E7E5E4] px-5 py-2.5 text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F4]"
          >
            Back to the studio
          </Link>
        </>
      )}
    </main>
  );
}
