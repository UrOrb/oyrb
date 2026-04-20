import { createClient, createAdminClient } from "@/lib/supabase/server";

// Bump this string whenever the agreement text meaningfully changes.
// Listings with an older agreement_version silently hide until the user
// re-accepts.
export const DIRECTORY_AGREEMENT_VERSION = "2026-04-20.v1";

export const DIRECTORY_AGREEMENT_TEXT = [
  "I understand my profile will be visible on the public internet.",
  "I understand search engines like Google may index my listing if I opt in.",
  "I will NEVER share my personal email, phone, or home address in public fields. OYRB automatically strips these if detected.",
  "I understand I can remove my listing anytime, and it will disappear from the public directory within 5 minutes.",
  "I will only share info I'm comfortable having public.",
  "I understand OYRB is not responsible for how visitors use publicly shared info.",
];

export type VisibilityPreset = "minimal" | "social" | "full" | "custom";

export type DirectoryListing = {
  user_id: string;
  is_listed: boolean;
  agreement_accepted_at: string | null;
  agreement_version: string | null;
  show_business_name: boolean;
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
  profession: string | null;
  city: string | null;
  state: string | null;
  specialties: string[] | null;
  bio: string | null;
  booking_url: string | null;
  full_site_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  accepting_clients: boolean | null;
  price_range: string | null;
  slug: string | null;
  report_count: number;
  is_hidden_pending_review: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// PII sanitization. Public fields (business name, city, specialty tags,
// bio) are scanned for email / phone / US street-address patterns. If any
// are found the save is rejected with a clear error — we never silently
// strip and re-save, because that would confuse users who typed contact
// info on purpose.
// ─────────────────────────────────────────────────────────────────────────

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// Covers (555) 555-5555, 555-555-5555, 555.555.5555, +1 555 555 5555,
// and 10 consecutive digits.
const PHONE_RE = /(\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\b\d{10}\b/;
// Coarse US street address: leading number + word + common suffix.
const ADDRESS_RE =
  /\b\d+\s+[A-Za-z][A-Za-z0-9\s]*\b(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Suite|Ste|Apt|Apartment|Floor|Fl)\b/i;

export type SanitizationResult =
  | { ok: true; value: string }
  | { ok: false; error: string; detected: "email" | "phone" | "address" };

export function sanitizePublicText(input: string | null | undefined): SanitizationResult {
  const value = (input ?? "").trim();
  if (!value) return { ok: true, value: "" };
  if (EMAIL_RE.test(value)) {
    return {
      ok: false,
      error: "Public fields cannot contain an email address. OYRB protects your privacy.",
      detected: "email",
    };
  }
  if (PHONE_RE.test(value)) {
    return {
      ok: false,
      error: "Public fields cannot contain a phone number. OYRB protects your privacy.",
      detected: "phone",
    };
  }
  if (ADDRESS_RE.test(value)) {
    return {
      ok: false,
      error: "Public fields cannot contain a street address. OYRB protects your privacy.",
      detected: "address",
    };
  }
  return { ok: true, value };
}

// Social handle normalizer — strips URLs, @, and anything after a slash.
export function normalizeHandle(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const handle = v
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]
    .trim();
  if (!handle) return null;
  // Handles are 1-30 chars, alphanumeric + . _
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null;
  return handle.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────
// Slug generation — unique, human-readable, no PII.
// ─────────────────────────────────────────────────────────────────────────
export function baseSlugFor(businessName: string, city: string | null): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
  const n = clean(businessName || "pro");
  const c = city ? clean(city) : "";
  return c ? `${n}-${c}` : n || "pro";
}

/** Ensures the proposed slug is unique against directory_listings.slug. */
export async function resolveUniqueSlug(
  proposed: string,
  currentUserId: string,
): Promise<string> {
  const admin = createAdminClient();
  let candidate = proposed;
  let n = 1;
  while (true) {
    const { data } = await admin
      .from("directory_listings")
      .select("user_id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.user_id === currentUserId) return candidate;
    n += 1;
    candidate = `${proposed}-${n}`;
    if (n > 50) return `${proposed}-${Date.now().toString(36)}`; // shouldn't happen
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Public directory queries — used by /find and /find/[slug]. Every query
// enforces the triad (is_listed + accepted agreement version + not hidden).
// ─────────────────────────────────────────────────────────────────────────

export type PublicListing = {
  slug: string;
  businessName: string | null;
  avatarUrl: string | null;
  profession: string | null;
  city: string | null;
  state: string | null;
  specialties: string[] | null;
  bio: string | null;
  bookingUrl: string | null;
  fullSiteUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  gallery: string[] | null;
  acceptingClients: boolean | null;
  priceRange: string | null;
  allowIndexing: boolean;
  createdAt: string | null;
};

/**
 * Projects a raw listing row down to only the fields the owner opted into.
 * Callers must NEVER read raw fields off the row directly — use this.
 */
export function toPublicListing(
  row: DirectoryListing & {
    business_name?: string | null;
    profile_image_url?: string | null;
    business_category?: string | null;
    gallery_urls?: string[] | null;
    created_at?: string | null;
  },
): PublicListing | null {
  if (!row.is_listed || row.is_hidden_pending_review) return null;
  if (row.agreement_version !== DIRECTORY_AGREEMENT_VERSION) return null;
  if (!row.slug) return null;
  return {
    slug: row.slug,
    businessName: row.show_business_name ? row.business_name ?? null : null,
    avatarUrl: row.show_avatar ? row.profile_image_url ?? null : null,
    profession: row.show_profession
      ? row.profession ?? row.business_category ?? null
      : null,
    city: row.show_city ? row.city : null,
    state: row.show_city ? row.state : null,
    specialties: row.show_specialty_tags ? row.specialties : null,
    bio: row.show_bio ? row.bio : null,
    bookingUrl: row.show_booking_link ? row.booking_url : null,
    fullSiteUrl: row.show_full_site_link ? row.full_site_url : null,
    instagramHandle: row.show_instagram ? row.instagram_handle : null,
    tiktokHandle: row.show_tiktok ? row.tiktok_handle : null,
    gallery: row.show_gallery ? row.gallery_urls ?? null : null,
    acceptingClients: row.show_accepting_clients ? row.accepting_clients : null,
    priceRange: row.show_price_range ? row.price_range : null,
    allowIndexing: row.allow_search_engine_indexing,
    createdAt: row.created_at ?? null,
  };
}

// Directory rows don't have a direct FK to businesses (both relate to
// auth.users by different columns), so PostgREST can't auto-embed the
// business row. We fetch in two passes and stitch by user_id.
type BizSidecar = {
  business_name: string | null;
  profile_image_url: string | null;
  service_category: string | null;
};

async function loadBizByOwnerIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
): Promise<Map<string, BizSidecar>> {
  const byOwner = new Map<string, BizSidecar>();
  if (userIds.length === 0) return byOwner;
  const { data } = await supabase
    .from("businesses")
    .select("owner_id, business_name, profile_image_url, service_category, created_at, is_published")
    .in("owner_id", userIds)
    .order("created_at", { ascending: true });
  // Keep the oldest (first) business per owner — matches saveVisibilitySettings.
  for (const row of data ?? []) {
    const id = row.owner_id as string;
    if (byOwner.has(id)) continue;
    byOwner.set(id, {
      business_name: (row.business_name as string | null) ?? null,
      profile_image_url: (row.profile_image_url as string | null) ?? null,
      service_category: (row.service_category as string | null) ?? null,
    });
  }
  return byOwner;
}

/**
 * Search public listings with optional city + specialty filter.
 * Falls back to full-list when no params. Never exposes raw rows.
 */
export async function searchPublicListings(opts: {
  city?: string;
  specialty?: string;
  limit?: number;
}): Promise<PublicListing[]> {
  const supabase = await createClient();
  const limit = Math.min(Math.max(opts.limit ?? 48, 1), 100);

  let q = supabase
    .from("directory_listings")
    .select("*")
    .eq("is_listed", true)
    .eq("is_hidden_pending_review", false)
    .eq("agreement_version", DIRECTORY_AGREEMENT_VERSION)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (opts.city?.trim()) q = q.ilike("city", `%${opts.city.trim()}%`);
  if (opts.specialty?.trim())
    q = q.contains("specialties", [opts.specialty.trim()]);

  const { data, error } = await q;
  if (error || !data) return [];

  const bizMap = await loadBizByOwnerIds(
    supabase,
    data.map((r) => r.user_id as string),
  );

  return data
    .map((row) => {
      const biz = bizMap.get(row.user_id as string);
      return toPublicListing({
        ...(row as DirectoryListing & { created_at?: string }),
        business_name: biz?.business_name ?? null,
        profile_image_url: biz?.profile_image_url ?? null,
        business_category: biz?.service_category ?? null,
      });
    })
    .filter((x): x is PublicListing => x !== null);
}

/**
 * Variant of search that orders by most-recent — feeds the "Recently
 * joined" row at the bottom of /find. Same RLS + consent rules.
 */
export async function getRecentListings(limit = 8): Promise<PublicListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("directory_listings")
    .select("*")
    .eq("is_listed", true)
    .eq("is_hidden_pending_review", false)
    .eq("agreement_version", DIRECTORY_AGREEMENT_VERSION)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  const bizMap = await loadBizByOwnerIds(
    supabase,
    data.map((r) => r.user_id as string),
  );
  return data
    .map((row) => {
      const biz = bizMap.get(row.user_id as string);
      return toPublicListing({
        ...(row as DirectoryListing & { created_at?: string }),
        business_name: biz?.business_name ?? null,
        profile_image_url: biz?.profile_image_url ?? null,
        business_category: biz?.service_category ?? null,
      });
    })
    .filter((x): x is PublicListing => x !== null);
}

/** Fetch a single listing by slug. Returns null if not public. */
export async function getPublicListingBySlug(
  slug: string,
): Promise<PublicListing | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("directory_listings")
    .select("*")
    .eq("slug", slug)
    .eq("is_listed", true)
    .eq("is_hidden_pending_review", false)
    .eq("agreement_version", DIRECTORY_AGREEMENT_VERSION)
    .maybeSingle();
  if (!data) return null;
  const bizMap = await loadBizByOwnerIds(supabase, [data.user_id as string]);
  const biz = bizMap.get(data.user_id as string);
  return toPublicListing({
    ...(data as DirectoryListing & { created_at?: string }),
    business_name: biz?.business_name ?? null,
    profile_image_url: biz?.profile_image_url ?? null,
    business_category: biz?.service_category ?? null,
  });
}

/** All indexable listings — feeds sitemap.ts. */
export async function getIndexableSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("directory_listings")
    .select("slug")
    .eq("is_listed", true)
    .eq("is_hidden_pending_review", false)
    .eq("allow_search_engine_indexing", true)
    .eq("agreement_version", DIRECTORY_AGREEMENT_VERSION);
  return (data ?? [])
    .map((r) => r.slug as string | null)
    .filter((s): s is string => !!s);
}

/**
 * Returns the user's current listing row (or null). Used by the dashboard
 * to drive the opt-in flow state machine.
 */
export async function getMyListing(userId: string): Promise<DirectoryListing | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("directory_listings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data ?? null) as DirectoryListing | null;
}
