import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TIERS, fmtMoney, type Tier, type BillingCycle } from "@/lib/plans";
import { TrialActivator } from "./trial-activator";

export const metadata = { title: "Start your free trial" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ tier?: string; cycle?: string }>;
}

export default async function StartTrialPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const tierParam = (params.tier ?? "studio") as Tier;
  const cycleParam = (params.cycle ?? "monthly") as BillingCycle;

  const tier = TIERS[tierParam] ?? TIERS.studio;
  const cycle: BillingCycle = cycleParam === "annual" ? "annual" : "monthly";
  const conversionCents = cycle === "monthly" ? tier.monthlyPriceCents : tier.annualPriceCents;
  // 14 days from today, rendered server-side so the date the user sees on the
  // page is the same one Stripe will use as the trial end.
  const conversionDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Start your free trial
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        14 days free of {tier.name}, then automatic renewal. Cancel anytime
        before then and you pay nothing.
      </p>

      <div className="mt-6 rounded-lg border border-[#B8896B] bg-white p-5">
        <p className="text-sm font-semibold">{tier.name} · {cycle === "monthly" ? "Monthly" : "Annual"}</p>
        <p className="mt-1 text-3xl font-display font-medium text-[#0A0A0A]">$0 today</p>
        <p className="mt-2 text-sm text-[#525252]">
          After your 14-day free trial, you&rsquo;ll be charged{" "}
          <span className="font-semibold">{fmtMoney(conversionCents)}</span>{" "}
          on <span className="font-semibold">{conversionDate}</span>. Cancel
          anytime before then with one click.
        </p>
      </div>

      <TrialActivator
        userEmail={user.email ?? ""}
        tier={tierParam}
        cycle={cycle}
      />
    </div>
  );
}
