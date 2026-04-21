"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import {
  DIRECTORY_AGREEMENT_VERSION,
  baseSlugFor,
  normalizeHandle,
  resolveUniqueSlug,
  sanitizePublicText,
} from "@/lib/directory";

// ─────────────────────────────────────────────────────────────────────────
// Opt-in agreement
// ─────────────────────────────────────────────────────────────────────────

/**
 * Records the user's acceptance of the current DIRECTORY_AGREEMENT_VERSION.
 * Creates the listing row if it doesn't exist (is_listed stays false until
 * visibility is saved). Writes an immutable entry to directory_consent_log
 * so we can prove which version they agreed to, and when.
 */
export async function acceptAgreement(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const now = new Date().toISOString();

  // Upsert the listing row — keeps is_listed false until the user
  // explicitly confirms visibility settings.
  const { error: upsertErr } = await supabase
    .from("directory_listings")
    .upsert(
      {
        user_id: user.id,
        is_listed: false,
        agreement_accepted_at: now,
        agreement_version: DIRECTORY_AGREEMENT_VERSION,
      },
      { onConflict: "user_id" },
    );
  if (upsertErr) return { ok: false, error: upsertErr.message };

  // Append-only audit log. IP is hashed so we can recognize repeat
  // acceptances without retaining raw PII.
  await supabase.from("directory_consent_log").insert({
    user_id: user.id,
    agreement_version: DIRECTORY_AGREEMENT_VERSION,
    accepted_at: now,
  });

  revalidatePath("/dashboard/directory");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Visibility settings save
// ─────────────────────────────────────────────────────────────────────────

export type SaveVisibilityInput = {
  // toggles
  show_avatar: boolean;
  show_profession: boolean;
  show_city: boolean;
  show_specialty_tags: boolean;
  show_bio: boolean;
  show_booking_link: boolean;
  show_instagram: boolean;
  show_tiktok: boolean;
  show_full_site_link: boolean;
  show_gallery: boolean;
  show_accepting_clients: boolean;
  show_price_range: boolean;
  allow_search_engine_indexing: boolean;
  // content
  profession?: string;
  city?: string;
  state?: string;
  specialties?: string[];
  bio?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  accepting_clients?: boolean;
  price_range?: "$" | "$$" | "$$$" | null;
  // publish flag
  go_live: boolean;
};

/**
 * Saves visibility settings + (optionally) flips is_listed on. Sanitizes
 * every public text field; rejects with a clear error if PII is detected.
 * Auto-fills booking_url + full_site_url + gallery from the user's first
 * published OYRB site. If go_live=true and nothing has passed the sanity
 * checks, we still save the toggles but keep is_listed false.
 */
export async function saveVisibilitySettings(
  input: SaveVisibilityInput,
): Promise<
  | { ok: true; slug: string | null; is_listed: boolean }
  | { ok: false; error: string; field?: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Require the user to have already accepted the current agreement.
  const { data: existing } = await supabase
    .from("directory_listings")
    .select("agreement_version, slug")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing || existing.agreement_version !== DIRECTORY_AGREEMENT_VERSION) {
    return { ok: false, error: "Please accept the current directory agreement first." };
  }

  // Sanitize every free-text field.
  const fields: Array<[string, string | undefined]> = [
    ["profession", input.profession?.slice(0, 60)],
    ["city", input.city],
    ["state", input.state],
    ["bio", input.bio?.slice(0, 200)],
  ];
  const sanitized: Record<string, string | null> = {};
  for (const [k, v] of fields) {
    const r = sanitizePublicText(v);
    if (!r.ok) return { ok: false, error: r.error, field: k };
    sanitized[k] = r.value || null;
  }
  // Specialties sanitized item-by-item.
  const cleanSpecialties: string[] = [];
  for (const tag of input.specialties ?? []) {
    const r = sanitizePublicText(tag);
    if (!r.ok) return { ok: false, error: r.error, field: "specialties" };
    if (r.value) cleanSpecialties.push(r.value.slice(0, 40));
  }

  // Fetch the user's first published business to auto-fill booking + site links.
  // NOTE: the real column is `gallery_photos`, not `gallery_image_urls` —
  // selecting the wrong name errored silently and left biz=null, which
  // made every "Publish to Directory" click turn into a silent draft save.
  const { data: biz, error: bizErr } = await supabase
    .from("businesses")
    .select("business_name, slug, is_published")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (bizErr) return { ok: false, error: bizErr.message };

  // Publishing to the directory requires a published booking site so that
  // show_booking_link / show_full_site_link have a real URL to point to,
  // and so the slug can be derived deterministically. Fail loudly rather
  // than silently downgrading to a draft save.
  if (input.go_live && (!biz || !biz.is_published)) {
    return {
      ok: false,
      error:
        "Please publish your booking site first. Go to Dashboard → Site, fill it in, and toggle it live before publishing to the directory.",
    };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";
  const bookingUrl = biz?.is_published ? `${origin}/s/${biz.slug}` : null;
  const fullSiteUrl = bookingUrl; // same URL for now; separate column for future

  // Slug — reuse if already set, otherwise generate from business name +
  // city. Cannot contain PII by construction.
  let slug = existing.slug as string | null;
  if (!slug && biz?.business_name) {
    slug = await resolveUniqueSlug(
      baseSlugFor(biz.business_name, sanitized.city),
      user.id,
    );
  }

  const { error } = await supabase
    .from("directory_listings")
    .update({
      show_business_name: true, // always required for any listing
      show_avatar: input.show_avatar,
      show_profession: input.show_profession,
      show_city: input.show_city,
      show_specialty_tags: input.show_specialty_tags,
      show_bio: input.show_bio,
      show_booking_link: input.show_booking_link,
      show_instagram: input.show_instagram,
      show_tiktok: input.show_tiktok,
      show_full_site_link: input.show_full_site_link,
      show_gallery: input.show_gallery,
      show_accepting_clients: input.show_accepting_clients,
      show_price_range: input.show_price_range,
      allow_search_engine_indexing: input.allow_search_engine_indexing,
      profession: sanitized.profession,
      city: sanitized.city,
      state: sanitized.state,
      specialties: cleanSpecialties.length ? cleanSpecialties : null,
      bio: sanitized.bio,
      booking_url: bookingUrl,
      full_site_url: fullSiteUrl,
      instagram_handle: normalizeHandle(input.instagram_handle),
      tiktok_handle: normalizeHandle(input.tiktok_handle),
      accepting_clients: input.accepting_clients ?? true,
      price_range: input.price_range ?? null,
      slug,
      is_listed: input.go_live && !!slug,
      is_hidden_pending_review: false,
      delisted_at: input.go_live ? null : undefined,
    })
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  // Publishing attempt without a slug is an invariant violation now that
  // the go_live gate above requires a published site — surface it instead
  // of quietly demoting to a draft.
  if (input.go_live && !slug) {
    return {
      ok: false,
      error: "Could not generate a directory URL from your site name. Update your business name and try again.",
    };
  }

  // Invalidate /find cache so the new/updated listing shows up fast.
  revalidatePath("/find");
  revalidatePath("/dashboard/directory");
  if (slug) revalidatePath(`/find/${slug}`);

  return { ok: true, slug, is_listed: input.go_live && !!slug };
}

// Sync utilities used to live here but moved to ./presets — Next.js only
// allows async exports from a "use server" module.

// ─────────────────────────────────────────────────────────────────────────
// Delist + hard-delete
// ─────────────────────────────────────────────────────────────────────────

/** Instant delist — the listing disappears from /find within seconds of the
 *  next CDN cache invalidation. Keeps the row so re-listing later is fast. */
export async function delistMyListing(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: row } = await supabase
    .from("directory_listings")
    .select("slug")
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("directory_listings")
    .update({ is_listed: false, delisted_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/find");
  revalidatePath("/dashboard/directory");
  if (row?.slug) revalidatePath(`/find/${row.slug}`);
  return { ok: true };
}

/** Hard delete — wipes the user's directory row AND their consent-log
 *  history. After this, they'd need to re-accept the agreement to re-list. */
export async function deleteMyDirectoryData(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  await supabase.from("directory_consent_log").delete().eq("user_id", user.id);
  const { error } = await supabase
    .from("directory_listings")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/find");
  revalidatePath("/dashboard/directory");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Report a listing
// ─────────────────────────────────────────────────────────────────────────

function coarseIp(fullIp: string | null | undefined): string | null {
  if (!fullIp) return null;
  // Hash the IP with SHA-256 — we store only the digest, not the raw
  // address. That lets us rate-limit repeat reports without retaining PII.
  return createHash("sha256").update(fullIp).digest("hex").slice(0, 16);
}

/**
 * Files a report. After 3 unhandled reports on a single listing, the
 * listing auto-hides pending admin review. Uses the admin client because
 * anon RLS doesn't include the "update listing report_count" permission.
 */
export async function reportListing(
  listingUserId: string,
  reason: string,
  ip: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!listingUserId) return { ok: false, error: "Missing listing id" };
  const cleanReason = reason?.trim().slice(0, 500) || "No reason provided";

  const admin = createAdminClient();
  const { error: insErr } = await admin.from("directory_reports").insert({
    listing_id: listingUserId,
    reason: cleanReason,
    reporter_ip: coarseIp(ip),
  });
  if (insErr) return { ok: false, error: insErr.message };

  // Refresh the count and auto-hide at threshold.
  const { count } = await admin
    .from("directory_reports")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingUserId)
    .eq("handled", false);

  const total = count ?? 0;
  const updates: Record<string, unknown> = { report_count: total };
  if (total >= 3) updates.is_hidden_pending_review = true;
  await admin.from("directory_listings").update(updates).eq("user_id", listingUserId);

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Admin moderation actions — protected by isAdmin()
// ─────────────────────────────────────────────────────────────────────────

export async function adminApproveListing(
  listingUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const a = await requireAdmin();
  if (!a.ok) return { ok: false, error: a.error };
  const admin = createAdminClient();
  await admin
    .from("directory_reports")
    .update({ handled: true, handled_at: new Date().toISOString() })
    .eq("listing_id", listingUserId);
  await admin
    .from("directory_listings")
    .update({ is_hidden_pending_review: false, report_count: 0 })
    .eq("user_id", listingUserId);
  revalidatePath("/dashboard/admin/directory");
  revalidatePath("/find");
  return { ok: true };
}

export async function adminForceDelistListing(
  listingUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const a = await requireAdmin();
  if (!a.ok) return { ok: false, error: a.error };
  const admin = createAdminClient();
  await admin
    .from("directory_listings")
    .update({
      is_listed: false,
      is_hidden_pending_review: true,
      delisted_at: new Date().toISOString(),
    })
    .eq("user_id", listingUserId);
  await admin
    .from("directory_reports")
    .update({ handled: true, handled_at: new Date().toISOString() })
    .eq("listing_id", listingUserId);
  revalidatePath("/dashboard/admin/directory");
  revalidatePath("/find");
  return { ok: true };
}
