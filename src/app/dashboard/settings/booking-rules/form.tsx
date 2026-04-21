"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2, Plus } from "lucide-react";
import { saveBookingRules } from "./actions";
import type { DailyBreakBlock } from "@/lib/booking-slots";

const INTERVAL_OPTS = [15, 30, 45, 60, 120] as const;
const CUTOFF_OPTS = [1, 2, 4, 8, 12, 24, 48] as const;
const BREAK_OPTS = [0, 5, 10, 15, 20, 30, 45, 60] as const;
const DOW_OPTS: Array<{ v: DailyBreakBlock["days"][number]; label: string }> = [
  { v: "mon", label: "Mon" },
  { v: "tue", label: "Tue" },
  { v: "wed", label: "Wed" },
  { v: "thu", label: "Thu" },
  { v: "fri", label: "Fri" },
  { v: "sat", label: "Sat" },
  { v: "sun", label: "Sun" },
];

type FormState = {
  intervalMinutes: number;
  allowLastMinute: boolean;
  lastMinuteCutoffHours: number;
  breakBetweenMinutes: number;
  dailyBreakBlocks: DailyBreakBlock[];
};

type Props = {
  businessId: string;
  initial: FormState;
};

export function BookingRulesForm({ businessId, initial }: Props) {
  const [form, setForm] = useState<FormState>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const preview = useMemo(() => previewSlots(form), [form]);

  const save = () => {
    setMsg(null);
    start(async () => {
      const r = await saveBookingRules({ businessId, ...form });
      if (r.ok) setMsg({ type: "ok", text: "Saved." });
      else setMsg({ type: "err", text: r.error });
    });
  };

  const addBlock = () =>
    setForm((f) => ({
      ...f,
      dailyBreakBlocks: [
        ...f.dailyBreakBlocks,
        { start: "12:00", end: "13:00", days: ["mon", "tue", "wed", "thu", "fri"] },
      ],
    }));

  const updateBlock = (i: number, patch: Partial<DailyBreakBlock>) =>
    setForm((f) => ({
      ...f,
      dailyBreakBlocks: f.dailyBreakBlocks.map((b, idx) =>
        idx === i ? { ...b, ...patch } : b,
      ),
    }));

  const removeBlock = (i: number) =>
    setForm((f) => ({
      ...f,
      dailyBreakBlocks: f.dailyBreakBlocks.filter((_, idx) => idx !== i),
    }));

  const toggleDay = (i: number, d: DailyBreakBlock["days"][number]) =>
    setForm((f) => ({
      ...f,
      dailyBreakBlocks: f.dailyBreakBlocks.map((b, idx) => {
        if (idx !== i) return b;
        const has = b.days.includes(d);
        return { ...b, days: has ? b.days.filter((x) => x !== d) : [...b.days, d] };
      }),
    }));

  return (
    <div className="mt-6 space-y-6">
      {/* Interval */}
      <Card
        title="Booking interval"
        hint="Clients see time slots starting on these intervals."
      >
        <select
          value={form.intervalMinutes}
          onChange={(e) =>
            setForm((f) => ({ ...f, intervalMinutes: parseInt(e.target.value, 10) }))
          }
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm"
        >
          {INTERVAL_OPTS.map((n) => (
            <option key={n} value={n}>
              Every {n < 60 ? `${n} minutes` : n === 60 ? "hour" : `${n / 60} hours`}
            </option>
          ))}
        </select>
      </Card>

      {/* Last-minute */}
      <Card
        title="Last-minute booking"
        hint="Prevents rushed bookings by requiring advance notice."
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.allowLastMinute}
            onChange={(e) =>
              setForm((f) => ({ ...f, allowLastMinute: e.target.checked }))
            }
            className="h-4 w-4"
          />
          Allow same-day bookings up to the cutoff
        </label>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span>Block bookings less than</span>
          <select
            value={form.lastMinuteCutoffHours}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lastMinuteCutoffHours: parseInt(e.target.value, 10),
              }))
            }
            className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-sm"
          >
            {CUTOFF_OPTS.map((h) => (
              <option key={h} value={h}>
                {h} hour{h === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          <span>before the appointment.</span>
        </div>
        {!form.allowLastMinute && (
          <p className="mt-2 text-[11px] text-amber-800">
            Last-minute bookings are OFF — any slot inside the cutoff window
            is hidden even if a client has your site open.
          </p>
        )}
      </Card>

      {/* Break */}
      <Card
        title="Break between appointments"
        hint="Gives you time to reset between clients. Auto-applied to new bookings."
      >
        <select
          value={form.breakBetweenMinutes}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              breakBetweenMinutes: parseInt(e.target.value, 10),
            }))
          }
          className="rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm"
        >
          {BREAK_OPTS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "None (back-to-back OK)" : `${n} minutes`}
            </option>
          ))}
        </select>
      </Card>

      {/* Daily break blocks */}
      <Card
        title="Daily break blocks"
        hint="Recurring windows clients can never book — e.g. lunch from 12–1."
      >
        <div className="space-y-3">
          {form.dailyBreakBlocks.length === 0 && (
            <p className="rounded-md border border-dashed border-[#E7E5E4] p-4 text-xs text-[#737373]">
              No daily blocks set. Add one if you want a recurring time window
              off-limits (lunch, meditation, school pickup).
            </p>
          )}
          {form.dailyBreakBlocks.map((b, i) => (
            <div
              key={i}
              className="rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={b.start}
                  onChange={(e) => updateBlock(i, { start: e.target.value })}
                  className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-sm"
                />
                <span className="text-xs text-[#737373]">to</span>
                <input
                  type="time"
                  value={b.end}
                  onChange={(e) => updateBlock(i, { end: e.target.value })}
                  className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeBlock(i)}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] font-medium text-[#737373] hover:border-red-300 hover:text-red-700"
                >
                  <Trash2 size={10} /> Remove
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DOW_OPTS.map((d) => {
                  const active = b.days.includes(d.v);
                  return (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => toggleDay(i, d.v)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        active
                          ? "bg-[#0A0A0A] text-white"
                          : "border border-[#E7E5E4] bg-white text-[#525252]"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addBlock}
            className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            <Plus size={12} /> Add a daily block
          </button>
        </div>
      </Card>

      {/* Preview */}
      <Card
        title="Your next available slots look like this"
        hint="Using a 60-min example service. Existing bookings aren't factored in here."
      >
        <div className="flex flex-wrap gap-1.5">
          {preview.length === 0 ? (
            <p className="text-xs text-[#737373]">
              No slots fit your rules today or tomorrow. Ease up on the block
              windows or the last-minute cutoff.
            </p>
          ) : (
            preview.slice(0, 12).map((s, i) => (
              <span
                key={i}
                className="rounded-md border border-[#E7E5E4] bg-white px-2 py-1 text-[11px] font-medium"
              >
                {s}
              </span>
            ))
          )}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save booking rules"}
        </button>
        {msg && (
          <span
            className={
              msg.type === "ok" ? "text-xs text-green-700" : "text-xs text-red-600"
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-[#737373]">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Client-only preview — hardcodes 9am-5pm Mon-Fri, 60-min service, no
// bookings, no last-minute-off override. Just to make the rule effects
// tangible without hitting the server.
function previewSlots(form: FormState): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let dayOffset = 0; dayOffset < 3 && out.length < 12; dayOffset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(9, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(17, 0, 0, 0);

    const dowName = (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const)[d.getDay()];
    const dayBlocks = form.dailyBreakBlocks.filter((b) => b.days.includes(dowName));

    const cutoffMs = form.lastMinuteCutoffHours * 60 * 60_000;
    const floor = new Date(now.getTime() + cutoffMs);

    for (
      const c = new Date(d);
      c.getTime() + 60 * 60_000 <= dayEnd.getTime();
      c.setMinutes(c.getMinutes() + form.intervalMinutes)
    ) {
      const s = new Date(c);
      if (s < floor) continue;
      if (
        !form.allowLastMinute &&
        s.getTime() - now.getTime() < cutoffMs
      ) {
        continue;
      }
      const e = new Date(s.getTime() + 60 * 60_000);
      const inBlock = dayBlocks.some((b) => {
        const [sH, sM] = b.start.split(":").map(Number);
        const [eH, eM] = b.end.split(":").map(Number);
        const bs = new Date(s); bs.setHours(sH, sM, 0, 0);
        const be = new Date(s); be.setHours(eH, eM, 0, 0);
        return s < be && e > bs;
      });
      if (inBlock) continue;
      out.push(
        s.toLocaleString("en-US", {
          weekday: "short",
          hour: "numeric",
          minute: "2-digit",
        }),
      );
      if (out.length >= 12) break;
    }
  }
  return out;
}
