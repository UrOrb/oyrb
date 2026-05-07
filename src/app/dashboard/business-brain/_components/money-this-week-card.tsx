import { DollarSign } from "lucide-react";
import type { MoneyThisWeek } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * Money this week — actuals only. No forecasts, no projections.
 *
 * "Gross" is the sum of services.price_cents for non-cancelled
 * bookings whose start_at falls in this week. It's "money on the
 * calendar" — both already-collected and yet-to-be-collected by
 * end of week. The pro's monthly goal lives on the dashboard root
 * (GoalMeter); this card is week-scoped.
 */
export function MoneyThisWeekCard({ money }: { money: MoneyThisWeek }) {
  const empty =
    money.grossCents === 0 &&
    money.depositsCount === 0 &&
    money.payInFullCount === 0;

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <header className="flex items-center gap-2">
        <DollarSign size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Money this week
        </h2>
      </header>

      {empty ? (
        <p className="mt-4 text-sm text-[#737373]">
          Once you have bookings on the calendar, your week&apos;s revenue will appear here.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Gross on calendar"
            value={formatCents(money.grossCents)}
            sublabel="Confirmed + completed bookings"
          />
          <Stat
            label="Deposits collected"
            value={formatCents(money.depositsTotalCents)}
            sublabel={`${money.depositsCount} booking${money.depositsCount === 1 ? "" : "s"}`}
          />
          <Stat
            label="Paid in full"
            value={formatCents(money.payInFullTotalCents)}
            sublabel={`${money.payInFullCount} booking${money.payInFullCount === 1 ? "" : "s"}`}
          />
        </div>
      )}

      <p className="mt-4 text-[11px] text-[#A3A3A3]">
        Actuals only — no forecasts. Your monthly goal lives on the main dashboard.
      </p>
    </section>
  );
}

function Stat({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">{label}</p>
      <p className="mt-1 font-display text-xl font-medium text-[#0A0A0A]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#737373]">{sublabel}</p>
    </div>
  );
}
