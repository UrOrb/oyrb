import { CreditCard } from "lucide-react";
import type { PaymentMix } from "@/lib/business-brain";
import { formatCents } from "@/lib/types";

/**
 * 4-category payment-pattern breakdown over the last 90 days.
 *
 * Categories:
 *   - Paid fully upfront        — pay-in-full flow at booking, no deposit
 *   - Deposit + balance         — deposit at booking, balance via pay-in-full later
 *   - Deposit only              — deposit collected, balance owed in person (or never)
 *   - No OYRB payment           — paid in person, free service, or pending
 *
 * The 4-category framing replaces a simpler "deposit vs pay-in-full"
 * binary so pros can see how clients actually behave: who pre-pays
 * fully, who splits, who only commits a deposit, and which appointments
 * never run money through OYRB at all. Honest signal about how much
 * cash flow the platform handles vs how much pros collect outside.
 */
export function DepositVsPayInFullCard({ mix }: { mix: PaymentMix }) {
  if (mix.totalBookings === 0) {
    return (
      <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
        <Header />
        <p className="mt-4 text-sm text-[#737373]">
          Once you have bookings, your payment-pattern breakdown will appear here.
        </p>
      </section>
    );
  }

  const rows: Array<{ label: string; count: number; cents: number; tone: string }> = [
    { label: "Paid fully upfront", count: mix.fullyUpfrontCount, cents: mix.fullyUpfrontCents, tone: "bg-emerald-500" },
    { label: "Deposit + balance", count: mix.depositThenBalanceCount, cents: mix.depositThenBalanceCents, tone: "bg-[#B8896B]" },
    { label: "Deposit only",      count: mix.depositOnlyCount,        cents: mix.depositOnlyCents,        tone: "bg-amber-500" },
    { label: "No OYRB payment",   count: mix.noOyrbPaymentCount,      cents: 0,                           tone: "bg-[#A3A3A3]" },
  ];

  const oyrbCollectedCount =
    mix.fullyUpfrontCount + mix.depositThenBalanceCount + mix.depositOnlyCount;
  const oyrbCollectedPct =
    mix.totalBookings > 0
      ? Math.round((oyrbCollectedCount / mix.totalBookings) * 100)
      : 0;

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-6">
      <Header />

      <div className="mt-4 grid gap-3">
        {rows.map((r) => {
          const pct =
            mix.totalBookings > 0 ? (r.count / mix.totalBookings) * 100 : 0;
          return (
            <div key={r.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <p className="text-[#525252]">{r.label}</p>
                <p className="text-[#737373]">
                  <span className="font-semibold text-[#0A0A0A] tabular-nums">
                    {r.count}
                  </span>{" "}
                  booking{r.count === 1 ? "" : "s"}
                  {r.cents > 0 && (
                    <>
                      {" "}
                      · <span className="tabular-nums">{formatCents(r.cents)}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F5F5F4]">
                <div
                  className={`h-full ${r.tone}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 border-t border-[#F5F5F4] pt-4 text-[11px] text-[#737373]">
        OYRB processed payment for{" "}
        <strong className="text-[#0A0A0A]">{oyrbCollectedPct}%</strong> of these bookings —
        a total of <strong className="text-[#0A0A0A]">{formatCents(mix.totalCollectedCents)}</strong>{" "}
        in collected revenue over the last 90 days.
      </p>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Payment patterns
        </h2>
      </div>
      <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
    </header>
  );
}
