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
  created_at: string;
};

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
