"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const STARTER_THEMES = ["aura", "minimal", "bold"];

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function updateSite(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: business } = await supabase
    .from("businesses")
    .select("id, slug, subscription_tier")
    .eq("owner_id", user.id)
    .single();
  if (!business) return { error: "No business found" };

  const businessName = (formData.get("business_name") as string)?.trim();
  const requestedSlug = (formData.get("slug") as string)?.trim();
  let slug = business.slug;
  if (requestedSlug && requestedSlug !== business.slug) {
    const newSlug = slugify(requestedSlug);
    // Check uniqueness
    const { data: taken } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", newSlug)
      .neq("id", business.id)
      .maybeSingle();
    if (taken) return { error: "That URL is already taken — try another." };
    slug = newSlug;
  }

  const update = {
    business_name: businessName || "My Studio",
    slug,
    tagline: (formData.get("tagline") as string) || null,
    bio: (formData.get("bio") as string) || null,
    phone: (formData.get("phone") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    instagram_url: (formData.get("instagram_url") as string) || null,
    city: (formData.get("city") as string) || null,
    state: (formData.get("state") as string) || null,
    service_category: (formData.get("service_category") as string) || "hair",
    template_layout: (formData.get("template_layout") as string) || "studio",
    template_theme: (() => {
      const requestedTheme = (formData.get("template_theme") as string) || "aura";
      // Starter tier: only allow 3 starter themes. If they try to pick a locked one, default to aura.
      if (business.subscription_tier === "starter" && !STARTER_THEMES.includes(requestedTheme)) {
        return "aura";
      }
      return requestedTheme;
    })(),
    hero_image_url: (formData.get("hero_image_url") as string) || null,
    profile_image_url: (formData.get("profile_image_url") as string) || null,
    client_policies: (formData.get("client_policies") as string) || null,
    cancellation_policy: (formData.get("cancellation_policy") as string) || null,
    faq_json: (() => {
      try {
        const raw = (formData.get("faq_json") as string) || "[]";
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
          .filter((x) => x && typeof x === "object" && typeof x.q === "string" && typeof x.a === "string")
          .slice(0, 20)
          .map((x) => ({ q: String(x.q).slice(0, 200), a: String(x.a).slice(0, 800) }));
      } catch {
        return [];
      }
    })(),
    loyalty_enabled: formData.get("loyalty_enabled") === "on",
    loyalty_threshold: Math.max(2, Math.min(20, parseInt((formData.get("loyalty_threshold") as string) || "6", 10) || 6)),
    loyalty_reward_text: ((formData.get("loyalty_reward_text") as string) || "20% off your next visit").slice(0, 200),
    gallery_photos: (() => {
      try {
        const raw = formData.get("gallery_photos") as string;
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
      } catch {
        return [];
      }
    })(),
    template_content: (() => {
      // Collect every tc_* form field into a single JSONB blob. Each field
      // maps to a template element id (see c(...) calls in template components).
      // Short labels (buttons, section titles) are capped at 200; longer fields
      // like review bodies and policy paragraphs need more room.
      const LONG_TEXT_KEYS = new Set([
        "review_1_body", "review_2_body", "review_3_body",
        "policy_1_body", "policy_2_body", "policy_3_body",
      ]);
      const out: Record<string, string> = {};
      for (const [key, value] of formData.entries()) {
        if (typeof value !== "string") continue;
        if (!key.startsWith("tc_")) continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        const bareKey = key.slice(3);
        const cap = LONG_TEXT_KEYS.has(bareKey) ? 500 : 200;
        out[bareKey] = trimmed.slice(0, cap);
      }
      return out;
    })(),
    is_published: formData.get("is_published") === "on",
  };

  const { error } = await supabase
    .from("businesses")
    .update(update)
    .eq("id", business.id);

  if (error) return { error: error.message };

  // Upsert hours
  const hourRows = [];
  for (let d = 0; d < 7; d++) {
    const isOpen = formData.get(`hours_${d}_open`) === "on";
    const openTime = (formData.get(`hours_${d}_from`) as string) || null;
    const closeTime = (formData.get(`hours_${d}_to`) as string) || null;
    hourRows.push({
      business_id: business.id,
      day_of_week: d,
      is_open: isOpen,
      open_time: isOpen ? openTime : null,
      close_time: isOpen ? closeTime : null,
    });
  }
  await supabase
    .from("business_hours")
    .upsert(hourRows, { onConflict: "business_id,day_of_week" });

  revalidatePath("/dashboard/site");
  revalidatePath(`/s/${slug}`);
  return { success: true, slug };
}
