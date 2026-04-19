/**
 * Demo-mode toggle + shared constants.
 *
 * DEMO_MODE=true flips the app into sandbox behavior:
 *   - all traffic is auto-logged-in as a single shared demo user
 *   - Stripe, email, SMS, and uploads are short-circuited
 *   - a persistent banner is shown and a welcome modal greets new visitors
 *
 * The flag defaults to false. Production must be untouched unless the
 * env var is explicitly set to "true" on the demo deployment.
 *
 * NEXT_PUBLIC_DEMO_MODE is the client-facing mirror — needed so client
 * components (banner, modal) can render conditionally. Keep both in sync
 * on every deploy.
 */

/** Server-side check. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** Stable identifiers for the pre-seeded demo account. */
export const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "demo@oyrb.space";

/** Password stored in env (never exposed to clients). Used by the
 *  auto-login route to sign the visitor in as the demo user. */
export function demoUserPassword(): string {
  const pw = process.env.DEMO_USER_PASSWORD;
  if (!pw) throw new Error("DEMO_USER_PASSWORD must be set when DEMO_MODE=true");
  return pw;
}

/** Token required to hit /api/admin/demo/reset manually. Different from
 *  CRON_SECRET so rotating one doesn't affect the other. */
export function demoAdminToken(): string {
  return process.env.DEMO_ADMIN_TOKEN ?? "";
}

/** The fixed content used by the seed script and the reset cron. Kept in
 *  this file so the demo's "pristine state" is source-controlled and
 *  reviewable alongside every feature change. */
export const DEMO_SEED = {
  business: {
    business_name: "Jasmine Carter — Luxe Studio",
    slug: "luxe-studio-demo",
    tagline: "Hair artistry rooted in detail. Booking by appointment only.",
    bio: "Jasmine Carter is a licensed stylist with 8+ years of experience in textured hair, precision color, and bridal styling. Her Atlanta studio focuses on slow, intentional sessions — one guest at a time — and the kind of work that feels personal. Every appointment is by referral or online booking only.",
    city: "Atlanta",
    state: "GA",
    contact_email: "hello@luxestudio-demo.com",
    phone: "(404) 555-0142",
    instagram_url: "https://instagram.com/luxestudiodemo",
    template_layout: "studio",
    template_theme: "sage",
    service_category: "hair",
    is_published: true,
    hero_image_url:
      "https://images.unsplash.com/photo-1560066984-138daab7b9dd?auto=format&fit=crop&w=1600&q=85",
    profile_image_url:
      "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=400&q=85",
    gallery_photos: [
      "https://images.unsplash.com/photo-1522337660416-9e4f73a7da7e?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1560066984-138daab7b9dd?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=900&q=85",
    ],
    client_policies:
      "Arrive 5 min early. A $40 non-refundable deposit holds your slot. Treatments are tailored; please allow time for consultation at the start of the appointment.",
    cancellation_policy:
      "48 hours notice required. Cancellations within 48 hours forfeit the deposit; same-day cancels are billed 50% of the service.",
  },
  services: [
    { name: "Silk Press",                         duration_minutes: 90,  price_cents: 12000, description: "Smooth, shiny, heat-styled silk press on natural hair. Lasts up to 2 weeks." },
    { name: "Custom Color — single process",      duration_minutes: 150, price_cents: 18000, description: "Root-to-tip color in a single custom-mixed shade. Includes toner and blowout." },
    { name: "Custom Color — full highlights",     duration_minutes: 210, price_cents: 28000, description: "Hand-painted highlights from mid-shaft to ends. Includes toner, gloss, and style." },
    { name: "Bridal Hair Trial",                  duration_minutes: 60,  price_cents:  8500, description: "90-minute trial run to dial in your look for the big day." },
    { name: "Bridal Hair — Day-of",               duration_minutes: 120, price_cents: 25000, description: "Wedding-day service. Studio or on-location within Metro Atlanta." },
    { name: "Deep Conditioning Treatment",        duration_minutes: 45,  price_cents:  5500, description: "Bond-building treatment + scalp massage + blow-out." },
    { name: "Trim & Style",                       duration_minutes: 60,  price_cents:  7500, description: "Precision trim and blow-out for fresh ends and shine." },
    { name: "Special Occasion Updo",              duration_minutes: 90,  price_cents: 13500, description: "Event-ready updo for weddings, galas, photoshoots." },
  ],
  hours: [
    { day_of_week: 0, is_open: false, open_time: null,    close_time: null },
    { day_of_week: 1, is_open: false, open_time: null,    close_time: null },
    { day_of_week: 2, is_open: true,  open_time: "09:00", close_time: "18:00" },
    { day_of_week: 3, is_open: true,  open_time: "09:00", close_time: "18:00" },
    { day_of_week: 4, is_open: true,  open_time: "09:00", close_time: "18:00" },
    { day_of_week: 5, is_open: true,  open_time: "09:00", close_time: "18:00" },
    { day_of_week: 6, is_open: true,  open_time: "09:00", close_time: "18:00" },
  ],
  /** Names to rotate through when generating sample bookings. */
  sampleClients: [
    { name: "Renee Ashford", email: "renee.a@example.com", phone: "(555) 555-0100" },
    { name: "Nia Bautista",  email: "nia.b@example.com",   phone: "(555) 555-0101" },
    { name: "Camille Park",  email: "camille.p@example.com", phone: "(555) 555-0102" },
    { name: "Tasha Monroe",  email: "tasha.m@example.com",  phone: "(555) 555-0103" },
    { name: "Zoe Leclair",   email: "zoe.l@example.com",    phone: "(555) 555-0104" },
    { name: "Priya Desai",   email: "priya.d@example.com",  phone: "(555) 555-0105" },
  ],
};
