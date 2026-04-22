import { createAdminClient } from "@/lib/supabase/server";
import {
  DEFAULT_LABELS,
  type StatType,
} from "@/lib/pro-stats-types";

// Re-export the client-safe helpers so callers can keep importing the
// full surface from "@/lib/pro-stats". Only the server-only loader +
// resolveStat live below.
export {
  STAT_TYPES,
  STAT_OPTION_LABELS,
  DEFAULT_LABELS,
  sanitizeStatLabel,
  isLabelSanitized,
  type StatType,
} from "@/lib/pro-stats-types";

// Display value for a stat. Falls back to "Verified Pro" when the stat
// doesn't meet its minimum-data threshold (e.g. fewer than 3 reviews for
// rating), per spec. The render code uses this string verbatim.
const VERIFIED_PRO_FALLBACK = "Verified Pro";

// Round a raw booking count down to a "marketing round" bucket so
// early-stage pros get an honest but punchy number. 0 → fallback,
// 1-9 → "X Bookings", 10-24 → "10+", 25-49 → "25+", etc.
function roundBookings(n: number): string {
  if (n <= 0) return VERIFIED_PRO_FALLBACK;
  if (n < 10) return `${n} Booking${n === 1 ? "" : "s"}`;
  for (const tier of [1000, 500, 200, 100, 50, 25, 10]) {
    if (n >= tier) return `${tier}+ Bookings`;
  }
  return `${n} Bookings`;
}

// Pre-queried inputs. Keep the shape tight — each field is a single cheap
// query; the caller batches them.
export type ProStatsInputs = {
  reviewsCount: number;        // status in ('live','flagged')
  averageRating: number | null; // null when reviewsCount === 0
  completedBookingsCount: number; // status in ('confirmed','completed') + end_at in past
  servicesCount: number;
  specialty: string | null;
  city: string | null;
  accountCreatedAt: Date | null;
  repeatClientRate: number | null; // null when totalClients < 10
};

export type ResolvedStat = { value: string; label: string };

export function resolveStat(
  type: StatType,
  inputs: ProStatsInputs,
  customLabel?: string,
): ResolvedStat {
  const label = (customLabel?.trim() || DEFAULT_LABELS[type]).slice(0, 20);

  switch (type) {
    case "verified_rating": {
      if (inputs.reviewsCount < 3 || inputs.averageRating == null) {
        return { value: VERIFIED_PRO_FALLBACK, label };
      }
      return { value: `${inputs.averageRating.toFixed(1)} ★`, label };
    }
    case "verified_reviews": {
      if (inputs.reviewsCount <= 0) return { value: VERIFIED_PRO_FALLBACK, label };
      return { value: `${inputs.reviewsCount} Review${inputs.reviewsCount === 1 ? "" : "s"}`, label };
    }
    case "completed_bookings": {
      return { value: roundBookings(inputs.completedBookingsCount), label };
    }
    case "years_on_oyrb": {
      if (!inputs.accountCreatedAt) return { value: VERIFIED_PRO_FALLBACK, label };
      const ms = Date.now() - inputs.accountCreatedAt.getTime();
      const years = ms / (365.25 * 24 * 60 * 60 * 1000);
      if (years < 1) {
        const months = Math.max(1, Math.floor(ms / (30 * 24 * 60 * 60 * 1000)));
        return { value: `${months} mo on OYRB`, label };
      }
      const y = Math.floor(years);
      return { value: `${y} yr${y === 1 ? "" : "s"} on OYRB`, label };
    }
    case "services_offered": {
      if (inputs.servicesCount <= 0) return { value: VERIFIED_PRO_FALLBACK, label };
      return { value: `${inputs.servicesCount} Service${inputs.servicesCount === 1 ? "" : "s"}`, label };
    }
    case "specialty": {
      if (!inputs.specialty) return { value: VERIFIED_PRO_FALLBACK, label };
      return { value: inputs.specialty, label };
    }
    case "location": {
      if (!inputs.city) return { value: VERIFIED_PRO_FALLBACK, label };
      return { value: inputs.city, label };
    }
    case "client_retention": {
      if (inputs.repeatClientRate == null) return { value: VERIFIED_PRO_FALLBACK, label };
      return { value: `${Math.round(inputs.repeatClientRate * 100)}% Return`, label };
    }
  }
}

/**
 * Loads every input once + returns a ProStatsInputs object. Expensive
 * enough that the caller should call it ONCE per page render (not once
 * per stat).
 */
export async function loadProStatsInputs(biz: {
  id: string;
  owner_id: string;
  service_category?: string | null;
  city?: string | null;
}): Promise<ProStatsInputs> {
  const admin = createAdminClient();

  const [
    reviews,
    completed,
    services,
    ownerProfile,
    bookingsAll,
  ] = await Promise.all([
    admin
      .from("reviews")
      .select("rating", { count: "exact" })
      .eq("business_id", biz.id)
      .in("status", ["live", "flagged"]),
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("business_id", biz.id)
      .in("status", ["confirmed", "completed"])
      .lte("end_at", new Date().toISOString()),
    admin
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", biz.id)
      .eq("active", true),
    admin.auth.admin.getUserById(biz.owner_id),
    admin
      .from("bookings")
      .select("client_id")
      .eq("business_id", biz.id)
      .neq("status", "cancelled")
      .not("client_id", "is", null),
  ]);

  const reviewsCount = (reviews.count as number | null) ?? (reviews.data?.length ?? 0);
  const averageRating =
    reviewsCount > 0 && reviews.data
      ? reviews.data.reduce(
          (s: number, r: { rating: number | null }) => s + (r.rating ?? 0),
          0,
        ) / reviewsCount
      : null;

  // Repeat-client rate: % of clients with 2+ non-cancelled bookings among
  // pros with 10+ total. Under 10 total bookings → null (spec: hide).
  const bookingsByClient = new Map<string, number>();
  for (const b of (bookingsAll.data ?? []) as Array<{ client_id: string }>) {
    bookingsByClient.set(b.client_id, (bookingsByClient.get(b.client_id) ?? 0) + 1);
  }
  const totalBookings = Array.from(bookingsByClient.values()).reduce((s, n) => s + n, 0);
  const repeatClientRate =
    totalBookings >= 10 && bookingsByClient.size > 0
      ? Array.from(bookingsByClient.values()).filter((n) => n >= 2).length /
        bookingsByClient.size
      : null;

  const accountCreatedAt = ownerProfile.data?.user?.created_at
    ? new Date(ownerProfile.data.user.created_at)
    : null;

  return {
    reviewsCount,
    averageRating,
    completedBookingsCount: (completed.count as number | null) ?? 0,
    servicesCount: (services.count as number | null) ?? 0,
    specialty: biz.service_category
      ? biz.service_category.charAt(0).toUpperCase() + biz.service_category.slice(1)
      : null,
    city: biz.city ?? null,
    accountCreatedAt,
    repeatClientRate,
  };
}

// sanitizeStatLabel + isLabelSanitized were moved to pro-stats-types.ts
// so the browser bundle for the site editor doesn't have to drag in
// createAdminClient. They're re-exported from this module for
// backwards compatibility (see top-of-file re-exports).
