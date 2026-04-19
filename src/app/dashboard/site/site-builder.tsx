"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, RotateCcw, Save, Eye, Pencil } from "lucide-react";
import { DAY_NAMES, type Business, type BusinessHours } from "@/lib/types";
import { ImageUpload, GalleryUpload } from "@/components/dashboard/image-upload";
import { StockPicker } from "@/components/dashboard/stock-picker";
import { updateSite } from "./actions";
import { TemplatePreview, type TemplatePreviewDraft } from "./template-preview";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  deposit_cents?: number | null;
  description?: string | null;
};

type Props = {
  business: Business;
  hours: BusinessHours[];
  services: Service[];
  origin: string;
};

// ── Draft shape ───────────────────────────────────────────────────────────────
// One object holds every field the save action cares about. The TemplatePreview
// reads from the subset defined in TemplatePreviewDraft. Ephemeral UI flags
// (pickerMode, toast, etc.) stay in separate useState hooks.
type Draft = {
  business_name: string;
  slug: string;
  tagline: string;
  bio: string;
  service_category: string;
  contact_email: string;
  phone: string;
  city: string;
  state: string;
  instagram_url: string;
  template_layout: string;
  template_theme: string;
  hero_image_url: string;
  profile_image_url: string;
  gallery_photos: string[];
  client_policies: string;
  cancellation_policy: string;
  faq_json: Array<{ q: string; a: string }>;
  loyalty_enabled: boolean;
  loyalty_threshold: number;
  loyalty_reward_text: string;
  template_content: Record<string, string>;
  is_published: boolean;
  hours: Array<{ day_of_week: number; is_open: boolean; open_time: string; close_time: string }>;
};

function businessToDraft(business: Business, hoursRows: BusinessHours[]): Draft {
  const hMap = new Map(hoursRows.map((h) => [h.day_of_week, h]));
  return {
    business_name: business.business_name ?? "",
    slug: business.slug ?? "",
    tagline: business.tagline ?? "",
    bio: business.bio ?? "",
    service_category: business.service_category ?? "hair",
    contact_email: business.contact_email ?? "",
    phone: business.phone ?? "",
    city: business.city ?? "",
    state: business.state ?? "",
    instagram_url: business.instagram_url ?? "",
    template_layout: business.template_layout === "zip" ? "original" : (business.template_layout || "original"),
    template_theme: business.template_theme ?? "aura",
    hero_image_url: business.hero_image_url ?? "",
    profile_image_url: business.profile_image_url ?? "",
    gallery_photos: Array.isArray(business.gallery_photos) ? business.gallery_photos : [],
    client_policies: business.client_policies ?? "",
    cancellation_policy: business.cancellation_policy ?? "",
    faq_json: Array.isArray(business.faq_json) ? business.faq_json : [],
    loyalty_enabled: !!business.loyalty_enabled,
    loyalty_threshold: business.loyalty_threshold ?? 6,
    loyalty_reward_text: business.loyalty_reward_text ?? "20% off your next visit",
    template_content: (business.template_content ?? {}) as Record<string, string>,
    is_published: !!business.is_published,
    hours: [0, 1, 2, 3, 4, 5, 6].map((d) => {
      const h = hMap.get(d);
      return {
        day_of_week: d,
        is_open: !!h?.is_open,
        open_time: h?.open_time?.slice(0, 5) ?? "",
        close_time: h?.close_time?.slice(0, 5) ?? "",
      };
    }),
  };
}

function draftToFormData(draft: Draft): FormData {
  const fd = new FormData();
  fd.set("business_name", draft.business_name);
  fd.set("slug", draft.slug);
  fd.set("tagline", draft.tagline);
  fd.set("bio", draft.bio);
  fd.set("service_category", draft.service_category);
  fd.set("contact_email", draft.contact_email);
  fd.set("phone", draft.phone);
  fd.set("city", draft.city);
  fd.set("state", draft.state);
  fd.set("instagram_url", draft.instagram_url);
  fd.set("template_layout", draft.template_layout);
  fd.set("template_theme", draft.template_theme);
  fd.set("hero_image_url", draft.hero_image_url);
  fd.set("profile_image_url", draft.profile_image_url);
  fd.set("gallery_photos", JSON.stringify(draft.gallery_photos));
  fd.set("client_policies", draft.client_policies);
  fd.set("cancellation_policy", draft.cancellation_policy);
  fd.set("faq_json", JSON.stringify(draft.faq_json));
  if (draft.loyalty_enabled) fd.set("loyalty_enabled", "on");
  fd.set("loyalty_threshold", String(draft.loyalty_threshold));
  fd.set("loyalty_reward_text", draft.loyalty_reward_text);
  if (draft.is_published) fd.set("is_published", "on");
  for (const [k, v] of Object.entries(draft.template_content)) {
    if (v && String(v).trim()) fd.set(`tc_${k}`, String(v));
  }
  for (const h of draft.hours) {
    if (h.is_open) fd.set(`hours_${h.day_of_week}_open`, "on");
    fd.set(`hours_${h.day_of_week}_from`, h.open_time);
    fd.set(`hours_${h.day_of_week}_to`, h.close_time);
  }
  return fd;
}

// ── Config ───────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "hair", label: "Hair styling" },
  { id: "nails", label: "Nail art" },
  { id: "lashes", label: "Lash & brow" },
  { id: "barber", label: "Barbering" },
  { id: "skincare", label: "Skincare & facials" },
  { id: "makeup", label: "Makeup artistry" },
];

const LAYOUTS = [
  { id: "original", label: "Original", helper: "Signature design for each template category" },
  { id: "studio",   label: "Studio",   helper: "Sticky header · portfolio grid" },
  { id: "luxe",     label: "Luxe",     helper: "Editorial hero · centered" },
  { id: "clean",    label: "Clean",    helper: "Minimal list + sidebar" },
  { id: "bold",     label: "Bold",     helper: "Dark hero · service cards" },
];

const ALL_THEMES = [
  "aura", "minimal", "bold",
  "luxe", "earth", "street", "y2k",
  "rose", "sage", "slate", "noir",
  "citrus", "colorblock",
  "riot", "mochi", "linden",
];
const STARTER_THEMES = ["aura", "minimal", "bold"];

function themesForTier(tier: string | undefined): string[] {
  return tier === "starter" ? STARTER_THEMES : ALL_THEMES;
}

// ── Field-group config drives the settings panel AND the template (keys match
//    the c(...) calls inside the template components). Leave a field blank to
//    fall back to the template's built-in wording.
const TEMPLATE_COPY_FIELDS: Array<{
  group: string;
  description?: string;
  fields: Array<{ key: string; label: string; placeholder: string; wide?: boolean; textarea?: boolean }>;
}> = [
  {
    group: "Top bar",
    fields: [
      { key: "top_book_label",  label: "Top-right Book button",   placeholder: "Book" },
      { key: "top_brand_label", label: "Top-left brand tag (Bold)", placeholder: "OYRB" },
    ],
  },
  {
    group: "Hero",
    fields: [
      { key: "hero_kicker",     label: "Hero kicker (small text above your name)", placeholder: "e.g. OPEN · come thru!!", wide: true },
      { key: "hero_badge",      label: "Hero badge / chip",                         placeholder: "e.g. Now booking" },
      { key: "hero_rating",     label: "Hero rating line (Bold)",                   placeholder: "5.0 (48 reviews)" },
      { key: "hero_cta_label",  label: "Hero Book label (Original)",                placeholder: "☆ book me ☆" },
      { key: "hero_book_label", label: "Hero Book label (Studio / Luxe)",           placeholder: "Book an Appointment" },
    ],
  },
  {
    group: "Stats strip (Original)",
    description: "Three quick-proof numbers under the hero.",
    fields: [
      { key: "stat_1_value", label: "Stat 1 value", placeholder: "4.9" },
      { key: "stat_1_label", label: "Stat 1 label", placeholder: "rating" },
      { key: "stat_2_value", label: "Stat 2 value", placeholder: "320+" },
      { key: "stat_2_label", label: "Stat 2 label", placeholder: "reviews" },
      { key: "stat_3_value", label: "Stat 3 value", placeholder: "9 yrs" },
      { key: "stat_3_label", label: "Stat 3 label", placeholder: "practice" },
    ],
  },
  {
    group: "Section titles",
    fields: [
      { key: "section_about_title",     label: "About section",        placeholder: "Meet the specialist" },
      { key: "section_services_title",  label: "Services section",     placeholder: "Services" },
      { key: "section_gallery_title",   label: "Gallery / Portfolio",  placeholder: "Portfolio" },
      { key: "section_gallery_kicker",  label: "Gallery kicker",       placeholder: "recent work" },
      { key: "section_reviews_title",   label: "Reviews",              placeholder: "What clients say" },
      { key: "section_hours_title",     label: "Hours",                placeholder: "Studio hours" },
      { key: "section_location_title",  label: "Location",             placeholder: "Find the studio" },
      { key: "section_policies_title",  label: "Policies",             placeholder: "Booking & policies" },
      { key: "section_instagram_title", label: "Instagram",            placeholder: "Instagram" },
    ],
  },
  {
    group: "Buttons",
    fields: [
      { key: "service_book_label", label: "Per-service button",  placeholder: "Book" },
      { key: "sidebar_cta_label",  label: "Sidebar / footer CTA", placeholder: "Request a Booking" },
      { key: "footer_action_1",    label: "Footer button 1 (Original)", placeholder: "Directions" },
      { key: "footer_action_2",    label: "Footer button 2 (Original)", placeholder: "Message" },
    ],
  },
  {
    group: "Testimonials (shown in the template)",
    description: "Sample reviews baked into the template. Real client reviews render separately below.",
    fields: [
      { key: "review_1_name", label: "Review 1 — name",  placeholder: "Simone R." },
      { key: "review_1_body", label: "Review 1 — quote", placeholder: "I've never been treated with this much care…", wide: true, textarea: true },
      { key: "review_2_name", label: "Review 2 — name",  placeholder: "Jordan K." },
      { key: "review_2_body", label: "Review 2 — quote", placeholder: "Booking was easy, the studio is serene…", wide: true, textarea: true },
      { key: "review_3_name", label: "Review 3 — name",  placeholder: "Priya M." },
      { key: "review_3_body", label: "Review 3 — quote", placeholder: "Rebooked before I left…", wide: true, textarea: true },
    ],
  },
  {
    group: "Policies (shown in the template)",
    description: "Three short policy cards. Your longer client / cancellation policies live in the Booking & policies section below.",
    fields: [
      { key: "policy_1_title", label: "Policy 1 — title", placeholder: "Deposit" },
      { key: "policy_1_body",  label: "Policy 1 — body",  placeholder: "30% deposit secures your slot…", wide: true, textarea: true },
      { key: "policy_2_title", label: "Policy 2 — title", placeholder: "Cancellation" },
      { key: "policy_2_body",  label: "Policy 2 — body",  placeholder: "48 hours notice required…", wide: true, textarea: true },
      { key: "policy_3_title", label: "Policy 3 — title", placeholder: "Late arrivals" },
      { key: "policy_3_body",  label: "Policy 3 — body",  placeholder: "After 15 minutes your service may be shortened…", wide: true, textarea: true },
    ],
  },
  {
    group: "Footer",
    fields: [
      { key: "footer_text",   label: "Footer line",   placeholder: "Your name · Your city", wide: true },
      { key: "footer_credit", label: "Footer credit", placeholder: "Powered by OYRB" },
    ],
  },
];

// ── Reusable field primitives ────────────────────────────────────────────────
const inputCls =
  "mt-1.5 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#B8896B] focus:outline-none";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-[#737373]">{subtitle}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, optional, children, helper }: { label: string; optional?: boolean; children: React.ReactNode; helper?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#525252]">
        {label}
        {optional && <span className="ml-1 text-[11px] text-[#A3A3A3]">(optional)</span>}
      </label>
      {children}
      {helper && <p className="mt-1 text-[11px] text-[#A3A3A3]">{helper}</p>}
    </div>
  );
}

// ── Main builder component ───────────────────────────────────────────────────
export function SiteBuilder({ business, hours, services, origin }: Props) {
  const [saved, setSaved] = useState<Draft>(() => businessToDraft(business, hours));
  const [draft, setDraft] = useState<Draft>(() => businessToDraft(business, hours));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pickerMode, setPickerMode] = useState<"hero" | "profile" | "gallery" | null>(null);
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // Warn if the user tries to close the tab with unsaved edits
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const updateContent = useCallback((key: string, value: string) => {
    setDraft((d) => ({ ...d, template_content: { ...d.template_content, [key]: value } }));
  }, []);

  const updateHours = useCallback((dayOfWeek: number, patch: Partial<Draft["hours"][number]>) => {
    setDraft((d) => ({
      ...d,
      hours: d.hours.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h)),
    }));
  }, []);

  const onStockPick = (urls: string[]) => {
    if (pickerMode === "hero" && urls[0]) update("hero_image_url", urls[0]);
    if (pickerMode === "profile" && urls[0]) update("profile_image_url", urls[0]);
    if (pickerMode === "gallery") {
      setDraft((d) => {
        const combined = [...d.gallery_photos];
        for (const u of urls) if (!combined.includes(u)) combined.push(u);
        return { ...d, gallery_photos: combined.slice(0, 12) };
      });
    }
    setPickerMode(null);
  };

  const handleSave = () => {
    setMsg(null);
    start(async () => {
      const fd = draftToFormData(draft);
      const r = await updateSite(fd);
      if (r?.error) {
        setMsg({ type: "err", text: r.error });
      } else {
        // updateSite may return a new slug if the user changed it
        const nextDraft = { ...draft, slug: r?.slug ?? draft.slug };
        setDraft(nextDraft);
        setSaved(nextDraft);
        setMsg({ type: "ok", text: "Saved." });
      }
    });
  };

  const handleDiscard = () => {
    setDraft(saved);
    setMsg(null);
  };

  const subscriptionTier = business.subscription_tier;
  const allowedThemes = themesForTier(subscriptionTier);

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* ── Sticky action bar ── */}
      <div className="sticky top-0 z-30 border-b border-[#E7E5E4] bg-white/95 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {draft.is_published ? "Your site is live ✦" : "Your site is not published yet"}
            </p>
            <p className="text-xs text-[#737373]">
              {origin}/s/<span className="font-mono">{draft.slug}</span>
              {isDirty && (
                <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  Unsaved changes
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {msg && (
              <span className={msg.type === "ok" ? "flex items-center gap-1 text-xs text-green-700" : "text-xs text-red-600"}>
                {msg.type === "ok" && <Check size={12} />} {msg.text}
              </span>
            )}
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
              >
                <RotateCcw size={12} /> Discard
              </button>
            )}
            {business.is_published && (
              <Link
                href={`/s/${draft.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
              >
                <ExternalLink size={12} /> View live
              </Link>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !isDirty}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0A0A0A] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              <Save size={12} /> {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        {/* Mobile pane toggle — desktop always shows both */}
        <div className="mt-3 flex gap-1 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-0.5 text-xs md:hidden">
          <button
            type="button"
            onClick={() => setMobilePane("edit")}
            className={`flex-1 rounded-sm py-1.5 font-medium ${mobilePane === "edit" ? "bg-white shadow-sm" : "text-[#737373]"}`}
          >
            <Pencil size={11} className="-mt-0.5 mr-1 inline" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("preview")}
            className={`flex-1 rounded-sm py-1.5 font-medium ${mobilePane === "preview" ? "bg-white shadow-sm" : "text-[#737373]"}`}
          >
            <Eye size={11} className="-mt-0.5 mr-1 inline" /> Live preview
          </button>
        </div>
      </div>

      {/* ── Split pane ── */}
      <div className="flex flex-col md:flex-row">
        {/* Editor panel */}
        <div
          className={`w-full md:w-1/2 lg:w-[55%] md:border-r md:border-[#E7E5E4] ${
            mobilePane === "preview" ? "hidden md:block" : "block"
          }`}
        >
          <div className="space-y-5 px-4 py-5 md:px-6 md:py-6">
            {/* Business basics */}
            <Section title="Business basics" subtitle="The essentials shown on your booking site.">
              <Field label="Business name">
                <input
                  value={draft.business_name}
                  onChange={(e) => update("business_name", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Site URL" helper="Lowercase letters, numbers and dashes.">
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-[#737373]">{origin}/s/</span>
                  <input
                    value={draft.slug}
                    onChange={(e) => update("slug", e.target.value)}
                    className={inputCls + " mt-0 flex-1"}
                  />
                </div>
              </Field>
              <Field label="Tagline" optional>
                <input
                  value={draft.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  placeholder="Signature cuts and color in Atlanta."
                  className={inputCls}
                />
              </Field>
              <Field label="About" optional>
                <textarea
                  rows={4}
                  value={draft.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  placeholder="Tell clients who you are and what makes you different."
                  className={inputCls + " resize-y"}
                />
              </Field>
              <Field label="Primary service category">
                <select
                  value={draft.service_category}
                  onChange={(e) => update("service_category", e.target.value)}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </Field>
            </Section>

            {/* Contact & location */}
            <Section title="Contact & location">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Public email" optional>
                  <input
                    type="email"
                    value={draft.contact_email}
                    onChange={(e) => update("contact_email", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone" optional>
                  <input
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="City">
                  <input value={draft.city} onChange={(e) => update("city", e.target.value)} className={inputCls} />
                </Field>
                <Field label="State">
                  <input value={draft.state} onChange={(e) => update("state", e.target.value)} className={inputCls} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Instagram URL" optional>
                    <input
                      value={draft.instagram_url}
                      onChange={(e) => update("instagram_url", e.target.value)}
                      placeholder="https://instagram.com/…"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            {/* Design & template */}
            <Section title="Design & template" subtitle="Click a layout or theme to see it in the preview immediately.">
              <div>
                <p className="text-xs font-medium text-[#525252]">Layout</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {LAYOUTS.map((l) => {
                    const selected = draft.template_layout === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => update("template_layout", l.id)}
                        className={`rounded-md border px-3 py-2 text-left transition-colors ${
                          selected ? "border-[#0A0A0A] bg-[#0A0A0A] text-white" : "border-[#E7E5E4] bg-white hover:bg-[#FAFAF9]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm font-medium">
                          {l.label}
                          {selected && <Check size={14} />}
                        </div>
                        <p className={`mt-0.5 text-[11px] ${selected ? "text-white/70" : "text-[#737373]"}`}>
                          {l.helper}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-[#525252]">Theme</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {allowedThemes.map((t) => {
                    const selected = draft.template_theme === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update("template_theme", t)}
                        className={`rounded-md border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                          selected ? "border-[#0A0A0A] bg-[#0A0A0A] text-white" : "border-[#E7E5E4] bg-white hover:bg-[#FAFAF9]"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {subscriptionTier === "starter" && (
                  <p className="mt-2 text-[11px] text-[#B8896B]">
                    Starter includes 3 themes.{" "}
                    <a href="/pricing" className="font-medium underline">Upgrade to Studio</a> for all 16.
                  </p>
                )}
              </div>

              <div className="mt-4">
                <Field label="Hero image" helper="Wide landscape works best.">
                  <ImageUpload
                    value={draft.hero_image_url}
                    onChange={(v) => update("hero_image_url", v)}
                    aspect="wide"
                    userId={business.owner_id}
                  />
                  <button
                    type="button"
                    onClick={() => setPickerMode("hero")}
                    className="mt-1 text-[11px] font-medium text-[#B8896B] hover:underline"
                  >
                    Browse stock photos
                  </button>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Profile image" helper="Your headshot or logo.">
                  <ImageUpload
                    value={draft.profile_image_url}
                    onChange={(v) => update("profile_image_url", v)}
                    aspect="square"
                    userId={business.owner_id}
                  />
                  <button
                    type="button"
                    onClick={() => setPickerMode("profile")}
                    className="mt-1 text-[11px] font-medium text-[#B8896B] hover:underline"
                  >
                    Browse stock photos
                  </button>
                </Field>
              </div>
            </Section>

            {/* Template copy */}
            <Section
              title="Template copy"
              subtitle="Rewrite any label. Leave blank to use the template default."
            >
              <div className="space-y-5">
                {TEMPLATE_COPY_FIELDS.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#525252]">{group.group}</h3>
                    {group.description && (
                      <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{group.description}</p>
                    )}
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {group.fields.map((f) => (
                        <div key={f.key} className={f.wide ? "md:col-span-2" : undefined}>
                          <label className="block text-[11px] font-medium text-[#525252]">{f.label}</label>
                          {f.textarea ? (
                            <textarea
                              rows={3}
                              value={draft.template_content[f.key] ?? ""}
                              onChange={(e) => updateContent(f.key, e.target.value)}
                              placeholder={f.placeholder}
                              maxLength={500}
                              className={inputCls + " resize-y"}
                            />
                          ) : (
                            <input
                              type="text"
                              value={draft.template_content[f.key] ?? ""}
                              onChange={(e) => updateContent(f.key, e.target.value)}
                              placeholder={f.placeholder}
                              maxLength={200}
                              className={inputCls}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Gallery */}
            <Section title="Gallery" subtitle="Photos clients see on your booking site.">
              <GalleryUpload
                value={draft.gallery_photos}
                onChange={(v) => update("gallery_photos", v)}
                userId={business.owner_id}
                max={12}
              />
              <button
                type="button"
                onClick={() => setPickerMode("gallery")}
                className="text-[11px] font-medium text-[#B8896B] hover:underline"
              >
                Browse stock photos
              </button>
            </Section>

            {/* Booking & policies (longform, shown in the Policies section below
                the template) */}
            <Section title="Booking & policies" subtitle="Your full policy text. Short 3-card template versions live under Template copy → Policies.">
              <Field label="Client policies" optional>
                <textarea
                  rows={4}
                  value={draft.client_policies}
                  onChange={(e) => update("client_policies", e.target.value)}
                  placeholder="House rules · What to bring · Kids / guests / pets"
                  className={inputCls + " resize-y"}
                />
              </Field>
              <Field label="Cancellation & no-show policy" optional>
                <textarea
                  rows={4}
                  value={draft.cancellation_policy}
                  onChange={(e) => update("cancellation_policy", e.target.value)}
                  placeholder="Cancellations less than 24 hours = forfeit deposit · No-show = full fee"
                  className={inputCls + " resize-y"}
                />
              </Field>
            </Section>

            {/* FAQ */}
            <Section title="FAQ" subtitle="Common questions clients ask.">
              {draft.faq_json.map((f, i) => (
                <div key={i} className="rounded-md border border-[#E7E5E4] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold text-[#525252]">FAQ {i + 1}</p>
                    <button
                      type="button"
                      onClick={() => update("faq_json", draft.faq_json.filter((_, idx) => idx !== i))}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={f.q}
                    onChange={(e) => {
                      const v = e.target.value;
                      update("faq_json", draft.faq_json.map((x, idx) => (idx === i ? { ...x, q: v } : x)));
                    }}
                    placeholder="Question"
                    className={inputCls + " mt-2"}
                  />
                  <textarea
                    value={f.a}
                    onChange={(e) => {
                      const v = e.target.value;
                      update("faq_json", draft.faq_json.map((x, idx) => (idx === i ? { ...x, a: v } : x)));
                    }}
                    rows={3}
                    placeholder="Answer"
                    className={inputCls + " mt-2 resize-y"}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => update("faq_json", [...draft.faq_json, { q: "", a: "" }])}
                disabled={draft.faq_json.length >= 20}
                className="rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
              >
                {draft.faq_json.length >= 20 ? "Maximum of 20 FAQs" : "+ Add a FAQ"}
              </button>
            </Section>

            {/* Loyalty */}
            <Section title="Loyalty rewards" subtitle="Reward repeat clients after a set number of visits.">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.loyalty_enabled}
                  onChange={(e) => update("loyalty_enabled", e.target.checked)}
                />
                Enable loyalty rewards
              </label>
              {draft.loyalty_enabled && (
                <>
                  <Field label="Reward after this many visits">
                    <input
                      type="number"
                      min={2}
                      max={20}
                      value={draft.loyalty_threshold}
                      onChange={(e) => update("loyalty_threshold", parseInt(e.target.value, 10) || 6)}
                      className={inputCls + " max-w-[120px]"}
                    />
                  </Field>
                  <Field label="Reward description">
                    <input
                      value={draft.loyalty_reward_text}
                      onChange={(e) => update("loyalty_reward_text", e.target.value)}
                      placeholder="20% off your next visit"
                      maxLength={200}
                      className={inputCls}
                    />
                  </Field>
                </>
              )}
            </Section>

            {/* Hours */}
            <Section title="Business hours" subtitle="Only open days will accept bookings.">
              <div className="space-y-2">
                {DAY_NAMES.map((name, d) => {
                  const h = draft.hours.find((x) => x.day_of_week === d)!;
                  return (
                    <div key={d} className="grid grid-cols-[110px_auto_1fr_1fr] items-center gap-2">
                      <span className="text-xs font-medium">{name}</span>
                      <label className="flex items-center gap-1.5 text-[11px]">
                        <input
                          type="checkbox"
                          checked={h.is_open}
                          onChange={(e) => updateHours(d, { is_open: e.target.checked })}
                        />
                        Open
                      </label>
                      <input
                        type="time"
                        value={h.open_time}
                        onChange={(e) => updateHours(d, { open_time: e.target.value })}
                        className={inputCls + " mt-0"}
                        disabled={!h.is_open}
                      />
                      <input
                        type="time"
                        value={h.close_time}
                        onChange={(e) => updateHours(d, { close_time: e.target.value })}
                        className={inputCls + " mt-0"}
                        disabled={!h.is_open}
                      />
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Publish */}
            <Section title="Publish">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.is_published}
                  onChange={(e) => update("is_published", e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Publish my site to the public URL</span>
              </label>
            </Section>

            <div className="h-8" />
          </div>
        </div>

        {/* Preview pane */}
        <div
          className={`w-full md:w-1/2 lg:w-[45%] ${
            mobilePane === "edit" ? "hidden md:block" : "block"
          }`}
        >
          <div className="sticky top-[116px] md:top-[72px]">
            <div className="px-4 py-3 text-[11px] text-[#737373] md:px-6">
              Live preview · updates as you edit
            </div>
            <div className="mx-4 overflow-hidden rounded-xl border border-[#E7E5E4] bg-white shadow-sm md:mx-6">
              <div className="h-[calc(100vh-180px)] overflow-auto">
                <TemplatePreview
                  draft={draft}
                  services={services}
                  hours={hoursRowsFromDraft(draft.hours)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {pickerMode && (
        <StockPicker
          mode={pickerMode === "gallery" ? "multi" : "single"}
          defaultCategory={pickerMode === "hero" ? "hero" : pickerMode === "profile" ? "profile" : draft.service_category}
          selected={pickerMode === "gallery" ? draft.gallery_photos : []}
          onPick={onStockPick}
          onClose={() => setPickerMode(null)}
        />
      )}
    </div>
  );
}

// Convert the draft's hours back into the BusinessHours row shape
// TemplatePreview expects.
function hoursRowsFromDraft(hours: Draft["hours"]): BusinessHours[] {
  return hours.map((h) => ({
    id: `draft-${h.day_of_week}`,
    business_id: "draft",
    day_of_week: h.day_of_week,
    is_open: h.is_open,
    open_time: h.open_time || null,
    close_time: h.close_time || null,
  }));
}
