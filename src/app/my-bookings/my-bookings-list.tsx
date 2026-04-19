"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, RotateCcw, X, Phone, Mail } from "lucide-react";

type Row = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  deposit_paid: boolean;
  series_id: string | null;
  series_interval_weeks: number | null;
  services: {
    name: string;
    duration_minutes: number;
    price_cents: number;
    deposit_cents: number;
  } | null;
  businesses: {
    business_name: string;
    slug: string;
    phone: string | null;
    contact_email: string | null;
  } | null;
};

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function fmtWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MyBookingsList({ upcoming, past }: { upcoming: Row[]; past: Row[] }) {
  return (
    <div className="mt-10 space-y-10">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#737373]">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#E7E5E4] bg-white p-6 text-center text-xs text-[#737373]">
            No upcoming appointments.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b} tense="upcoming" />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#737373]">
            Past ({past.length})
          </h2>
          <div className="space-y-3">
            {past.slice(0, 10).map((b) => (
              <BookingCard key={b.id} booking={b} tense="past" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({ booking, tense }: { booking: Row; tense: "upcoming" | "past" }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(booking.status === "cancelled");
  const [error, setError] = useState<string | null>(null);

  const biz = booking.businesses;
  const svc = booking.services;
  if (!biz || !svc) return null;

  const cancel = async () => {
    if (!confirm("Cancel this appointment? This can't be undone.")) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/my-bookings/${booking.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Couldn't cancel. Try again.");
      else setCancelled(true);
    } catch {
      setError("Connection issue.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      className={`rounded-lg border bg-white p-5 ${
        cancelled ? "border-[#E7E5E4] opacity-60" : "border-[#E7E5E4]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[#B8896B]">
              {biz.business_name}
            </p>
            {booking.series_id && booking.series_interval_weeks && (
              <span className="rounded-full bg-[#B8896B]/15 px-2 py-0.5 text-[10px] font-semibold text-[#B8896B]">
                ↻ every {booking.series_interval_weeks}w
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display text-lg font-medium">{svc.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#525252]">
            <Calendar size={13} /> {fmtWhen(booking.start_at)}
          </p>
          <p className="mt-2 text-xs text-[#737373]">
            {svc.duration_minutes} min · {fmtPrice(svc.price_cents)}
            {booking.deposit_paid && svc.deposit_cents > 0 && (
              <>
                {" "}
                · <span className="text-green-700">Deposit paid ({fmtPrice(svc.deposit_cents)})</span>
              </>
            )}
          </p>
          {cancelled && (
            <p className="mt-2 inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              Cancelled
            </p>
          )}
          {(biz.phone || biz.contact_email) && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#737373]">
              {biz.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={11} /> {biz.phone}
                </span>
              )}
              {biz.contact_email && (
                <span className="inline-flex items-center gap-1">
                  <Mail size={11} /> {biz.contact_email}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {tense === "upcoming" && !cancelled && (
            <>
              <Link
                href={`/s/${biz.slug}?reschedule=${booking.id}`}
                className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
              >
                Reschedule
              </Link>
              <button
                type="button"
                onClick={cancel}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <X size={11} />
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            </>
          )}
          {tense === "past" && (
            <Link
              href={`/s/${biz.slug}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white"
            >
              <RotateCcw size={11} />
              Rebook
            </Link>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </div>
  );
}
