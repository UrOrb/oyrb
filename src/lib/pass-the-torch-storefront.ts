import { createAdminClient } from "@/lib/supabase/server";
import type { Specialty, Business } from "@/lib/types";

/**
 * Storefront-side data + helpers for Pass the Torch.
 *
 * The server-side storefront page (/s/[slug]) calls these via the
 * service-role client because the public anon role only has SELECT on
 * pro_referrals where status='accepted'. We intentionally don't go
 * through anon RLS here — the page is already running on the server,
 * the data we expose to the client is filtered, and using admin lets us
 * grab business display info (name/slug/logo/specialty) in one round
 * trip without a second policy pass.
 */

export interface TrustedProPeer {
  business_name: string;
  slug: string;
  primary_specialty: Specialty | null;
  profile_image_url: string | null;
  /** Per-referral note copied off the pro_referrals row, NOT a peer field. */
  vouch_note: string | null;
  /** Per-referral specialty override; falls back to peer's primary_specialty. */
  referral_specialty: Specialty | null;
  /**
   * Active service names this peer offers. Used by the booking-flow
   * integration to soft-filter referrals by the service the client
   * tried to book ("missing_service" trigger). Populated server-side
   * when the storefront page loads referrals so the client doesn't
   * round-trip per-peer.
   */
  service_names: string[];
}

/**
 * Picks up the active business's accepted referrals (capped at 5 in
 * spec, position-ordered) and embeds each peer's display row directly
 * via PostgREST's foreign-key embedding.
 *
 * Why embed instead of a two-step lookup: pro_referrals has TWO foreign
 * keys to businesses (requesting + receiving). A two-step pattern that
 * collects ids then re-queries businesses is one sloppy variable away
 * from rendering the requester instead of the receiver. The
 * `receiver:businesses!receiving_business_id(...)` form makes the FK
 * direction explicit so the result row literally CANNOT contain the
 * requester's display info.
 */
export async function loadStorefrontTrustedPros(
  businessId: string,
): Promise<TrustedProPeer[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pro_referrals")
    .select(
      `
      receiving_business_id,
      vouch_note,
      referral_specialty,
      position,
      receiver:businesses!receiving_business_id (
        id,
        business_name,
        slug,
        profile_image_url,
        primary_specialty,
        pass_the_torch_enabled,
        is_published
      )
    `,
    )
    .eq("requesting_business_id", businessId)
    .eq("status", "accepted")
    .order("position", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[loadStorefrontTrustedPros]", error);
    return [];
  }

  type Row = {
    receiving_business_id: string;
    vouch_note: string | null;
    referral_specialty: Specialty | null;
    position: number;
    // PostgREST returns embedded resources as either a single object or
    // an array depending on the cardinality it infers. We narrow at
    // runtime below.
    receiver:
      | {
          id: string;
          business_name: string;
          slug: string;
          profile_image_url: string | null;
          primary_specialty: Specialty | null;
          pass_the_torch_enabled: boolean;
          is_published: boolean;
        }
      | Array<{
          id: string;
          business_name: string;
          slug: string;
          profile_image_url: string | null;
          primary_specialty: Specialty | null;
          pass_the_torch_enabled: boolean;
          is_published: boolean;
        }>
      | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  // First pass: validate + flatten the embedded receiver. Drops rows
  // where the peer paused Pass the Torch, isn't published, or the
  // receiver column impossibly equals the requester id.
  type Resolved = {
    receiverId: string;
    business_name: string;
    slug: string;
    profile_image_url: string | null;
    primary_specialty: Specialty | null;
    vouch_note: string | null;
    referral_specialty: Specialty | null;
  };
  const resolved: Resolved[] = [];
  for (const r of rows) {
    const receiver = Array.isArray(r.receiver) ? r.receiver[0] : r.receiver;
    if (!receiver) continue;
    if (receiver.id === businessId) {
      console.error("[loadStorefrontTrustedPros] receiver.id === requester id; dropping", {
        businessId,
        receiverId: receiver.id,
      });
      continue;
    }
    if (!receiver.pass_the_torch_enabled) continue;
    if (!receiver.is_published) continue;
    resolved.push({
      receiverId: receiver.id,
      business_name: receiver.business_name,
      slug: receiver.slug,
      profile_image_url: receiver.profile_image_url,
      primary_specialty: receiver.primary_specialty,
      vouch_note: r.vouch_note,
      referral_specialty: r.referral_specialty,
    });
  }

  if (resolved.length === 0) return [];

  // Pull every peer's active service names in one query (max 5 peers,
  // typically <50 services total). Booking-flow integration uses these
  // to soft-filter referrals by the requested service.
  const { data: services } = await supabase
    .from("services")
    .select("business_id, name")
    .in("business_id", resolved.map((p) => p.receiverId))
    .eq("active", true);

  const servicesByBiz = new Map<string, string[]>();
  for (const s of (services ?? []) as Array<{ business_id: string; name: string }>) {
    const arr = servicesByBiz.get(s.business_id) ?? [];
    arr.push(s.name);
    servicesByBiz.set(s.business_id, arr);
  }

  return resolved.map((p) => {
    const peer: TrustedProPeer = {
      business_name: p.business_name,
      slug: p.slug,
      profile_image_url: p.profile_image_url,
      primary_specialty: p.primary_specialty,
      vouch_note: p.vouch_note,
      referral_specialty: p.referral_specialty,
      service_names: servicesByBiz.get(p.receiverId) ?? [],
    };
    return peer;
  });
}

/**
 * True when "now" sits inside the business's vacation window.
 *
 * The dashboard vacation form anchors `vacation_start` at local midnight
 * and `vacation_end` at 23:59:59 local, so a same-day window has positive
 * length and "today" is included on both endpoints.
 */
export function isVacationActive(
  business: Pick<Business, "vacation_start" | "vacation_end">,
): boolean {
  if (!business.vacation_start || !business.vacation_end) return false;
  const now = Date.now();
  const s = new Date(business.vacation_start).getTime();
  const e = new Date(business.vacation_end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return false;
  return now >= s && now <= e;
}

export type StorefrontTrustedProsContext =
  | "vacation"
  | "always"
  | "missing_service"
  | null;

/**
 * Resolves the trigger context for a public storefront render.
 *
 * Page-level rules (per Phase 1 spec):
 *   · Vacation overrides everything → 'vacation'.
 *   · Came-from-a-referral (?ref=) keeps the section visible → 'always'.
 *   · Otherwise → null. Healthy storefronts stay clean; the section
 *     only appears inside the booking widget when a service search has
 *     no availability (Phase 1E).
 */
export function resolveTrustedProsContext({
  business,
  refParam,
}: {
  business: Pick<Business, "vacation_start" | "vacation_end" | "pass_the_torch_enabled">;
  refParam: string | null;
}): StorefrontTrustedProsContext {
  if (!business.pass_the_torch_enabled) return null;
  if (isVacationActive(business)) return "vacation";
  if (refParam) return "always";
  return null;
}
