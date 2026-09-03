"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, ExternalLink, Monitor, RotateCcw, Save, Smartphone } from "lucide-react";
import { DAY_NAMES, type Business, type BusinessHours } from "@/lib/types";
import { ImageUpload, GalleryUpload } from "@/components/dashboard/image-upload";
import { StockPicker } from "@/components/dashboard/stock-picker";
import { updateSite } from "./actions";
import { cheer } from "@/lib/cheer";
import { TemplatePreview } from "./template-preview";
import {
  STAT_TYPES,
  STAT_OPTION_LABELS,
  DEFAULT_LABELS,
  sanitizeStatLabel,
  isLabelSanitized,
  type StatType,
} from "@/lib/pro-stats-types";
import {
  HEADING_FONTS,
  BODY_FONTS,
  firstFontInStack,
  type FontDef,
} from "@/lib/fonts";
import {
  fontFamilyFor,
  resolveFontFamily,
  ALL_FONT_VARIABLE_CLASSES,
} from "@/lib/storefront-fonts";
import { TEMPLATE_THEMES } from "@/lib/template-themes";
import {
  ALL_THEME_IDS,
  STARTER_THEME_IDS,
  themesForTemplateAccess,
  type TemplateUnlock,
} from "@/lib/template-access";

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
  templateUnlocks: TemplateUnlock[];
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
  heading_font: string;
  body_font: string;
  // Stats strip selections (Original layout). Type columns on the row
  // store which verified metric to display; labels stay in
  // template_content so they share the same editing pattern as other
  // template-copy fields.
  stat_1_type: string;
  stat_2_type: string;
  stat_3_type: string;
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
    // Empty string is the in-form sentinel for "use theme default"; the
    // server action round-trips "" → NULL into the DB. Existing rows
    // with NULL land here as "" so the picker selects the theme-default
    // option.
    heading_font: business.heading_font ?? "",
    body_font: business.body_font ?? "",
    stat_1_type: (business as unknown as { stat_1_type?: string | null }).stat_1_type ?? "specialty",
    stat_2_type: (business as unknown as { stat_2_type?: string | null }).stat_2_type ?? "services_offered",
    stat_3_type: (business as unknown as { stat_3_type?: string | null }).stat_3_type ?? "location",
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
  fd.set("heading_font", draft.heading_font);
  fd.set("body_font", draft.body_font);
  fd.set("stat_1_type", draft.stat_1_type);
  fd.set("stat_2_type", draft.stat_2_type);
  fd.set("stat_3_type", draft.stat_3_type);
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

const LAYOUT_LABELS = new Map(LAYOUTS.map((layout) => [layout.id, layout.label]));

function templateLabel(layoutId: string, themeId: string) {
  const layout = LAYOUT_LABELS.get(layoutId) ?? layoutId;
  const theme = TEMPLATE_THEMES[themeId]?.name ?? themeId;
  return `${layout} / ${theme}`;
}

// ── Field-group config drives the settings panel AND the template (keys match
//    the c(...) calls inside the template components). Leave a field blank to
//    fall back to the template's built-in wording.
//
// Every field (and every group) can declare which layouts it applies to via
// `layouts: [...]`. When the user switches the live layout selector the panel
// hides any group/field that doesn't apply — so Studio no longer sees
// "Stats strip (Original)" etc. The DB column is never touched; values the
// user typed while they were on a different layout remain stored and will
// re-appear the moment they switch back.
//
// Layout source-of-truth for each key is the grep of src/components/templates/
// *.tsx for c("<key>", …) calls. If you add a new template usage, update the
// layouts array here so the field becomes visible in that layout's editor.
type Layout = "original" | "studio" | "luxe" | "clean" | "bold";
const ALL_LAYOUTS: Layout[] = ["original", "studio", "luxe", "clean", "bold"];

type CopyField = {
  key: string;
  label: string;
  placeholder: string;
  wide?: boolean;
  textarea?: boolean;
  layouts?: Layout[]; // omitted = visible on every layout
};

const TEMPLATE_COPY_FIELDS: Array<{
  group: string;
  description?: string;
  layouts?: Layout[]; // omitted = visible on every layout
  fields: CopyField[];
}> = [
  {
    group: "Top bar",
    layouts: ["clean", "bold"],
    fields: [
      { key: "top_book_label",  label: "Top-right Book button",   placeholder: "Book",  layouts: ["clean"] },
      { key: "top_brand_label", label: "Top-left brand tag",       placeholder: "OYRB",  layouts: ["bold"] },
    ],
  },
  {
    group: "Hero",
    fields: [
      { key: "hero_kicker",     label: "Hero kicker (small text above your name)", placeholder: "e.g. OPEN · come thru!!", wide: true, layouts: ["original"] },
      { key: "hero_badge",      label: "Hero badge / chip",                         placeholder: "e.g. Now booking",                       layouts: ["bold"] },
      { key: "hero_rating",     label: "Hero rating line",                          placeholder: "5.0 (48 reviews)",                       layouts: ["bold"] },
      { key: "hero_cta_label",  label: "Hero Book label",                            placeholder: "☆ book me ☆",                            layouts: ["original"] },
      { key: "hero_book_label", label: "Hero Book label",                            placeholder: "Book an Appointment",                    layouts: ["studio", "luxe"] },
    ],
  },
  // NOTE: Stats strip is NOT in TEMPLATE_COPY_FIELDS anymore. It renders
  // via a custom block below the template-copy loop (see StatsStripEditor)
  // because each stat is a dropdown + label pair rather than a text input.
  // Listed here as a filtered-out sentinel so the type system knows about
  // the group (harmless since fields is empty).
  {
    group: "Section titles",
    fields: [
      { key: "section_about_title",     label: "About section",        placeholder: "Meet the specialist", layouts: ["original"] },
      { key: "section_services_title",  label: "Services section",     placeholder: "Services" },
      { key: "section_gallery_title",   label: "Gallery / Portfolio",  placeholder: "Portfolio" },
      { key: "section_gallery_kicker",  label: "Gallery kicker",       placeholder: "recent work", layouts: ["original"] },
      { key: "section_reviews_title",   label: "Reviews",              placeholder: "What clients say", layouts: ["original", "bold"] },
      { key: "section_hours_title",     label: "Hours",                placeholder: "Studio hours" },
      { key: "section_location_title",  label: "Location",             placeholder: "Find the studio", layouts: ["original", "clean"] },
      { key: "section_policies_title",  label: "Policies",             placeholder: "Booking & policies", layouts: ["original"] },
      { key: "section_instagram_title", label: "Instagram",            placeholder: "Instagram", layouts: ["original"] },
    ],
  },
  {
    group: "Buttons",
    fields: [
      { key: "service_book_label", label: "Per-service button",         placeholder: "Book",               layouts: ["studio", "clean", "bold"] },
      { key: "sidebar_cta_label",  label: "Sidebar / footer CTA",       placeholder: "Request a Booking",  layouts: ["luxe", "bold"] },
      { key: "footer_action_1",    label: "Footer button 1 (Directions)", placeholder: "Directions",       layouts: ["original"] },
      { key: "footer_action_2",    label: "Footer button 2 (Message)",    placeholder: "Message",          layouts: ["original"] },
    ],
  },
  {
    group: "Testimonials (shown in the template)",
    description: "Sample reviews baked into the template. Real client reviews render separately below.",
    layouts: ["original", "bold"],
    fields: [
      { key: "review_1_name", label: "Review 1 — name",  placeholder: "Simone R." },
      { key: "review_1_body", label: "Review 1 — quote", placeholder: "I've never been treated with this much care…", wide: true, textarea: true },
      { key: "review_2_name", label: "Review 2 — name",  placeholder: "Jordan K." },
      { key: "review_2_body", label: "Review 2 — quote", placeholder: "Booking was easy, the studio is serene…", wide: true, textarea: true },
      { key: "review_3_name", label: "Review 3 — name",  placeholder: "Priya M.",                                     layouts: ["original"] },
      { key: "review_3_body", label: "Review 3 — quote", placeholder: "Rebooked before I left…", wide: true, textarea: true, layouts: ["original"] },
    ],
  },
  {
    group: "Policies (shown in the template)",
    description: "Three short policy cards. Your longer client / cancellation policies live in the Booking & policies section below.",
    layouts: ["original"],
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
    // footer_credit used to live here; it is now rendered by
    // <PlatformCredit /> (server-side, platform-enforced, non-removable).
    // See components/templates/platform-credit.tsx + Terms §24.
    description: `"Powered by OYRB" credit is shown on all published sites and cannot be removed.`,
    fields: [
      // footer_text is used by Studio / Luxe / Clean / Bold. Original uses
      // its own stock footer disclaimer — no user-editable line there.
      { key: "footer_text", label: "Footer line", placeholder: "Your name · Your city", wide: true, layouts: ["studio", "luxe", "clean", "bold"] },
    ],
  },
];

// Suppress unused-var when layouts is `undefined` (= "all") — referenced at
// render time via the helper below.
void ALL_LAYOUTS;

// Returns true when the given field/group should appear for the current
// layout. `layouts: undefined` means "always visible" (universal field).
function matchesLayout(layout: string, fieldLayouts?: Layout[]): boolean {
  if (!fieldLayouts || fieldLayouts.length === 0) return true;
  return fieldLayouts.includes(layout as Layout);
}

// ── Reusable field primitives ────────────────────────────────────────────────
const inputCls =
  "mt-1.5 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#B8896B] focus:outline-none";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <details
      open
      className="group rounded-xl border border-[#E7E5E4] bg-[#FFFCF8] shadow-[0_14px_40px_rgba(10,10,10,0.035)]"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-5 py-4 marker:hidden">
        <span>
          <span className="block text-base font-semibold">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-[#737373]">{subtitle}</span>}
        </span>
        <ChevronDown
          size={16}
          className="mt-1 shrink-0 text-[#A3A3A3] transition-transform group-open:rotate-180"
          strokeWidth={1.8}
        />
      </summary>
      <div className="space-y-3 border-t border-[#E7E5E4] px-5 py-4">{children}</div>
    </details>
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

function ToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left transition-colors ${
        checked
          ? "border-[#B8896B]/45 bg-[#F1EFEC]"
          : "border-[#E7E5E4] bg-white/80 hover:bg-[#FAFAF9]"
      }`}
    >
      <span>
        <span className="block text-sm font-medium text-[#0A0A0A]">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-[#737373]">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#B8896B]" : "bg-[#D6D3D1]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

// ── Main builder component ───────────────────────────────────────────────────
export function SiteBuilder({ business, hours, services, origin, templateUnlocks }: Props) {
  const [saved, setSaved] = useState<Draft>(() => businessToDraft(business, hours));
  const [draft, setDraft] = useState<Draft>(() => businessToDraft(business, hours));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pickerMode, setPickerMode] = useState<"hero" | "profile" | "gallery" | null>(null);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

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
    // Compare against the last-saved state (not `business`, which is stale
    // after the first save) so Gigi only cheers the not-published →
    // published transition, not every save while the box stays checked.
    const justPublished = !saved.is_published && draft.is_published;
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
        if (justPublished) cheer("Your site is LIVE! Go bestie! 🎉");
      }
    });
  };

  const handleDiscard = () => {
    setDraft(saved);
    setMsg(null);
  };

  const subscriptionTier = business.subscription_tier;
  const allowedThemes = themesForTemplateAccess(
    subscriptionTier,
    draft.template_layout,
    templateUnlocks,
  );
  const purchasedTemplates = useMemo(() => {
    const seen = new Set<string>();
    return templateUnlocks
      .filter((unlock) => unlock.layout_id && TEMPLATE_THEMES[unlock.theme_id])
      .filter((unlock) => {
        const key = `${unlock.layout_id}:${unlock.theme_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [templateUnlocks]);

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      {/* ── Sticky action bar ── */}
      <div className="sticky top-0 z-30 border-b border-[#E7E5E4] bg-white/95 px-4 py-3 shadow-[0_8px_24px_rgba(10,10,10,0.045)] backdrop-blur md:px-6 lg:px-8">
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
      </div>

      {/* ── Split pane ──
          Desktop (md+): editor left, preview right, side-by-side.
          Mobile: preview stacked on top (sticky, fixed height), editor below.
          `flex-col-reverse` on mobile flips the source order so the preview
          (second child in the DOM) renders above the editor. */}
      <div className="flex flex-col-reverse md:flex-row">
        {/* Editor panel */}
        <div
          className="w-full md:w-1/2 lg:w-[55%] md:border-r md:border-[#E7E5E4]"
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

              {subscriptionTier === "starter" && purchasedTemplates.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-[#525252]">Purchased templates</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {purchasedTemplates.map((unlock) => {
                      const layoutId = unlock.layout_id as string;
                      const selected =
                        draft.template_layout === layoutId &&
                        draft.template_theme === unlock.theme_id;
                      return (
                        <button
                          key={`${layoutId}:${unlock.theme_id}`}
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              template_layout: layoutId,
                              template_theme: unlock.theme_id,
                            }))
                          }
                          className={`rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors ${
                            selected
                              ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                              : "border-[#E7E5E4] bg-white hover:bg-[#FAFAF9]"
                          }`}
                        >
                          <span>{templateLabel(layoutId, unlock.theme_id)}</span>
                          {selected && <Check size={14} className="float-right" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-medium text-[#525252]">Theme</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {allowedThemes.map((t) => {
                    const selected = draft.template_theme === t;
                    // Subtitle map for "enhanced" or visually distinct themes so
                    // the picker sets accurate expectations. Standard color-only
                    // themes render no subtitle.
                    const subtitle =
                      t === "league"   ? { text: "⚡ Bold style — uppercase headings",         color: "#D4FF00" } :
                      t === "candy"    ? { text: "🦄 Maximalist Sugar Rush — heavy style",     color: "#FFEB3B" } :
                      t === "galactic" ? { text: "🌌 Maximalist Cosmic — heavy style",         color: "#8FD934" } :
                      t === "chrome"   ? { text: "🪞 Maximalist Sci-Fi Chrome — heavy style",  color: "#E84DB5" } :
                      t === "sunset"   ? { text: "🌊 Enhanced Trippy — dreamy style",          color: "#FF6EC7" } :
                      t === "neon"     ? { text: "✨ Saturated kawaii — bold style",           color: "#FFD54F" } :
                      t === "harajuku" ? { text: "☁︎ Soft kawaii — pastel style",              color: "#F5C8D1" } :
                      null;
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
                        {subtitle && (
                          <span
                            className="mt-0.5 block text-[9px] font-normal normal-case tracking-normal"
                            style={{ color: selected ? subtitle.color : "#525252" }}
                          >
                            {subtitle.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {subscriptionTier === "starter" && (
                  <p className="mt-2 text-[11px] text-[#B8896B]">
                    Starter includes {STARTER_THEME_IDS.length} themes. Purchased templates are added here.{" "}
                    <a href="/pricing" className="font-medium underline">Upgrade to Studio</a> for all {ALL_THEME_IDS.length}.
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

            {/* Fonts */}
            <Section title="Fonts" subtitle="Pick a font to override what the theme ships with — or leave it on the theme's default.">
              <FontsEditor
                businessName={draft.business_name || "My Studio"}
                themeId={draft.template_theme}
                headingFont={draft.heading_font}
                bodyFont={draft.body_font}
                onHeadingChange={(v) => update("heading_font", v)}
                onBodyChange={(v) => update("body_font", v)}
                inputCls={inputCls}
              />
            </Section>

            {/* Template copy — dynamically filtered to fields that apply to
                the currently-selected layout. Switching layouts refreshes
                this panel immediately. Saved values for hidden fields stay
                in the DB and re-appear when the layout is switched back. */}
            <Section
              title="Template copy"
              subtitle={`Rewrite any label for your ${draft.template_layout} layout. Leave blank to use the template default.`}
            >
              <div className="space-y-5">
                {/* Stats strip editor — Original layout only. Renders 3
                    dropdowns (type selector) + label inputs instead of
                    the free-text value inputs that used to live here.
                    Values auto-populate from verified platform data. */}
                {draft.template_layout === "original" && (
                  <StatsStripEditor
                    types={[draft.stat_1_type, draft.stat_2_type, draft.stat_3_type]}
                    labels={[
                      draft.template_content["stat_1_label"] ?? "",
                      draft.template_content["stat_2_label"] ?? "",
                      draft.template_content["stat_3_label"] ?? "",
                    ]}
                    onTypeChange={(i, v) => {
                      const key = (["stat_1_type","stat_2_type","stat_3_type"] as const)[i];
                      update(key, v);
                    }}
                    onLabelChange={(i, v) => {
                      const key = (["stat_1_label","stat_2_label","stat_3_label"] as const)[i];
                      updateContent(key, v);
                    }}
                  />
                )}
                {TEMPLATE_COPY_FIELDS
                  // Filter each group + its fields against the current layout.
                  .map((group) => ({
                    ...group,
                    fields: group.fields.filter((f) => matchesLayout(draft.template_layout, f.layouts)),
                  }))
                  // Drop groups that (a) don't apply to this layout or
                  // (b) have all their fields hidden after filtering.
                  .filter(
                    (group) =>
                      matchesLayout(draft.template_layout, group.layouts) &&
                      group.fields.length > 0,
                  )
                  .map((group) => (
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
              <ToggleRow
                checked={draft.loyalty_enabled}
                onChange={(checked) => update("loyalty_enabled", checked)}
                label="Enable loyalty rewards"
                description="Show rewards once clients reach your visit threshold."
              />
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
              <ToggleRow
                checked={draft.is_published}
                onChange={(checked) => update("is_published", checked)}
                label="Publish my site to the public URL"
                description={`${origin}/s/${draft.slug || "your-slug"}`}
              />
            </Section>

            <div className="h-24 md:h-8" />
          </div>
        </div>

        {/* Preview pane — always visible. Sticky under the action bar so it
            stays in view on mobile (stacked, top half) and on desktop (right
            column, full remaining height). */}
        <div
          className="w-full border-b border-[#E7E5E4] bg-[#FAFAF9] md:w-1/2 md:border-b-0 md:bg-transparent lg:w-[45%]"
        >
          <div className="sticky top-[72px]">
            <div className="flex items-center justify-between gap-3 px-4 py-2 text-[11px] text-[#737373] md:px-6 md:py-3">
              <span>Live preview · updates as you edit</span>
              <div className="inline-flex rounded-full border border-[#E7E5E4] bg-white p-1">
                {(["mobile", "desktop"] as const).map((mode) => {
                  const active = previewMode === mode;
                  const Icon = mode === "mobile" ? Smartphone : Monitor;
                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-label={`${mode === "mobile" ? "Mobile" : "Desktop"} preview`}
                      aria-pressed={active}
                      onClick={() => setPreviewMode(mode)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        active ? "bg-[#0A0A0A] text-white" : "text-[#737373] hover:bg-[#FAFAF9] hover:text-[#0A0A0A]"
                      }`}
                    >
                      <Icon size={14} strokeWidth={1.8} />
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className={`mx-4 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-[0_18px_48px_rgba(10,10,10,0.08)] md:mx-6 ${
                previewMode === "mobile" ? "max-w-[390px] md:mx-auto" : ""
              }`}
            >
              <div className="h-[45vh] overflow-auto md:h-[calc(100vh-190px)]">
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
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E7E5E4] bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(10,10,10,0.08)] backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#0A0A0A]">
              {isDirty ? "Unsaved site changes" : "Site changes saved"}
            </p>
            {msg && (
              <p className={msg.type === "ok" ? "mt-0.5 truncate text-[11px] text-green-700" : "mt-0.5 truncate text-[11px] text-red-600"}>
                {msg.text}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !isDirty}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            <Save size={13} /> {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
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

// ── Fonts editor ────────────────────────────────────────────────────────────
// Two dropdowns + an inline preview pane. Each dropdown leads with a
// "Use theme default (<ThemeFont>)" option — picking it stores empty
// string, which the server action round-trips to NULL so the storefront
// keeps showing the theme's font. Anything else overrides.
//
// Options are split into two <optgroup>s — fonts already used by an
// OYRB theme vs fonts added on top of the theme set — and each option
// label renders in its own font so a pro can scan the list at a glance.
function FontsEditor({
  businessName,
  themeId,
  headingFont,
  bodyFont,
  onHeadingChange,
  onBodyChange,
  inputCls,
}: {
  businessName: string;
  themeId: string;
  headingFont: string;
  bodyFont: string;
  onHeadingChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  inputCls: string;
}) {
  const theme = TEMPLATE_THEMES[themeId] ?? TEMPLATE_THEMES.aura;
  const themeHeadingName = firstFontInStack(theme.displayFont);
  const themeBodyName = firstFontInStack(theme.bodyFont);

  // Active font-families for the inline preview. Empty string falls
  // through to the active theme — same logic as the storefront.
  const activeHeadingFamily = resolveFontFamily(headingFont, theme.displayFont);
  const activeBodyFamily = resolveFontFamily(bodyFont, theme.bodyFont);

  return (
    <div className={ALL_FONT_VARIABLE_CLASSES}>
      <div className="grid gap-3 md:grid-cols-2">
        <FontSelect
          label="Heading font"
          themeFontName={themeHeadingName}
          fonts={HEADING_FONTS}
          value={headingFont}
          activeFamily={activeHeadingFamily}
          onChange={onHeadingChange}
          inputCls={inputCls}
        />
        <FontSelect
          label="Body font"
          themeFontName={themeBodyName}
          fonts={BODY_FONTS}
          value={bodyFont}
          activeFamily={activeBodyFamily}
          onChange={onBodyChange}
          inputCls={inputCls}
        />
      </div>

      <div
        className="mt-4 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-5"
        style={{ fontFamily: activeBodyFamily }}
      >
        <p className="text-[10px] uppercase tracking-wider text-[#A3A3A3]">
          Preview
        </p>
        <h3
          className="mt-2 text-2xl"
          style={{ fontFamily: activeHeadingFamily, fontWeight: 600 }}
        >
          Welcome to {businessName}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#525252]">
          Book your next appointment with us. The quick brown fox jumps over the lazy dog.
        </p>
      </div>
    </div>
  );
}

function FontSelect({
  label,
  themeFontName,
  fonts,
  value,
  activeFamily,
  onChange,
  inputCls,
}: {
  label: string;
  themeFontName: string;
  fonts: readonly FontDef[];
  value: string;
  activeFamily: string;
  onChange: (v: string) => void;
  inputCls: string;
}) {
  // Split the catalog by origin so each section renders under its own
  // <optgroup>. Theme fonts come first — they'll feel familiar to pros
  // who picked their theme based on its typography.
  const themeFonts = fonts.filter((f) => f.origin === "theme");
  const newFonts = fonts.filter((f) => f.origin === "new");

  return (
    <div>
      <label className="block text-[11px] font-medium text-[#525252]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        // Render the closed-select label in the currently active font so
        // the dropdown reflects what the storefront will use.
        style={{ fontFamily: activeFamily }}
      >
        <option value="">{`Use theme default (${themeFontName})`}</option>
        <optgroup label="— Theme fonts —">
          {themeFonts.map((f) => (
            <option
              key={f.id}
              value={f.id}
              style={{ fontFamily: fontFamilyFor(f.id) ?? undefined }}
            >
              {f.label}
            </option>
          ))}
        </optgroup>
        {newFonts.length > 0 && (
          <optgroup label="— New additions —">
            {newFonts.map((f) => (
              <option
                key={f.id}
                value={f.id}
                style={{ fontFamily: fontFamilyFor(f.id) ?? undefined }}
              >
                {f.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

// ── Stats strip editor ──────────────────────────────────────────────────────
// Renders 3 dropdown + label pairs. Dropdown binds to draft.stat_N_type
// (persisted as a column on businesses, enum-constrained). Label binds to
// template_content.stat_N_label (sanitized server-side and preview-hinted
// client-side so digits/symbols can't imply false data).
function StatsStripEditor({
  types,
  labels,
  onTypeChange,
  onLabelChange,
}: {
  types: [string, string, string];
  labels: [string, string, string];
  onTypeChange: (i: 0 | 1 | 2, value: string) => void;
  onLabelChange: (i: 0 | 1 | 2, value: string) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#525252]">
        Stats strip
      </h3>
      <p className="mt-0.5 text-[11px] text-[#A3A3A3]">
        Pick up to three verified stats. Values auto-populate from your real
        platform data — you can&apos;t type numbers manually.
      </p>
      <div className="mt-3 space-y-3">
        {[0, 1, 2].map((i) => {
          const idx = i as 0 | 1 | 2;
          const t = (types[idx] as StatType) || "specialty";
          const rawLabel = labels[idx] ?? "";
          const showsHint = rawLabel && !isLabelSanitized(rawLabel);
          return (
            <div
              key={i}
              className="grid gap-2 rounded-md border border-[#E7E5E4] bg-[#FAFAF9] p-3 md:grid-cols-2"
            >
              <div>
                <label className="block text-[11px] font-medium text-[#525252]">
                  Choose Stat {i + 1}
                </label>
                <select
                  value={types[idx]}
                  onChange={(e) => onTypeChange(idx, e.target.value)}
                  className={inputCls}
                >
                  {STAT_TYPES.map((optType) => (
                    <option key={optType} value={optType}>
                      {STAT_OPTION_LABELS[optType]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#525252]">
                  Customize label
                </label>
                <input
                  type="text"
                  value={rawLabel}
                  onChange={(e) => onLabelChange(idx, e.target.value)}
                  placeholder={DEFAULT_LABELS[t]}
                  maxLength={20}
                  className={inputCls}
                />
                {showsHint && (
                  <p className="mt-1 text-[10px] text-amber-700">
                    Digits and symbols (% ★ . # + *) will be stripped on save
                    — saved as: <strong>{sanitizeStatLabel(rawLabel) || "(empty)"}</strong>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-[#A3A3A3]">
        Stats auto-populate from your real platform data. You can&apos;t manually enter values.
      </p>
    </div>
  );
}
