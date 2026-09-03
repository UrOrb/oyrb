import Link from "next/link";
import { redirect } from "next/navigation";
import { GoalForm } from "../goal-form";
import { IdentityCard } from "../identity-card";
import { PublicStatsCard } from "../public-stats-card";
import { getCurrentBusiness } from "@/lib/current-site";
import { ensureGoalSettings } from "@/lib/goal-tracking";
import { getReputationStats } from "@/lib/reputation-stats";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ siteId?: string; identity?: string }>;
}

export default async function GeneralSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId, identity: identityParam } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  const goalSettings = await ensureGoalSettings(user.id);

  const reputationStats = business
    ? await getReputationStats(business.id)
    : null;

  const identityRow = business
    ? await supabase
        .from("businesses")
        .select(
          "identity_verification_status, identity_verified_at, identity_last_attempted_at",
        )
        .eq("id", business.id)
        .eq("owner_id", user.id)
        .maybeSingle()
        .then((r) => r.data as {
          identity_verification_status: string | null;
          identity_verified_at: string | null;
          identity_last_attempted_at: string | null;
        } | null)
    : null;

  if (!business) {
    return (
      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-base font-semibold">General</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Complete checkout first to access settings.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="font-display text-lg font-medium">Account</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Your sign-in details and current business.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              Email
            </p>
            <p className="mt-1 break-words text-sm text-[#525252]">{user.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              Business
            </p>
            <p className="mt-1 text-sm text-[#525252]">{business.business_name}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#A3A3A3]">
              Current plan
            </p>
            <span className="mt-1 inline-flex rounded-full bg-[#F1EFEC] px-2.5 py-1 text-xs font-semibold capitalize text-[#0A0A0A]">
              {business.subscription_tier ?? "inactive"}
            </span>
          </div>
        </div>
      </section>

      <PublicStatsCard
        initialEnabled={!!business.public_stats_enabled}
        stats={reputationStats}
      />

      <IdentityCard
        status={(identityRow?.identity_verification_status ?? "none") as
          | "none" | "pending" | "verified" | "requires_input" | "failed"}
        verifiedAt={identityRow?.identity_verified_at ?? null}
        lastAttemptedAt={identityRow?.identity_last_attempted_at ?? null}
        showProcessingBanner={identityParam === "processing"}
      />

      <section id="goal" className="scroll-mt-20 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-base font-semibold">Goal Tracking</h2>
        <p className="mt-0.5 text-xs text-[#737373]">
          Set a monthly income target and choose what counts toward it. Progress is calculated
          across all the sites you own; resets at the start of each UTC month.
        </p>
        <div className="mt-5">
          <GoalForm initial={goalSettings} />
        </div>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div>
          <h2 className="text-base font-semibold">Directory Listing</h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Opt in to the public OYRB beauty-pro directory at{" "}
            <code className="text-[#0A0A0A]">oyrb.space/find</code>.
          </p>
        </div>
        <Link
          href="/dashboard/directory"
          className="shrink-0 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
        >
          Manage listing
        </Link>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div>
          <h2 className="text-base font-semibold">Exports</h2>
          <p className="mt-0.5 text-xs text-[#737373]">
            Download contacts, bookings, and income as portable files.
          </p>
        </div>
        <Link
          href="/dashboard/settings/exports"
          className="shrink-0 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
        >
          Open exports
        </Link>
      </section>

      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-[#525252]">Remove your brand</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
              Start a 14-day removal window. Your storefront comes down today;
              your account deletes after 14 days.
            </p>
          </div>
          <Link
            href="/dashboard/settings/remove-brand"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]"
          >
            <span className="group-hover:underline group-hover:decoration-amber-700 group-hover:underline-offset-4">
              Remove brand
            </span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
