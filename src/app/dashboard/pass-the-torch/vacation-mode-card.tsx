"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Palmtree, AlertCircle } from "lucide-react";
import { updateVacationMode } from "./actions";

const VACATION_MESSAGE_MAX = 200;

const inputCls =
  "block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] focus:border-[#B8896B] focus:outline-none";

function toLocalDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // YYYY-MM-DD in local time, suitable for <input type="date">.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromLocalDateInput(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  // Anchor start = midnight local; end = 23:59:59 local. Avoids the
  // "ends on the same day at 00:00 = zero-length window" pitfall.
  const date = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
  return date.toISOString();
}

type Props = {
  start: string | null;
  end: string | null;
  message: string | null;
};

export function VacationModeCard({ start, end, message }: Props) {
  const [startDate, setStartDate] = useState(toLocalDateInput(start));
  const [endDate, setEndDate] = useState(toLocalDateInput(end));
  const [msg, setMsg] = useState(message ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, start_] = useTransition();

  const isActive = useMemo(() => {
    if (!start || !end) return false;
    const now = Date.now();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return now >= s && now <= e;
  }, [start, end]);

  const previewLabel = useMemo(() => {
    if (!startDate || !endDate) return "";
    const s = new Date(startDate);
    const e = new Date(endDate);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(s)} – ${fmt(e)}`;
  }, [startDate, endDate]);

  function handleSave() {
    setError(null);
    setSavedAt(null);

    // Both empty = clear vacation. Both filled = set. Mixed = error.
    if ((!!startDate) !== (!!endDate)) {
      setError("Set both a start and end date, or clear both.");
      return;
    }
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      setError("End date must be after start date.");
      return;
    }

    const startIso = fromLocalDateInput(startDate, false);
    const endIso = fromLocalDateInput(endDate, true);

    start_(async () => {
      const result = await updateVacationMode({
        start: startIso,
        end: endIso,
        message: msg.trim() || null,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  function handleClear() {
    setStartDate("");
    setEndDate("");
    setMsg("");
    start_(async () => {
      const result = await updateVacationMode({ start: null, end: null, message: null });
      if ("error" in result) setError(result.error);
      else setSavedAt(Date.now());
    });
  }

  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <div className="flex items-center gap-2">
        <Palmtree size={16} className="text-[#B8896B]" />
        <h2 className="text-sm font-medium text-[#0A0A0A]">Vacation Mode</h2>
        {isActive && (
          <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-medium text-[#92400E]">
            Active now
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#737373]">
        While you&apos;re away, your storefront shows a banner and surfaces
        your trusted pros under it.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="vac-start" className="text-xs font-medium text-[#525252]">
            Start
          </label>
          <input
            id="vac-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`${inputCls} mt-1`}
          />
        </div>
        <div>
          <label htmlFor="vac-end" className="text-xs font-medium text-[#525252]">
            End
          </label>
          <input
            id="vac-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`${inputCls} mt-1`}
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-end justify-between">
          <label htmlFor="vac-msg" className="text-xs font-medium text-[#525252]">
            Banner message <span className="font-normal text-[#A3A3A3]">(optional)</span>
          </label>
          <span className="text-[11px] text-[#A3A3A3]">
            {msg.length}/{VACATION_MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id="vac-msg"
          value={msg}
          onChange={(e) => setMsg(e.target.value.slice(0, VACATION_MESSAGE_MAX))}
          placeholder="Back next Monday — see who I trust below."
          rows={2}
          className={`${inputCls} mt-1 resize-y`}
        />
      </div>

      {previewLabel && (
        <div className="mt-3 rounded-md bg-[#FAFAF9] px-3 py-2 text-xs text-[#525252]">
          <span className="font-medium text-[#0A0A0A]">Preview: </span>
          🌴 You&rsquo;re away {previewLabel}.{" "}
          {msg.trim() ? msg.trim() : "While I'm out, see who I trust below."}
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        {savedAt && !error && (
          <span className="mr-auto text-xs text-[#737373]">Saved.</span>
        )}
        {(start || end) && (
          <button
            type="button"
            onClick={handleClear}
            disabled={pending}
            className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4] disabled:opacity-50"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {pending && <Loader2 size={12} className="animate-spin" />}
          Save vacation
        </button>
      </div>
    </div>
  );
}
