import { Users } from "lucide-react";
import type { AcquisitionMix } from "@/lib/business-brain";
import { Donut } from "../../_charts/donut";

/**
 * Phase 9 PR 6 — Acquisition mix donut.
 *
 * Replaces the AcquisitionMixCard text breakdown. Two slices: new
 * vs returning client bookings over the last 90 days. Helps pros
 * see whether they're growing the top of the funnel or fulfilling
 * their existing base.
 */
export function AcquisitionMixDonutCard({ mix }: { mix: AcquisitionMix }) {
  if (!mix.hasEnoughData) {
    return (
      <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
        <Header />
        <p className="mt-4 text-sm text-[#737373]">
          Acquisition mix appears once you have enough booking history.
        </p>
      </section>
    );
  }

  const slices = [
    { label: "New clients", value: mix.newClientBookings },
    { label: "Returning", value: mix.returningClientBookings },
  ].filter((s) => s.value > 0);

  return (
    <section className="rounded-2xl border border-[#E7E5E4] bg-[#FFFCF8] p-6 shadow-[0_14px_40px_rgba(10,10,10,0.035)]">
      <Header />
      <div className="mt-3">
        <Donut
          data={slices}
          centerLabel={{
            primary: `${Math.round(mix.newClientPct * 100)}%`,
            secondary: "new",
          }}
          height={220}
          ariaLabel="New vs returning client bookings"
        />
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-[#737373]" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#525252]">
          Acquisition mix
        </h2>
      </div>
      <p className="text-[11px] text-[#A3A3A3]">Last 90 days</p>
    </header>
  );
}
