"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X, Info } from "lucide-react";
import { createManualBooking, type SuppressedClientFields } from "./actions";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
};

export function NewBookingForm({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // After a successful save, if the pro typed values that conflicted
  // with the existing client's curated fields, the action returns a
  // `suppressed` summary. We keep the form open and surface a notice
  // with a link to the client edit page instead of silently closing.
  const [suppressed, setSuppressed] = useState<SuppressedClientFields | null>(null);

  function reset() {
    setOpen(false);
    setError(null);
    setSuppressed(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuppressed(null);
    startTransition(async () => {
      const result = await createManualBooking(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (result.suppressed) {
        // Saved, but flag the per-field conflicts so the pro knows
        // their typed phone/name didn't update the client record.
        setSuppressed(result.suppressed);
        return;
      }
      reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626]"
      >
        <Plus size={14} /> New booking
      </button>
    );
  }

  if (services.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#E7E5E4] bg-white p-4 text-xs text-[#737373]">
        Add a service first — manual bookings require an existing service.
        <button
          type="button"
          onClick={reset}
          className="ml-2 underline hover:text-[#0A0A0A]"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Add a manual booking</h3>
        <button
          type="button"
          onClick={reset}
          className="text-[#737373] hover:text-[#0A0A0A]"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mt-1 text-xs text-[#737373]">
        For walk-ins or appointments booked via DM/phone. We&apos;ll check for time conflicts before saving.
      </p>

      <form action={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs sm:col-span-2">
          <span className="text-[#525252]">Service</span>
          <select
            name="service_id"
            required
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-2 py-1.5 text-sm"
          >
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.duration_minutes} min
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs">
          <span className="text-[#525252]">Date</span>
          <input
            name="date"
            type="date"
            required
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-xs">
          <span className="text-[#525252]">Time</span>
          <input
            name="time"
            type="time"
            required
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-xs sm:col-span-2">
          <span className="text-[#525252]">Client name</span>
          <input
            name="client_name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-xs">
          <span className="text-[#525252]">
            Email <span className="text-[#A3A3A3]">(optional)</span>
          </span>
          <input
            name="client_email"
            type="email"
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-2 py-1.5 text-sm"
          />
        </label>

        <label className="text-xs">
          <span className="text-[#525252]">
            Phone <span className="text-[#A3A3A3]">(optional)</span>
          </span>
          <input
            name="client_phone"
            type="tel"
            className="mt-1 block w-full rounded-md border border-[#E7E5E4] px-2 py-1.5 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <input name="skip_notifications" type="checkbox" />
          <span className="text-[#525252]">
            Skip notifications — don&apos;t email the client a confirmation
          </span>
        </label>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 sm:col-span-2">
            {error}
          </div>
        )}

        {suppressed && <SuppressedNotice suppressed={suppressed} onDone={reset} />}

        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save booking"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Inline post-save notice. The booking saved fine; what the pro typed
 * for name/phone/notes differed from the existing client's record and
 * was deliberately not applied (booking flow no longer overwrites
 * curated client data — see src/lib/clients/fill-empty.ts). The
 * "Edit client" link drops the pro on the detail page where the
 * change can land properly, including the SMS-consent reset gate
 * for phone changes.
 *
 * Phone is the load-bearing case: the consent implications are real,
 * so we always show that one if present. Name + notes are surfaced
 * for completeness but written more briefly.
 */
function SuppressedNotice({
  suppressed,
  onDone,
}: {
  suppressed: SuppressedClientFields;
  onDone: () => void;
}) {
  const f = suppressed.fields;
  return (
    <div className="rounded-md border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-900 sm:col-span-2">
      <div className="flex items-start gap-2">
        <Info size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <p className="font-medium">Booking saved. Client info wasn&rsquo;t updated.</p>
          {f.phone && (
            <p>
              This client&rsquo;s phone is on file as{" "}
              <span className="font-mono">{f.phone.existing}</span>. To update it, edit the
              client directly — phone changes also reset SMS consent for legal compliance.
            </p>
          )}
          {f.name && !f.phone && (
            <p>
              The name you typed differs from what&rsquo;s on file
              (&ldquo;<span className="font-medium">{f.name.existing}</span>&rdquo;). Edit
              the client to change it.
            </p>
          )}
          {f.name && f.phone && (
            <p>
              The name you typed also differs (on file:{" "}
              &ldquo;<span className="font-medium">{f.name.existing}</span>&rdquo;).
            </p>
          )}
          {f.notes && (
            <p>
              Notes you typed weren&rsquo;t added — the client already has notes on
              file.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={`/dashboard/clients/${suppressed.client_id}`}
              className="inline-flex items-center rounded-md border border-amber-300/70 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-50"
            >
              Edit client
            </Link>
            <button
              type="button"
              onClick={onDone}
              className="text-[11px] text-amber-900/80 underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
