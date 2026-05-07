export type SubscriptionTier = "starter" | "studio" | "scale";
export type SubscriptionStatus = "inactive" | "active" | "cancelled" | "past_due";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type Business = {
  id: string;
  owner_id: string;
  business_name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  phone: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  hero_image_url: string | null;
  profile_image_url: string | null;
  template_layout: string;
  stat_1_type?: string | null;
  stat_2_type?: string | null;
  stat_3_type?: string | null;
  stats_migration_acknowledged_at?: string | null;
  template_theme: string;
  /** Heading font slug — matches an id from src/lib/fonts.ts. NULL = use the theme's displayFont. */
  heading_font: string | null;
  /** Body font slug — matches an id from src/lib/fonts.ts. NULL = use the theme's bodyFont. */
  body_font: string | null;
  service_category: string;
  timezone: string;
  gallery_photos: string[];
  client_policies: string | null;
  cancellation_policy: string | null;
  faq_json?: Array<{ q: string; a: string }> | null;
  loyalty_enabled?: boolean;
  loyalty_threshold?: number;
  loyalty_reward_text?: string | null;
  template_content?: Record<string, string> | null;
  custom_domain?: string | null;
  custom_domain_verified?: boolean;
  is_published: boolean;
  city: string | null;
  state: string | null;
  is_featured: boolean;
  featured_until: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  // ── Stripe Connect (Standard) — added in migration 029.
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean;
  stripe_connect_charges_enabled: boolean;
  stripe_connect_payouts_enabled: boolean;
  stripe_connect_details_submitted: boolean;
  stripe_connect_requirements_currently_due: string[] | null;
  // ── Pass the Torch (Trusted Pros) — added in migration 032.
  /** /find-taxonomy specialty for this business. NULL until the pro picks one. */
  primary_specialty: Specialty | null;
  /** Master toggle. When false, the storefront never renders Pros I Trust. */
  pass_the_torch_enabled: boolean;
  /** When the section appears on the public storefront page (migration 033).
   *  Booking-flow surface ignores this and always shows when triggered. */
  pass_the_torch_visibility: PassTheTorchVisibility;
  vacation_start: string | null;
  vacation_end: string | null;
  vacation_message: string | null;
  /** Phase 2.3 — opt-in flag for the public reputation card on the
   *  storefront. False by default (migration 042). The storefront only
   *  renders the card when this is true. */
  public_stats_enabled?: boolean;
  created_at: string;
};

export type PassTheTorchVisibility = "always" | "smart" | "vacation_only";

export type Specialty =
  | "hair"
  | "nails"
  | "lashes"
  | "brows"
  | "makeup"
  | "skincare"
  | "barber"
  | "medical-spa";

export const SPECIALTIES: readonly Specialty[] = [
  "hair", "nails", "lashes", "brows", "makeup", "skincare", "barber", "medical-spa",
] as const;

export type ReferralStatus = "pending" | "accepted" | "declined" | "blocked";
export type InviteStatus = "pending" | "accepted" | "expired";

export interface ProReferral {
  id: string;
  requesting_business_id: string;
  receiving_business_id: string;
  status: ReferralStatus;
  position: number;
  vouch_note: string | null;
  referral_specialty: Specialty | null;
  requester_acknowledged_at: string | null;
  receiver_acknowledged_at: string | null;
  decline_cooldown_until: string | null;
  requested_at: string;
  responded_at: string | null;
}

export interface ProInvite {
  id: string;
  requesting_business_id: string;
  invitee_email: string;
  vouch_note: string | null;
  token: string;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export type Service = {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price_cents: number;
  deposit_cents: number;
  active: boolean;
  created_at: string;
};

export type BusinessHours = {
  id: string;
  business_id: string;
  day_of_week: number; // 0=Sun
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

export type Client = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  business_id: string;
  client_id: string | null;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  deposit_paid: boolean;
  stripe_payment_intent_id: string | null;
  created_at: string;
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
