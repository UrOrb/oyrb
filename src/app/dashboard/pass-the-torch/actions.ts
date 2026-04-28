"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { SPECIALTIES, type Specialty } from "@/lib/types";

// Max 5 active vouches per requester. Active = pending OR accepted, on
// either pro_referrals or pro_invites (a pending invite is a pre-referral
// to a non-OYRB pro, so it counts toward the same budget).
const MAX_ACTIVE_REFERRALS = 5;
const VOUCH_NOTE_MAX = 80;
const VACATION_MESSAGE_MAX = 200;
const DECLINE_COOLDOWN_DAYS = 30;
const SPECIALTY_SET = new Set<string>(SPECIALTIES);

type ActionResult = { success: true } | { error: string };
type ActionResultWith<T> = ({ success: true } & T) | { error: string };

function sanitizeVouchNote(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const t = input.trim();
  if (!t) return null;
  return t.slice(0, VOUCH_NOTE_MAX);
}

function sanitizeSpecialty(input: unknown): Specialty | null {
  if (typeof input !== "string") return null;
  return SPECIALTY_SET.has(input) ? (input as Specialty) : null;
}

function isValidEmail(s: string) {
  // Permissive but safe — Resend rejects malformed addresses anyway.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function countActiveReferrals(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
): Promise<number> {
  const [{ count: refs }, { count: invs }] = await Promise.all([
    supabase
      .from("pro_referrals")
      .select("id", { count: "exact", head: true })
      .eq("requesting_business_id", businessId)
      .in("status", ["pending", "accepted"]),
    supabase
      .from("pro_invites")
      .select("id", { count: "exact", head: true })
      .eq("requesting_business_id", businessId)
      .eq("status", "pending"),
  ]);
  return (refs ?? 0) + (invs ?? 0);
}

function revalidateAll(slug?: string | null) {
  revalidatePath("/dashboard/pass-the-torch");
  if (slug) revalidatePath(`/s/${slug}`);
}

// ─── requestReferral ─────────────────────────────────────────────────────
// Creates a 'pending' pro_referrals row from the active business to the
// target. Reuses an existing row if one exists in 'declined' state past
// its cooldown (the unique constraint forces this; we update in place).

export async function requestReferral(args: {
  targetBusinessId: string;
  vouchNote?: string | null;
  referralSpecialty?: Specialty | null;
  acknowledged: boolean;
}): Promise<ActionResult> {
  if (!args.acknowledged) return { error: "You must acknowledge the vouch terms." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };
  if (me.id === args.targetBusinessId) {
    return { error: "You can't vouch for yourself." };
  }

  const { data: target } = await supabase
    .from("businesses")
    .select("id, business_name, contact_email, pass_the_torch_enabled")
    .eq("id", args.targetBusinessId)
    .maybeSingle();
  if (!target) return { error: "That pro wasn't found." };
  if (!target.pass_the_torch_enabled) {
    return { error: "This pro has Pass the Torch turned off." };
  }

  const vouchNote = sanitizeVouchNote(args.vouchNote);
  const referralSpecialty = sanitizeSpecialty(args.referralSpecialty);

  // Existing relationship?
  const { data: existing } = await supabase
    .from("pro_referrals")
    .select("id, status, decline_cooldown_until")
    .eq("requesting_business_id", me.id)
    .eq("receiving_business_id", target.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending") return { error: "You already have a pending request to this pro." };
    if (existing.status === "accepted") return { error: "You're already vouching for this pro." };
    if (existing.status === "blocked") return { error: "You've blocked this pro." };
    // declined: gated by cooldown
    if (existing.decline_cooldown_until && new Date(existing.decline_cooldown_until) > new Date()) {
      return { error: "This pro recently declined. Try again later." };
    }
  }

  // Cap check (counts pending + accepted referrals AND pending invites).
  const activeCount = await countActiveReferrals(supabase, me.id);
  if (activeCount >= MAX_ACTIVE_REFERRALS) {
    return { error: `You've reached the ${MAX_ACTIVE_REFERRALS}-pro limit. Remove one before adding another.` };
  }

  const now = new Date().toISOString();
  if (existing) {
    // Re-request after cooldown: revive the row.
    const { error } = await supabase
      .from("pro_referrals")
      .update({
        status: "pending",
        vouch_note: vouchNote,
        referral_specialty: referralSpecialty,
        requester_acknowledged_at: now,
        receiver_acknowledged_at: null,
        decline_cooldown_until: null,
        requested_at: now,
        responded_at: null,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pro_referrals").insert({
      requesting_business_id: me.id,
      receiving_business_id: target.id,
      status: "pending",
      vouch_note: vouchNote,
      referral_specialty: referralSpecialty,
      requester_acknowledged_at: now,
    });
    if (error) return { error: error.message };
  }

  // TODO Phase 1G: sendReferralRequestEmail(target.contact_email, me.business_name, vouchNote)

  revalidateAll(me.slug);
  return { success: true };
}

// ─── inviteByEmail ───────────────────────────────────────────────────────
// Creates a pro_invites row with a unique token. Token lands in the
// /invite/[token] landing page (Phase 1F). Counts toward the 5-active cap.

export async function inviteByEmail(args: {
  email: string;
  vouchNote?: string | null;
  acknowledged: boolean;
}): Promise<ActionResultWith<{ token: string }>> {
  if (!args.acknowledged) return { error: "You must acknowledge the vouch terms." };

  const email = (args.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  // Don't let pros invite themselves.
  if (me.contact_email && me.contact_email.toLowerCase() === email) {
    return { error: "You can't invite your own email." };
  }

  // Already have an invite to this email? (unique constraint will catch
  // it too, but a friendly error is nicer.)
  const { data: existingInvite } = await supabase
    .from("pro_invites")
    .select("id, status, expires_at")
    .eq("requesting_business_id", me.id)
    .eq("invitee_email", email)
    .maybeSingle();
  if (existingInvite && existingInvite.status === "pending") {
    return { error: "You've already sent an invite to this email." };
  }

  // Already an OYRB pro at that email? Steer them to the slug-search flow.
  const { data: existingPro } = await supabase
    .from("businesses")
    .select("id")
    .eq("contact_email", email)
    .limit(1)
    .maybeSingle();
  if (existingPro) {
    return { error: "That email belongs to an existing OYRB pro. Search them by their site URL instead." };
  }

  const vouchNote = sanitizeVouchNote(args.vouchNote);

  const activeCount = await countActiveReferrals(supabase, me.id);
  if (activeCount >= MAX_ACTIVE_REFERRALS) {
    return { error: `You've reached the ${MAX_ACTIVE_REFERRALS}-pro limit. Remove one before adding another.` };
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  // If a prior invite to this email exists (expired/accepted), replace it
  // — the unique key is (requesting_business_id, invitee_email).
  if (existingInvite) {
    const { error } = await supabase
      .from("pro_invites")
      .update({
        token,
        vouch_note: vouchNote,
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
      })
      .eq("id", existingInvite.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pro_invites").insert({
      requesting_business_id: me.id,
      invitee_email: email,
      vouch_note: vouchNote,
      token,
    });
    if (error) return { error: error.message };
  }

  // TODO Phase 1G: sendReferralInviteEmail(email, me.business_name, vouchNote, token)

  revalidateAll(me.slug);
  return { success: true, token };
}

// ─── acceptReferral ──────────────────────────────────────────────────────

export async function acceptReferral(args: {
  referralId: string;
  acknowledged: boolean;
}): Promise<ActionResult> {
  if (!args.acknowledged) return { error: "You must acknowledge the vouch terms." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  const { data: row } = await supabase
    .from("pro_referrals")
    .select("id, status, requesting_business_id, receiving_business_id")
    .eq("id", args.referralId)
    .maybeSingle();
  if (!row) return { error: "Request not found." };
  if (row.receiving_business_id !== me.id) return { error: "Not your request to accept." };
  if (row.status !== "pending") return { error: "That request is no longer pending." };

  // Defense-in-depth: verify the requester still has capacity. The
  // request-time cap normally guarantees this, but a concurrent accept
  // could push them over.
  const requesterActive = await countActiveReferrals(supabase, row.requesting_business_id);
  if (requesterActive > MAX_ACTIVE_REFERRALS) {
    return { error: "The requesting pro has reached their referral limit." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("pro_referrals")
    .update({
      status: "accepted",
      responded_at: now,
      receiver_acknowledged_at: now,
    })
    .eq("id", row.id);
  if (error) return { error: error.message };

  // TODO Phase 1G: lookup requester's contact_email and business_name,
  // then sendReferralAcceptedEmail(requesterEmail, me.business_name)

  revalidateAll(me.slug);
  // Also revalidate the requester's storefront so their accepted card
  // appears immediately. We don't have their slug here without a fetch,
  // so do a single query.
  const { data: requester } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", row.requesting_business_id)
    .maybeSingle();
  if (requester?.slug) revalidatePath(`/s/${requester.slug}`);
  return { success: true };
}

// ─── declineReferral ─────────────────────────────────────────────────────

export async function declineReferral(args: {
  referralId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  const { data: row } = await supabase
    .from("pro_referrals")
    .select("id, status, receiving_business_id")
    .eq("id", args.referralId)
    .maybeSingle();
  if (!row) return { error: "Request not found." };
  if (row.receiving_business_id !== me.id) return { error: "Not your request to decline." };
  if (row.status !== "pending") return { error: "That request is no longer pending." };

  const now = new Date();
  const cooldownUntil = new Date(now.getTime() + DECLINE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("pro_referrals")
    .update({
      status: "declined",
      responded_at: now.toISOString(),
      decline_cooldown_until: cooldownUntil.toISOString(),
    })
    .eq("id", row.id);
  if (error) return { error: error.message };

  // No email on decline — avoid pile-on.

  revalidateAll(me.slug);
  return { success: true };
}

// ─── removeReferral ──────────────────────────────────────────────────────
// Either party can delete the row. RLS allows both sides to delete.

export async function removeReferral(args: {
  referralId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  // Capture the pair before delete so we can revalidate both storefronts.
  const { data: row } = await supabase
    .from("pro_referrals")
    .select("id, requesting_business_id, receiving_business_id")
    .eq("id", args.referralId)
    .maybeSingle();
  if (!row) return { error: "Referral not found." };
  if (row.requesting_business_id !== me.id && row.receiving_business_id !== me.id) {
    return { error: "Not your referral." };
  }

  const { error } = await supabase.from("pro_referrals").delete().eq("id", row.id);
  if (error) return { error: error.message };

  // Find the other side's slug to revalidate their storefront too.
  const otherId = row.requesting_business_id === me.id
    ? row.receiving_business_id
    : row.requesting_business_id;
  const { data: other } = await supabase
    .from("businesses")
    .select("slug")
    .eq("id", otherId)
    .maybeSingle();

  revalidateAll(me.slug);
  if (other?.slug) revalidatePath(`/s/${other.slug}`);
  return { success: true };
}

// ─── blockPro ────────────────────────────────────────────────────────────
// Blocks future requests from me to the target. Stored as a my-side row
// with status='blocked'; the unique constraint means we update if a row
// already exists between us.

export async function blockPro(args: {
  businessId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };
  if (me.id === args.businessId) return { error: "You can't block yourself." };

  const { data: existing } = await supabase
    .from("pro_referrals")
    .select("id")
    .eq("requesting_business_id", me.id)
    .eq("receiving_business_id", args.businessId)
    .maybeSingle();

  const now = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from("pro_referrals")
      .update({
        status: "blocked",
        responded_at: now,
        // Clear consent timestamps; this isn't a vouching relationship.
        requester_acknowledged_at: null,
        receiver_acknowledged_at: null,
        decline_cooldown_until: null,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pro_referrals").insert({
      requesting_business_id: me.id,
      receiving_business_id: args.businessId,
      status: "blocked",
    });
    if (error) return { error: error.message };
  }

  revalidateAll(me.slug);
  return { success: true };
}

// ─── reorderReferrals ────────────────────────────────────────────────────
// Updates `position` based on order in the input array. Caller must own
// every referral in the list as the requester (RLS allows update only by
// receiver, so we use a more permissive admin-free path: the constraint
// is enforced by ownership check + UPDATE policy on requester-side rows
// requires elevation. Implement as: verify ownership, then update each.)
//
// Note: the "pros update referrals they receive" RLS policy only permits
// the receiver to UPDATE. To let the requester reorder their own list,
// we add ordering as a service-role write OR add a second UPDATE policy
// in the migration. The migration intentionally restricts UPDATE to the
// receiver, so position writes go through createAdminClient() here, with
// strict pre-check that all rows belong to the calling requester.

export async function reorderReferrals(args: {
  orderedIds: string[];
}): Promise<ActionResult> {
  if (!Array.isArray(args.orderedIds) || args.orderedIds.length === 0) {
    return { error: "No order provided." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  // Ownership check: every id must be a referral where I'm the requester.
  const { data: owned } = await supabase
    .from("pro_referrals")
    .select("id")
    .in("id", args.orderedIds)
    .eq("requesting_business_id", me.id);

  const ownedIds = new Set((owned ?? []).map((r) => r.id));
  for (const id of args.orderedIds) {
    if (!ownedIds.has(id)) return { error: "You don't own one of those referrals." };
  }

  // Use the admin client to bypass the receiver-only UPDATE RLS policy.
  // Safe because we just verified ownership above as the authenticated user.
  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient();

  // Sequential to keep positions deterministic; the list is small (<=5).
  for (let i = 0; i < args.orderedIds.length; i++) {
    const { error } = await admin
      .from("pro_referrals")
      .update({ position: i })
      .eq("id", args.orderedIds[i])
      .eq("requesting_business_id", me.id);
    if (error) return { error: error.message };
  }

  revalidateAll(me.slug);
  return { success: true };
}

// ─── updateVacationMode ──────────────────────────────────────────────────

export async function updateVacationMode(args: {
  start: string | null;
  end: string | null;
  message?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  const start = args.start ? new Date(args.start) : null;
  const end = args.end ? new Date(args.end) : null;

  // Both set or both null.
  if ((start && !end) || (!start && end)) {
    return { error: "Set both a start and end date, or clear both." };
  }
  if (start && end && start.getTime() >= end.getTime()) {
    return { error: "End date must be after start date." };
  }

  const message = typeof args.message === "string"
    ? args.message.trim().slice(0, VACATION_MESSAGE_MAX) || null
    : null;

  const { error } = await supabase
    .from("businesses")
    .update({
      vacation_start: start ? start.toISOString() : null,
      vacation_end: end ? end.toISOString() : null,
      vacation_message: message,
    })
    .eq("id", me.id);
  if (error) return { error: error.message };

  revalidateAll(me.slug);
  return { success: true };
}

// ─── togglePassTheTorch ──────────────────────────────────────────────────

export async function togglePassTheTorch(args: {
  enabled: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  const { error } = await supabase
    .from("businesses")
    .update({ pass_the_torch_enabled: !!args.enabled })
    .eq("id", me.id);
  if (error) return { error: error.message };

  revalidateAll(me.slug);
  return { success: true };
}

// ─── searchProsBySlug ────────────────────────────────────────────────────
// Slug-only search per Phase 1 spec. Accepts a bare slug, a /s/<slug>
// path, or a full storefront URL. Returns up to 10 candidates ordered by
// exact-match-first. Excludes self and pros with the master toggle off.

export async function searchProsBySlug(args: {
  query: string;
}): Promise<ActionResultWith<{
  results: Array<{
    id: string;
    business_name: string;
    slug: string;
    primary_specialty: Specialty | null;
    profile_image_url: string | null;
  }>;
}>> {
  const raw = (args.query || "").trim();
  if (!raw) return { success: true, results: [] };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const me = await getCurrentBusiness();
  if (!me) return { error: "No active business." };

  // Pull a slug out of whatever the user pasted.
  const slugFromInput = (() => {
    let s = raw;
    // Strip protocol + host.
    s = s.replace(/^https?:\/\/[^/]+/i, "");
    // /s/<slug> → <slug>
    const m = s.match(/\/s\/([a-z0-9-]+)/i);
    if (m) return m[1].toLowerCase();
    // Already just a slug-ish thing.
    return s.replace(/^\/+|\/+$/g, "").toLowerCase();
  })();

  if (!/^[a-z0-9-]{1,80}$/.test(slugFromInput)) {
    return { success: true, results: [] };
  }

  // Exact match first, then prefix matches.
  const { data: rows } = await supabase
    .from("businesses")
    .select("id, business_name, slug, primary_specialty, profile_image_url, pass_the_torch_enabled")
    .or(`slug.eq.${slugFromInput},slug.ilike.${slugFromInput}%`)
    .neq("id", me.id)
    .eq("pass_the_torch_enabled", true)
    .limit(10);

  const results = (rows ?? [])
    .map((r) => ({
      id: r.id as string,
      business_name: r.business_name as string,
      slug: r.slug as string,
      primary_specialty: (r.primary_specialty as Specialty | null) ?? null,
      profile_image_url: (r.profile_image_url as string | null) ?? null,
      _exact: r.slug === slugFromInput ? 0 : 1,
    }))
    .sort((a, b) => a._exact - b._exact)
    .map(({ _exact, ...rest }) => rest);

  return { success: true, results };
}
