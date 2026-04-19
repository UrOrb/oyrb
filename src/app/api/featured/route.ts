import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { filterFakesByLocation, shuffle } from "@/lib/fake-featured";

export type FeaturedBusiness = {
  id: string;
  business_name: string;
  slug: string;
  city: string | null;
  state: string | null;
  service_category?: string | null;
  avatar_url?: string | null;
  subscription_tier: "starter" | "studio" | "scale";
  is_fake?: boolean;
};

type FeaturedResponse = {
  results: FeaturedBusiness[];
  level: "city" | "state" | "nationwide";
};

const TARGET_COUNT = 8;

const SELECTED_COLS =
  "id, business_name, slug, city, state, subscription_tier, service_category, profile_image_url";

export async function GET(request: NextRequest): Promise<NextResponse<FeaturedResponse>> {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() || null;
  const state = searchParams.get("state")?.trim() || null;

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const base = () =>
    supabase
      .from("businesses")
      .select(SELECTED_COLS)
      .eq("is_featured", true)
      .eq("is_published", true)
      .gt("featured_until", now)
      .limit(TARGET_COUNT);

  type DbRow = {
    id: string;
    business_name: string;
    slug: string;
    city: string | null;
    state: string | null;
    subscription_tier: "starter" | "studio" | "scale";
    service_category: string | null;
    profile_image_url: string | null;
  };

  const mapRow = (r: DbRow): FeaturedBusiness => ({
    id: r.id,
    business_name: r.business_name,
    slug: r.slug,
    city: r.city,
    state: r.state,
    subscription_tier: r.subscription_tier,
    service_category: r.service_category,
    avatar_url: r.profile_image_url,
    is_fake: false,
  });

  // Level 1: exact city + state — try real first, top up with fakes if needed
  if (city && state) {
    const { data } = await base().ilike("city", city).ilike("state", state);
    const real = ((data as DbRow[]) ?? []).map(mapRow);
    if (real.length >= TARGET_COUNT) {
      return NextResponse.json({ results: shuffle(real), level: "city" });
    }
    // Top up with fakes matching the same city
    const { results: fakes } = filterFakesByLocation(city, state);
    const combined = [...real, ...fakes].slice(0, TARGET_COUNT);
    if (combined.length > 0) {
      return NextResponse.json({ results: combined as FeaturedBusiness[], level: "city" });
    }
  }

  // Level 2: state-wide
  if (state) {
    const { data } = await base().ilike("state", state);
    const real = ((data as DbRow[]) ?? []).map(mapRow);
    if (real.length >= TARGET_COUNT) {
      return NextResponse.json({ results: shuffle(real), level: "state" });
    }
    const { results: fakes } = filterFakesByLocation(null, state);
    const combined = [...real, ...fakes].slice(0, TARGET_COUNT);
    if (combined.length > 0) {
      return NextResponse.json({ results: combined as FeaturedBusiness[], level: "state" });
    }
  }

  // Level 3: nationwide — always returns something (fakes cover this floor)
  const { data } = await base();
  const real = ((data as DbRow[]) ?? []).map(mapRow);
  const { results: fakes } = filterFakesByLocation(null, null);
  const combined = shuffle([...real, ...fakes].slice(0, TARGET_COUNT));
  return NextResponse.json({
    results: combined as FeaturedBusiness[],
    level: "nationwide",
  });
}
