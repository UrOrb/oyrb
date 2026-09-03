import { CreditCard } from "lucide-react";
import type { PaymentMix } from "@/lib/business-brain";
import { Donut } from "../../_charts/donut";

/**
 * Phase 9 PR 6 — Payment mix donut.
 *
 * Replaces the DepositVsPayInFullCard's text breakdown with a
 * categorical donut. Four mutually-exclusive payment patterns
 * (fullyUpfront / depositThenBalance / depositOnly / noOyrbPayment)
 * map directly to donut slices.
 *
 * "No OYRB payment" gets a slice too — it's a legitimate category,
 * not an absence of data. Shows pros what fraction of their bookings
 * they're collecting outside the platform.
 */
export function PaymentMixDonutCard({ mix }: { mix: PaymentMix }) {
  const empty = mix.totalBookings === 0;

  // Filter out zero-count slices so the donut doesn't render slivers
  // of categories with no representation. Order matches the type def's
  // narrative order: most-paid first.
  const slices = empty
    ? []
    : [
        {
          label: "Fully upfront",
          value: mix.fullyUpfrontCount,
        },
        {
          label: "Deposit + balance",
          value: mix.depositThenBalanceCount,
        },
        {
          label: "Deposit only",
          value: mix.depositOnlyCount,
        },
        {
          label: "No OYRB payment",
          value: mix.noOyrbPaymentCount,
        },
      ].filter((s) => s.value > 0);

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-[#737373]" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
            Payment mix
          </h2>
        </div>
        <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
      </header>

      {empty ? (
        <p className="mt-4 text-sm text-[#737373]">
          Payment patterns appear here once you have completed bookings.
        </p>
      ) : (
        <div className="mt-3">
          <Donut
            data={slices}
            centerLabel={{
              primary: `${mix.totalBookings}`,
              secondary: mix.totalBookings === 1 ? "booking" : "bookings",
            }}
            height={220}
            ariaLabel="Payment pattern breakdown"
          />
        </div>
      )}
    </section>
  );
}
