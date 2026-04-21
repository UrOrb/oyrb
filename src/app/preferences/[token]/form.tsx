"use client";

import { useState, useTransition } from "react";

type Props = {
  token: string;
  initialRebook: boolean;
  initialMarketing: boolean;
  unsubscribed: boolean;
  deletionRequested: boolean;
};

export function PreferencesForm({ token, initialRebook, initialMarketing, unsubscribed, deletionRequested }: Props) {
  const [rebook, setRebook] = useState(initialRebook && !unsubscribed);
  const [marketing, setMarketing] = useState(initialMarketing && !unsubscribed);
  const [saved, setSaved] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionOk, setDeletionOk] = useState(deletionRequested);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await fetch("/api/public/preferences/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rebook_reminders_enabled: rebook,
          marketing_enabled: marketing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Couldn't save");
        return;
      }
      setSaved(true);
    });
  }

  function unsubAll() {
    setErr(null);
    start(async () => {
      const res = await fetch("/api/public/preferences/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, unsubscribe_all: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Couldn't unsubscribe");
        return;
      }
      setRebook(false);
      setMarketing(false);
      setSaved(true);
    });
  }

  function requestDeletion() {
    if (!confirm("Request data deletion? OYRB support will follow up by email.")) return;
    setErr(null);
    setRequestingDeletion(true);
    start(async () => {
      const res = await fetch("/api/public/preferences/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, request_deletion: true }),
      });
      const data = await res.json();
      setRequestingDeletion(false);
      if (!res.ok) {
        setErr(data.error ?? "Couldn't submit");
        return;
      }
      setDeletionOk(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-sm font-semibold">What you receive</h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={rebook}
              onChange={(e) => setRebook(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <div>
              <span className="font-medium">Rebook reminders</span>
              <p className="mt-0.5 text-xs text-[#737373]">
                Occasional &quot;ready to rebook?&quot; emails from pros you&apos;ve visited.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <div>
              <span className="font-medium">Marketing</span>
              <p className="mt-0.5 text-xs text-[#737373]">
                Product updates from OYRB. Off by default.
              </p>
            </div>
          </label>
          <p className="text-xs text-[#737373]">
            Booking confirmations are transactional and always sent.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-full bg-[#0A0A0A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save preferences"}
          </button>
          <button
            onClick={unsubAll}
            disabled={pending}
            className="rounded-full border border-[#E7E5E4] px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF9] disabled:opacity-50"
          >
            Unsubscribe from everything
          </button>
        </div>
        {saved && <p className="mt-3 text-xs text-green-700">Saved ✓</p>}
        {err && <p className="mt-3 text-xs text-red-700">{err}</p>}
      </div>

      <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-sm font-semibold">Request data deletion</h2>
        <p className="mt-2 text-xs text-[#737373]">
          Submit a ticket to OYRB support and we&apos;ll delete your booking data. Your pros will
          lose access to your history with them.
        </p>
        {deletionOk ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Deletion requested. Our team will email you within 7 business days.
          </p>
        ) : (
          <button
            onClick={requestDeletion}
            disabled={pending || requestingDeletion}
            className="mt-3 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {requestingDeletion ? "Submitting…" : "Request data deletion"}
          </button>
        )}
      </div>
    </div>
  );
}
