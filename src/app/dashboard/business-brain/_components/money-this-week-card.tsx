import { DollarSign } from "lucide-react";
import type { MoneyThisWeek } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";
import { BrainCard, EmptyState } from "./brain-card";

/**
 * Money this week — actuals only. No forecasts, no projections.
 *
 * Two top-level numbers and an optional payment-pattern breakdown:
 *
 *   Gross on calendar     — sum of services.price_cents for non-cancelled
 *                           bookings starting this week. "What appointments
 *                           are worth," not "what was actually collected."
 *   Revenue collected     — OYRB-captured revenue (deposits + pay-in-full
 *                           amounts), summed per booking exactly once. Pros
 *                           who collect outside OYRB will see $0 here even
 *                           when gross-on-calendar is positive — that's
 *                           correct, and the sublabel says so.
 *
 * The 4-category payment pattern (fully upfront / deposit + balance /
 * deposit only / no OYRB payment) renders below as a terse line. Same
 * categorization model the Money tab uses, so pros see consistent
 * numbers across both views.
 */
export function MoneyThisWeekCard({ money }: { money: MoneyThisWeek }) {
  const empty = money.grossCents === 0 && money.paymentMix.totalBookings === 0;
  const mix = money.paymentMix;

  return (
    <BrainCard>
      <header className="flex items-center gap-2">
        <DollarSign size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Money this week
        </h2>
      </header>

      {empty ? (
        <EmptyState>
          Once you have bookings on the calendar, your week&apos;s revenue will appear here.
        </EmptyState>
      ) : (
        <>
          <div className="mt-4 grid gap-0 divide-y divide-[#E7E5E4]/80 rounded-xl border border-[#EDE9E4] bg-white/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <Stat
              label="Gross on calendar"
              value={formatCents(money.grossCents)}
              sublabel={`${mix.totalBookings} booking${mix.totalBookings === 1 ? "" : "s"} on the calendar`}
            />
            <Stat
              label="Revenue collected"
              value={formatCents(money.revenueCollectedCents)}
              sublabel={
                money.revenueCollectedCents === 0
                  ? "Collected outside OYRB this week"
                  : "Through OYRB this week"
              }
            />
          </div>

          {/* Terse payment-pattern breakdown — only the categories that
              have bookings show up. Skipped entirely on weeks where every
              booking falls into one bucket (no information to add). */}
          <PaymentPatternLine mix={mix} />
        </>
      )}

      <p className="mt-4 text-[11px] text-[#A3A3A3]">
        Actuals only — no forecasts. Your monthly goal lives on the main dashboard.
      </p>
    </BrainCard>
  );
}

function Stat({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">{label}</p>
      <p className="mt-1 font-display text-xl font-medium text-[#0A0A0A]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#737373]">{sublabel}</p>
    </div>
  );
}

function PaymentPatternLine({
  mix,
}: {
  mix: import("@/lib/business-brain").PaymentMix;
}) {
  const parts: string[] = [];
  if (mix.fullyUpfrontCount > 0) parts.push(`${mix.fullyUpfrontCount} paid fully`);
  if (mix.depositThenBalanceCount > 0) parts.push(`${mix.depositThenBalanceCount} deposit + balance`);
  if (mix.depositOnlyCount > 0) parts.push(`${mix.depositOnlyCount} deposit only`);
  if (mix.noOyrbPaymentCount > 0) parts.push(`${mix.noOyrbPaymentCount} no OYRB payment`);

  if (parts.length <= 1) return null; // skip when there's nothing meaningful to compare

  return (
    <p className="mt-3 text-[11px] text-[#737373]">{parts.join(" · ")}</p>
  );
}
