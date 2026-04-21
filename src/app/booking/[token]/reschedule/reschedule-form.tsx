"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DaySlots = {
  dateIso: string;
  slots: string[]; // Each slot is an ISO timestamp — the start.
};

type Props = {
  token: string;
  daySlots: DaySlots[];
  durationMin: number;
  cancelHref: string;
};

export function RescheduleForm({ token, daySlots, cancelHref }: Props) {
  const firstDayWithSlots = daySlots.find((d) => d.slots.length > 0);
  const [selectedDay, setSelectedDay] = useState<string | null>(
    firstDayWithSlots?.dateIso ?? null,
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    return daySlots.find((d) => d.dateIso === selectedDay)?.slots ?? [];
  }, [daySlots, selectedDay]);

  const submit = () => {
    if (!selectedSlot) return;
    setErr(null);
    start(async () => {
      try {
        const res = await fetch("/api/public/bookings/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, new_start_at: selectedSlot }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(data.error ?? `Couldn't reschedule (HTTP ${res.status}).`);
          return;
        }
        router.replace(`/booking/${token}?rescheduled=1`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Network error");
      }
    });
  };

  if (daySlots.every((d) => d.slots.length === 0)) {
    return (
      <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
        <p className="text-sm text-[#525252]">
          No open slots in the next 3 weeks. Please contact your beauty pro
          directly to reschedule.
        </p>
        <Link
          href={cancelHref}
          className="mt-4 inline-block text-xs text-[#A3A3A3] underline"
        >
          ← Back to my booking
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
        Pick a date
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {daySlots.map((d) => {
          const date = new Date(d.dateIso);
          const isSel = selectedDay === d.dateIso;
          const disabled = d.slots.length === 0;
          return (
            <button
              key={d.dateIso}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedDay(d.dateIso);
                setSelectedSlot(null);
              }}
              className="rounded-md border px-1.5 py-2 text-center text-xs disabled:opacity-40"
              style={{
                borderColor: isSel ? "#B8896B" : "#E7E5E4",
                backgroundColor: isSel ? "#B8896B15" : undefined,
              }}
            >
              <p className="font-medium">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p className="mt-0.5 text-base font-semibold">{date.getDate()}</p>
              <p className="text-[10px] text-[#737373]">
                {date.toLocaleDateString("en-US", { month: "short" })}
              </p>
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <>
          <p className="mt-6 text-[11px] font-medium uppercase tracking-wider text-[#737373]">
            Available times
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {slotsForSelectedDay.length === 0 && (
              <p className="col-span-3 text-xs text-[#737373]">
                No open times on this day.
              </p>
            )}
            {slotsForSelectedDay.map((iso) => {
              const isSel = selectedSlot === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedSlot(iso)}
                  className="rounded-md border py-2 text-xs font-medium"
                  style={{
                    borderColor: isSel ? "#B8896B" : "#E7E5E4",
                    backgroundColor: isSel ? "#B8896B15" : undefined,
                  }}
                >
                  {new Date(iso).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </button>
              );
            })}
          </div>
        </>
      )}

      {err && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {err}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#E7E5E4] pt-4">
        <Link
          href={cancelHref}
          className="rounded-full border border-[#E7E5E4] px-4 py-2 text-xs font-semibold hover:bg-[#FAFAF9]"
        >
          ← Back
        </Link>
        <button
          type="button"
          onClick={submit}
          disabled={!selectedSlot || pending}
          className="rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-white hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Rescheduling…" : "Confirm new time"}
        </button>
      </div>
    </div>
  );
}
