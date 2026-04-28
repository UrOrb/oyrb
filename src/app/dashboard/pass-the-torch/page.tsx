import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import type { ProReferral, ProInvite, Specialty } from "@/lib/types";
import { MasterToggle } from "./master-toggle";
import { VacationModeCard } from "./vacation-mode-card";
import { MyTrustedProsSection } from "./my-trusted-pros-section";
import { PendingRequestsSection } from "./pending-requests-section";
import { TrustedBySection } from "./trusted-by-section";
import { PendingInvitesSection } from "./pending-invites-section";

export const metadata = { title: "Trusted Pros" };

export type ReferralPeer = {
  id: string;
  business_name: string;
  slug: string;
  primary_specialty: Specialty | null;
  profile_image_url: string | null;
};

/** A pro_referrals row joined with the OTHER business's display info. */
export type EnrichedReferral = ProReferral & {
  peer: ReferralPeer;
};

export default async function PassTheTorchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getCurrentBusiness();
  if (!business) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">Trusted Pros</h1>
        <p className="mt-2 text-sm text-[#737373]">
          Create a site first, then come back here to add the pros you trust.
        </p>
      </div>
    );
  }

  // Pull every relevant row in parallel. Each query is small (max ~5
  // each) so we don't bother with joins — we'll stitch peer info in JS.
  const [
    { data: outgoingAccepted },
    { data: outgoingPending },
    { data: incomingPending },
    { data: incomingAccepted },
    { data: pendingInvites },
  ] = await Promise.all([
    supabase
      .from("pro_referrals")
      .select("*")
      .eq("requesting_business_id", business.id)
      .eq("status", "accepted")
      .order("position", { ascending: true }),
    supabase
      .from("pro_referrals")
      .select("*")
      .eq("requesting_business_id", business.id)
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
    supabase
      .from("pro_referrals")
      .select("*")
      .eq("receiving_business_id", business.id)
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
    supabase
      .from("pro_referrals")
      .select("*")
      .eq("receiving_business_id", business.id)
      .eq("status", "accepted")
      .order("responded_at", { ascending: false }),
    supabase
      .from("pro_invites")
      .select("*")
      .eq("requesting_business_id", business.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  // Collect every peer business id we need to render names/logos.
  const peerIds = new Set<string>();
  const collect = (rows: ProReferral[] | null) => {
    for (const r of rows ?? []) {
      peerIds.add(r.requesting_business_id);
      peerIds.add(r.receiving_business_id);
    }
  };
  collect(outgoingAccepted as ProReferral[] | null);
  collect(outgoingPending as ProReferral[] | null);
  collect(incomingPending as ProReferral[] | null);
  collect(incomingAccepted as ProReferral[] | null);
  peerIds.delete(business.id);

  const peerMap = new Map<string, ReferralPeer>();
  if (peerIds.size > 0) {
    const { data: peers } = await supabase
      .from("businesses")
      .select("id, business_name, slug, primary_specialty, profile_image_url")
      .in("id", Array.from(peerIds));
    for (const p of peers ?? []) {
      peerMap.set(p.id as string, {
        id: p.id as string,
        business_name: p.business_name as string,
        slug: p.slug as string,
        primary_specialty: (p.primary_specialty as Specialty | null) ?? null,
        profile_image_url: (p.profile_image_url as string | null) ?? null,
      });
    }
  }

  const enrichOutgoing = (rows: ProReferral[] | null): EnrichedReferral[] =>
    (rows ?? [])
      .map((r) => {
        const peer = peerMap.get(r.receiving_business_id);
        return peer ? { ...r, peer } : null;
      })
      .filter((x): x is EnrichedReferral => x !== null);

  const enrichIncoming = (rows: ProReferral[] | null): EnrichedReferral[] =>
    (rows ?? [])
      .map((r) => {
        const peer = peerMap.get(r.requesting_business_id);
        return peer ? { ...r, peer } : null;
      })
      .filter((x): x is EnrichedReferral => x !== null);

  const myList = [
    ...enrichOutgoing(outgoingAccepted as ProReferral[] | null),
    ...enrichOutgoing(outgoingPending as ProReferral[] | null),
  ];
  const incoming = enrichIncoming(incomingPending as ProReferral[] | null);
  const trustedBy = enrichIncoming(incomingAccepted as ProReferral[] | null);
  const invites = (pendingInvites ?? []) as ProInvite[];

  const activeCount =
    (outgoingAccepted?.length ?? 0) +
    (outgoingPending?.length ?? 0) +
    (pendingInvites?.length ?? 0);

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="font-display text-2xl font-medium tracking-tight">Trusted Pros</h1>
        <p className="mt-1.5 text-sm text-[#737373]">
          Pros you vouch for. When you&apos;re booked or away, your clients see
          them on your storefront.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <VacationModeCard
          start={business.vacation_start}
          end={business.vacation_end}
          message={business.vacation_message}
        />

        <MasterToggle enabled={business.pass_the_torch_enabled} />

        <MyTrustedProsSection
          referrals={myList}
          activeCount={activeCount}
          businessName={business.business_name}
        />

        {incoming.length > 0 && (
          <PendingRequestsSection requests={incoming} myBusinessName={business.business_name} />
        )}

        {trustedBy.length > 0 && <TrustedBySection referrals={trustedBy} />}

        {invites.length > 0 && <PendingInvitesSection invites={invites} />}
      </div>
    </div>
  );
}
