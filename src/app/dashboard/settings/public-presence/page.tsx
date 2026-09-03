import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicStatsCard } from "../public-stats-card";
import { IdentityCard } from "../identity-card";
import { getCurrentBusiness } from "@/lib/current-site";
import { getReputationStats } from "@/lib/reputation-stats";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ siteId?: string; identity?: string }>;
}

export default async function PublicPresenceSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId, identity: identityParam } = await searchParams;
  const business = await getCurrentBusiness(siteId);

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
        <h2 className="text-base font-semibold">Public Presence</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Complete checkout first to manage public visibility.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
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
    </div>
  );
}
