"use client";

import { useState, useTransition } from "react";
import { updateRebookIntervals } from "./actions";
import type { ServiceCategory } from "@/lib/rebook-intervals";

type Row = {
  category: ServiceCategory;
  label: string;
  defaultDays: number;
  currentDays: number;
  overridden: boolean;
};

export function RebookForm({ rows }: { rows: Row[] }) {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(rows.map((r) => [r.category, r.currentDays]))
  );
  const [overridden, setOverridden] = useState<Record<string, boolean>>(
    () => Object.fromEntries(rows.map((r) => [r.category, r.overridden]))
  );
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set(cat: string, n: number) {
    setValues((v) => ({ ...v, [cat]: n }));
    setOverridden((o) => ({ ...o, [cat]: true }));
  }

  function reset(cat: string, defaultDays: number) {
    setValues((v) => ({ ...v, [cat]: defaultDays }));
    setOverridden((o) => ({ ...o, [cat]: false }));
  }

  function save() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const overrides = rows.map((r) => ({
        category: r.category,
        interval_days: overridden[r.category] ? values[r.category] : null,
      }));
      const res = await updateRebookIntervals({ overrides });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <div className="space-y-4">
        {rows.map((r) => {
          const custom = overridden[r.category];
          return (
            <div key={r.category} className="flex items-center justify-between gap-3 border-b border-[#E7E5E4] pb-4 last:border-0">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-[#737373]">
                  Default: {r.defaultDays} days
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={365}
                  value={values[r.category]}
                  onChange={(e) => set(r.category, parseInt(e.target.value, 10) || r.defaultDays)}
                  className="w-20 rounded-md border border-[#E7E5E4] px-2 py-1 text-sm text-right"
                />
                <span className="text-xs text-[#737373]">days</span>
                {custom && (
                  <button
                    onClick={() => reset(r.category, r.defaultDays)}
                    className="text-xs text-[#B8896B] underline"
                    type="button"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-green-700">Saved ✓</span>}
        {err && <span className="text-xs text-red-700">{err}</span>}
      </div>
    </div>
  );
}
