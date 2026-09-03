// Placeholder "featured" beauty pros used to fill the homepage Featured section
// until real sign-ups populate each city. Auto-replaced by real businesses once
// enough exist for a given location.

export type FakeFeatured = {
  id: string;                    // stable synthetic ID
  business_name: string;
  slug: string;                  // links to a generic search/CTA since they're fake
  city: string;
  state: string;
  service_category: string;
  avatar_url: string;            // headshot / avatar image
  subscription_tier: "starter" | "studio" | "scale";
  is_fake: true;                 // marker so the UI knows to render differently
};

// Stock avatars — stable remote URLs so homepage placeholders do not depend on
// the app's Supabase storage project being reachable.
const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
];

// 11 fake businesses — one unique avatar per business, no duplicates anywhere.
// Stable across sessions; the API shuffles + slices on each request for rotation.
export const FAKE_FEATURED: FakeFeatured[] = [
  { id: "fake-1",  business_name: "Luxe Hair Studio",     slug: "#", city: "Atlanta",      state: "Georgia",        service_category: "hair",     avatar_url: AVATARS[0],  subscription_tier: "studio",  is_fake: true },
  { id: "fake-2",  business_name: "Glow LA Studio",       slug: "#", city: "Los Angeles",  state: "California",     service_category: "skincare", avatar_url: AVATARS[1],  subscription_tier: "scale",   is_fake: true },
  { id: "fake-3",  business_name: "Crown Beauty Bar",     slug: "#", city: "Houston",      state: "Texas",          service_category: "nails",    avatar_url: AVATARS[2],  subscription_tier: "studio",  is_fake: true },
  { id: "fake-4",  business_name: "Velvet Lash Lounge",   slug: "#", city: "Chicago",      state: "Illinois",       service_category: "lashes",   avatar_url: AVATARS[3],  subscription_tier: "studio",  is_fake: true },
  { id: "fake-5",  business_name: "Atelier Noir",         slug: "#", city: "New York",     state: "New York",       service_category: "makeup",   avatar_url: AVATARS[4],  subscription_tier: "scale",   is_fake: true },
  { id: "fake-6",  business_name: "Sol Skin Studio",      slug: "#", city: "Miami",        state: "Florida",        service_category: "skincare", avatar_url: AVATARS[5],  subscription_tier: "studio",  is_fake: true },
  { id: "fake-7",  business_name: "Edge Barber Co.",      slug: "#", city: "Dallas",       state: "Texas",          service_category: "barber",   avatar_url: AVATARS[6],  subscription_tier: "starter", is_fake: true },
  { id: "fake-8",  business_name: "Queen City Nails",     slug: "#", city: "Charlotte",    state: "North Carolina", service_category: "nails",    avatar_url: AVATARS[7],  subscription_tier: "starter", is_fake: true },
  { id: "fake-9",  business_name: "Silk Press Philly",    slug: "#", city: "Philadelphia", state: "Pennsylvania",   service_category: "hair",     avatar_url: AVATARS[8],  subscription_tier: "studio",  is_fake: true },
  { id: "fake-10", business_name: "Motor City Mane",      slug: "#", city: "Detroit",      state: "Michigan",       service_category: "hair",     avatar_url: AVATARS[9],  subscription_tier: "starter", is_fake: true },
  { id: "fake-11", business_name: "Desert Glow",          slug: "#", city: "Phoenix",      state: "Arizona",        service_category: "skincare", avatar_url: AVATARS[10], subscription_tier: "studio",  is_fake: true },
];

/**
 * Fisher-Yates shuffle for consistent-but-rotated results each page load.
 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Filter fake featured pros by city/state with the same 3-level fallback
 * as the real API (city → state → nationwide).
 */
export function filterFakesByLocation(
  city: string | null,
  state: string | null
): { results: FakeFeatured[]; level: "city" | "state" | "nationwide" } {
  const all = FAKE_FEATURED;
  const norm = (s: string | null) => s?.trim().toLowerCase() ?? "";

  if (city && state) {
    const match = all.filter(
      (f) =>
        norm(f.city) === norm(city) &&
        norm(f.state) === norm(state)
    );
    if (match.length > 0) return { results: shuffle(match), level: "city" };
  }

  if (state) {
    const match = all.filter((f) => norm(f.state) === norm(state));
    if (match.length > 0) return { results: shuffle(match), level: "state" };
  }

  return { results: shuffle(all), level: "nationwide" };
}
