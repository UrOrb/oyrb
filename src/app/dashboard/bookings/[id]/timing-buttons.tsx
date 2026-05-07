"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Play, Square, Clock } from "lucide-react";

/**
 * Phase 3 — Service timing card. Renders in the booking detail page
 * stack between BookingServiceCard and BookingActionsPanel.
 *
 * Three visual states (driven by the two timestamps):
 *   1. Both NULL                   → "Start service" button only
 *   2. started set, ended NULL     → "Started at HH:MM" + "Stop service" button
 *   3. Both set                    → "HH:MM → HH:MM (duration: Xm)" badge, no buttons
 *
 * The card is rendered ONLY for confirmed bookings (gated at the page
 * level). Pending / cancelled / completed bookings hide it entirely.
 *
 * Idempotency: after the first Start tap, the local state transitions
 * immediately (optimistic) so a misclick doesn't show the Start button
 * again. The API also wins-on-first-write atomically — the second tap
 * gets back the original timestamp.
 *
 * No undo. The spec is explicit: a pro who taps in error lives with
 * it. Future phase could add admin override; for v1, the buttons are
 * the only writers.
 */
type Props = {
  bookingId: string;
  initialStartedAt: string | null;
  initialEndedAt: string | null;
};

export function TimingButtons({ bookingId, initialStartedAt, initialEndedAt }: Props) {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt);
  const [endedAt, setEndedAt] = useState<string | null>(initialEndedAt);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/timing/start`, {
          method: "POST",
        });
        const json = (await res.json()) as {
          service_started_at?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(json.error ?? "Couldn't start the service timer.");
          return;
        }
        if (json.service_started_at) {
          setStartedAt(json.service_started_at);
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  function handleStop() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/timing/stop`, {
          method: "POST",
        });
        const json = (await res.json()) as {
          service_started_at?: string;
          service_ended_at?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(json.error ?? "Couldn't stop the service timer.");
          return;
        }
        if (json.service_ended_at) {
          setEndedAt(json.service_ended_at);
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center gap-2">
        <Clock size={16} className="text-[#737373]" />
        <h2 className="text-base font-semibold">Service timing</h2>
      </header>
      <p className="mt-1 text-xs text-[#737373]">
        Optional. Tap Start when the client arrives, Stop when you finish — feeds your time
        and profit-per-minute analytics later. Skipping is fine.
      </p>

      <div className="mt-4">
        {!startedAt && !endedAt && <NotStartedState pending={pending} onStart={handleStart} />}
        {startedAt && !endedAt && (
          <InProgressState startedAt={startedAt} pending={pending} onStop={handleStop} />
        )}
        {startedAt && endedAt && <CompleteState startedAt={startedAt} endedAt={endedAt} />}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
    </section>
  );
}

function NotStartedState({ pending, onStart }: { pending: boolean; onStart: () => void }) {
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
    >
      <Play size={12} fill="currentColor" /> {pending ? "Starting…" : "Start service"}
    </button>
  );
}

function InProgressState({
  startedAt,
  pending,
  onStop,
}: {
  startedAt: string;
  pending: boolean;
  onStop: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        title={new Date(startedAt).toLocaleString()}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        Started at {fmtTime(startedAt)}
      </span>
      <button
        type="button"
        onClick={onStop}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-semibold text-[#0A0A0A] hover:border-[#B8896B] disabled:opacity-50"
      >
        <Square size={11} fill="currentColor" /> {pending ? "Stopping…" : "Stop service"}
      </button>
    </div>
  );
}

function CompleteState({ startedAt, endedAt }: { startedAt: string; endedAt: string }) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  return (
    <div
      title={`Started ${start.toLocaleString()} · Ended ${end.toLocaleString()}`}
      className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-[#FAFAF9] px-3 py-2 text-xs text-[#525252]"
    >
      <Clock size={12} className="text-[#737373]" />
      <span className="font-semibold text-[#0A0A0A]">
        {fmtTime(startedAt)} → {fmtTime(endedAt)}
      </span>
      <span className="text-[#737373]">· {fmtDuration(durationMin)}</span>
    </div>
  );
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
