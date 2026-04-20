"use client";

import { useState, useTransition } from "react";
import { updateGoalSettings } from "./actions";
import type { GoalSettings } from "@/lib/goal-tracking";

type Props = {
  initial: GoalSettings;
};

export function GoalForm({ initial }: Props) {
  const [amount, setAmount] = useState(initial.monthly_goal_amount.toString());
  const [countType, setCountType] = useState<GoalSettings["count_type"]>(initial.count_type);
  const [customTitle, setCustomTitle] = useState(initial.custom_title ?? "");
  const [showOnDashboard, setShowOnDashboard] = useState(initial.show_on_dashboard);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      setMsg({ type: "err", text: "Goal must be a non-negative number" });
      return;
    }
    if (value > 1_000_000) {
      setMsg({ type: "err", text: "Goal capped at $1,000,000" });
      return;
    }
    startTransition(async () => {
      const result = await updateGoalSettings({
        monthly_goal_amount: value,
        count_type: countType,
        custom_title: customTitle.trim() || null,
        show_on_dashboard: showOnDashboard,
      });
      if (result.ok) setMsg({ type: "ok", text: "Saved." });
      else setMsg({ type: "err", text: result.error ?? "Something went wrong" });
    });
  };

  return (
    <form id="goal" onSubmit={onSubmit} className="space-y-4">
      {/* Goal amount */}
      <div>
        <label htmlFor="goal-amount" className="block text-xs font-medium text-[#0A0A0A]">
          Monthly goal amount
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-[#737373]">$</span>
          <input
            id="goal-amount"
            type="number"
            inputMode="numeric"
            min="0"
            max="1000000"
            step="50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-40 rounded-md border border-[#E7E5E4] px-3 py-1.5 text-sm focus:border-[#D946EF] focus:outline-none"
            placeholder="5000"
          />
        </div>
        <p className="mt-1 text-[11px] text-[#737373]">
          Set it to $0 to hide the meter from the dashboard.
        </p>
      </div>

      {/* Count type */}
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-[#0A0A0A]">
          What counts toward the goal
        </legend>
        <CountOption
          name="count_type"
          value="confirmed_bookings"
          current={countType}
          onChange={setCountType}
          label="Confirmed bookings"
          help="Any booking that's been accepted — whether or not the service has happened."
        />
        <CountOption
          name="count_type"
          value="completed_appointments"
          current={countType}
          onChange={setCountType}
          label="Completed appointments only"
          help="Only bookings marked complete (service performed)."
        />
        <CountOption
          name="count_type"
          value="deposits_received"
          current={countType}
          onChange={setCountType}
          label="Deposits received"
          help="Counts only the deposit portion of each booking (assumed 30% of the service price)."
        />
      </fieldset>

      {/* Custom title */}
      <div>
        <label htmlFor="goal-title" className="block text-xs font-medium text-[#0A0A0A]">
          Custom title <span className="font-normal text-[#A3A3A3]">(optional)</span>
        </label>
        <input
          id="goal-title"
          type="text"
          maxLength={40}
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="Monthly Goal"
          className="mt-1 w-full rounded-md border border-[#E7E5E4] px-3 py-1.5 text-sm focus:border-[#D946EF] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-[#737373]">
          e.g. &ldquo;June&rsquo;s Target&rdquo;, &ldquo;Rent Month&rdquo;.
        </p>
      </div>

      {/* Show on dashboard */}
      <label className="flex items-center gap-2 text-xs text-[#0A0A0A]">
        <input
          type="checkbox"
          checked={showOnDashboard}
          onChange={(e) => setShowOnDashboard(e.target.checked)}
          className="h-4 w-4 rounded border-[#E7E5E4]"
        />
        Show goal meter on my dashboard
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {msg && (
          <span
            className={
              msg.type === "ok"
                ? "text-xs text-green-700"
                : "text-xs text-red-600"
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

function CountOption({
  name,
  value,
  current,
  onChange,
  label,
  help,
}: {
  name: string;
  value: GoalSettings["count_type"];
  current: GoalSettings["count_type"];
  onChange: (v: GoalSettings["count_type"]) => void;
  label: string;
  help: string;
}) {
  const id = `${name}-${value}`;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 rounded-md border border-[#E7E5E4] p-2.5 text-xs hover:bg-[#FAFAF9]">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
        className="mt-0.5"
      />
      <span>
        <span className="block font-medium text-[#0A0A0A]">{label}</span>
        <span className="block text-[11px] text-[#737373]">{help}</span>
      </span>
    </label>
  );
}
