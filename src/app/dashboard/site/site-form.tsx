"use client";

import { useState, useTransition } from "react";
import { updateSite } from "./actions";
import Link from "next/link";
import { DAY_NAMES, type Business, type BusinessHours } from "@/lib/types";
import { ExternalLink, Check } from "lucide-react";
import { ImageUpload, GalleryUpload } from "@/components/dashboard/image-upload";
import { StockPicker } from "@/components/dashboard/stock-picker";

const CATEGORIES = [
  { id: "hair", label: "Hair styling" },
  { id: "nails", label: "Nail art" },
  { id: "lashes", label: "Lash & brow" },
  { id: "barber", label: "Barbering" },
  { id: "skincare", label: "Skincare & facials" },
  { id: "makeup", label: "Makeup artistry" },
];

const LAYOUTS = [
  { id: "original", label: "Original — signature design for each template category" },
  { id: "studio", label: "Studio — sticky header, portfolio" },
  { id: "luxe", label: "Luxe — editorial hero, grid gallery" },
  { id: "clean", label: "Clean — minimal list layout" },
  { id: "bold", label: "Bold — big type, high contrast" },
];

// Complete theme list (all 16). Starter tier is limited to the first 3;
// Studio and Scale tiers unlock every theme.
const ALL_THEMES = [
  "aura", "minimal", "bold",           // Starter: these 3 are always available
  "luxe", "earth", "street", "y2k",
  "rose", "sage", "slate", "noir",
  "citrus", "colorblock",
  "riot", "mochi", "linden",
];
const STARTER_THEMES = ["aura", "minimal", "bold"];

function themesForTier(tier: string | undefined): string[] {
  return tier === "starter" ? STARTER_THEMES : ALL_THEMES;
}

type Props = {
  business: Business;
  hours: BusinessHours[];
  origin: string;
};

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-[#E7E5E4] bg-white p-6">
    <h2 className="font-display text-lg font-medium">{title}</h2>
    {subtitle && <p className="mt-1 text-sm text-[#737373]">{subtitle}</p>}
    <div className="mt-5 space-y-4">{children}</div>
  </div>
);

const Label = ({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: boolean }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-[#0A0A0A]">
    {children}
    {optional && <span className="ml-1 text-xs font-normal text-[#A3A3A3]">(optional)</span>}
  </label>
);

const inputCls =
  "mt-1.5 block w-full rounded-md border border-[#E7E5E4] bg-white px-3 py-2 text-sm text-[#0A0A0A] placeholder:text-[#A3A3A3] focus:border-[#B8896B] focus:outline-none";

export function SiteForm({ business, hours, origin }: Props) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [heroUrl, setHeroUrl] = useState(business.hero_image_url ?? "");
  const [profileUrl, setProfileUrl] = useState(business.profile_image_url ?? "");
  const [gallery, setGallery] = useState<string[]>(
    Array.isArray(business.gallery_photos) ? business.gallery_photos : []
  );
  const [serviceCategory, setServiceCategory] = useState(business.service_category);
  const [pickerMode, setPickerMode] = useState<"hero" | "profile" | "gallery" | null>(null);
  const [faqs, setFaqs] = useState<Array<{ q: string; a: string }>>(
    Array.isArray(business.faq_json) ? business.faq_json : []
  );
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(!!business.loyalty_enabled);

  const hoursByDay = new Map(hours.map((h) => [h.day_of_week, h]));

  const onStockPick = (urls: string[]) => {
    if (pickerMode === "hero" && urls[0]) setHeroUrl(urls[0]);
    if (pickerMode === "profile" && urls[0]) setProfileUrl(urls[0]);
    if (pickerMode === "gallery") {
      setGallery((prev) => {
        const combined = [...prev];
        for (const u of urls) {
          if (!combined.includes(u)) combined.push(u);
        }
        return combined.slice(0, 12);
      });
    }
  };

  const onSubmit = (formData: FormData) => {
    setMsg(null);
    start(async () => {
      const r = await updateSite(formData);
      if (r?.error) setMsg({ type: "err", text: r.error });
      else setMsg({ type: "ok", text: "Saved." });
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">

      {/* Status banner */}
      <div className="flex items-center justify-between rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-4">
        <div>
          <p className="text-sm font-medium">
            {business.is_published ? "Your site is live ✦" : "Your site is not published yet"}
          </p>
          <p className="mt-0.5 text-xs text-[#737373]">
            {origin}/s/<span className="font-mono">{business.slug}</span>
          </p>
        </div>
        {business.is_published && (
          <Link
            href={`/s/${business.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            View site <ExternalLink size={11} />
          </Link>
        )}
      </div>

      {/* Business basics */}
      <Section title="Business basics" subtitle="The essentials shown on your booking site.">
        <div>
          <Label htmlFor="business_name">Business name</Label>
          <input required id="business_name" name="business_name" defaultValue={business.business_name} className={inputCls} />
        </div>
        <div>
          <Label htmlFor="slug">Site URL</Label>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm text-[#737373]">{origin}/s/</span>
            <input id="slug" name="slug" defaultValue={business.slug} className={inputCls + " mt-0 flex-1"} />
          </div>
        </div>
        <div>
          <Label htmlFor="tagline" optional>Tagline</Label>
          <input id="tagline" name="tagline" defaultValue={business.tagline ?? ""} placeholder="e.g. Signature cuts and color in the heart of Atlanta." className={inputCls} />
        </div>
        <div>
          <Label htmlFor="bio" optional>About</Label>
          <textarea id="bio" name="bio" rows={4} defaultValue={business.bio ?? ""} placeholder="Tell clients who you are and what makes you different." className={inputCls} />
        </div>
        <div>
          <Label htmlFor="service_category">Primary service category</Label>
          <select
            id="service_category"
            name="service_category"
            value={serviceCategory}
            onChange={(e) => setServiceCategory(e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact & location">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="contact_email" optional>Public email</Label>
            <input type="email" id="contact_email" name="contact_email" defaultValue={business.contact_email ?? ""} className={inputCls} />
          </div>
          <div>
            <Label htmlFor="phone" optional>Phone</Label>
            <input id="phone" name="phone" defaultValue={business.phone ?? ""} className={inputCls} />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <input id="city" name="city" defaultValue={business.city ?? ""} className={inputCls} />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <input id="state" name="state" defaultValue={business.state ?? ""} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="instagram_url" optional>Instagram URL</Label>
            <input id="instagram_url" name="instagram_url" defaultValue={business.instagram_url ?? ""} placeholder="https://instagram.com/…" className={inputCls} />
          </div>
        </div>
      </Section>

      {/* Design */}
      <Section title="Design & template" subtitle="Preview changes in the Templates gallery before publishing.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="template_layout">Layout</Label>
            <select
              id="template_layout"
              name="template_layout"
              defaultValue={business.template_layout === "zip" ? "original" : business.template_layout}
              className={inputCls}
            >
              {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="template_theme">Theme</Label>
            <select id="template_theme" name="template_theme" defaultValue={business.template_theme} className={inputCls}>
              {themesForTier(business.subscription_tier).map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            {business.subscription_tier === "starter" && (
              <p className="mt-2 text-xs text-[#B8896B]">
                Starter includes 3 themes. <a href="/pricing" className="font-medium underline">Upgrade to Studio</a> for all 13 themes + SMS reminders + waitlist.
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="hero_image_url">Hero image</Label>
            <p className="mb-2 mt-1 text-xs text-[#737373]">
              The main image at the top of your site. Wide format works best.{" "}
              <button type="button" onClick={() => setPickerMode("hero")} className="font-medium text-[#B8896B] hover:underline">
                Browse stock photos
              </button>
            </p>
            <ImageUpload
              value={heroUrl}
              onChange={setHeroUrl}
              aspect="wide"
              userId={business.owner_id}
            />
            <input type="hidden" name="hero_image_url" value={heroUrl} />
          </div>
          <div>
            <Label htmlFor="profile_image_url">Profile image</Label>
            <p className="mb-2 mt-1 text-xs text-[#737373]">
              Your headshot or logo.{" "}
              <button type="button" onClick={() => setPickerMode("profile")} className="font-medium text-[#B8896B] hover:underline">
                Browse stock photos
              </button>
            </p>
            <ImageUpload
              value={profileUrl}
              onChange={setProfileUrl}
              aspect="square"
              userId={business.owner_id}
            />
            <input type="hidden" name="profile_image_url" value={profileUrl} />
          </div>
        </div>
      </Section>

      {/* Gallery */}
      <Section title="Gallery" subtitle="Show off your work. Clients see these on your booking site.">
        <GalleryUpload value={gallery} onChange={setGallery} userId={business.owner_id} max={12} />
        <input type="hidden" name="gallery_photos" value={JSON.stringify(gallery)} />
        <button
          type="button"
          onClick={() => setPickerMode("gallery")}
          className="text-xs font-medium text-[#B8896B] hover:underline"
        >
          + Browse stock photo library
        </button>
      </Section>

      {/* Client Policies */}
      <Section
        title="Client policies & ban rules"
        subtitle="Warn clients upfront about behaviors that get them banned. They'll see this before booking and must acknowledge."
      >
        <div>
          <Label htmlFor="client_policies" optional>House rules / grounds for banning</Label>
          <textarea
            id="client_policies"
            name="client_policies"
            rows={5}
            defaultValue={business.client_policies ?? ""}
            placeholder="Example:&#10;• No-show twice = permanent ban&#10;• No children under 10 in service chair&#10;• No unscheduled guests&#10;• Be on time — 15 min late = forfeit appointment&#10;• Disrespectful behavior = immediate ban + forfeit of deposit"
            className={inputCls + " resize-y"}
          />
          <p className="mt-1 text-xs text-[#A3A3A3]">Use bullet points or short lines. This shows on your booking site.</p>
        </div>
        <div>
          <Label htmlFor="cancellation_policy" optional>Cancellation & no-show policy</Label>
          <textarea
            id="cancellation_policy"
            name="cancellation_policy"
            rows={4}
            defaultValue={business.cancellation_policy ?? ""}
            placeholder="Example:&#10;• Cancellations less than 24 hours = forfeit deposit&#10;• No-show = full service fee charged&#10;• Rescheduling OK up to 24h before appointment"
            className={inputCls + " resize-y"}
          />
        </div>
      </Section>

      {/* FAQ */}
      <Section title="FAQ" subtitle="Common questions clients ask. Shown on your booking site.">
        <input type="hidden" name="faq_json" value={JSON.stringify(faqs)} />
        {faqs.map((f, i) => (
          <div key={i} className="rounded-md border border-[#E7E5E4] p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold">FAQ {i + 1}</p>
              <button
                type="button"
                onClick={() => setFaqs((xs) => xs.filter((_, idx) => idx !== i))}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              value={f.q}
              onChange={(e) => {
                const v = e.target.value;
                setFaqs((xs) => xs.map((x, idx) => (idx === i ? { ...x, q: v } : x)));
              }}
              placeholder="Question (e.g., Do you require a deposit?)"
              className={inputCls + " mt-2"}
            />
            <textarea
              value={f.a}
              onChange={(e) => {
                const v = e.target.value;
                setFaqs((xs) => xs.map((x, idx) => (idx === i ? { ...x, a: v } : x)));
              }}
              rows={3}
              placeholder="Answer"
              className={inputCls + " mt-2 resize-y"}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setFaqs((xs) => [...xs, { q: "", a: "" }])}
          disabled={faqs.length >= 20}
          className="rounded-md border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
        >
          {faqs.length >= 20 ? "Maximum of 20 FAQs" : "+ Add a FAQ"}
        </button>
      </Section>

      {/* Loyalty */}
      <Section title="Loyalty rewards" subtitle="Optional. Reward repeat clients with an automatic discount after a set number of visits.">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="loyalty_enabled"
            checked={loyaltyEnabled}
            onChange={(e) => setLoyaltyEnabled(e.target.checked)}
          />
          Enable loyalty rewards
        </label>
        {loyaltyEnabled && (
          <>
            <div>
              <Label htmlFor="loyalty_threshold">Reward after this many visits</Label>
              <input
                id="loyalty_threshold"
                name="loyalty_threshold"
                type="number"
                min={2}
                max={20}
                defaultValue={business.loyalty_threshold ?? 6}
                className={inputCls + " max-w-[120px]"}
              />
              <p className="mt-1 text-xs text-[#737373]">
                Clients become eligible after completing this many visits.
              </p>
            </div>
            <div>
              <Label htmlFor="loyalty_reward_text">Reward description</Label>
              <input
                id="loyalty_reward_text"
                name="loyalty_reward_text"
                type="text"
                defaultValue={business.loyalty_reward_text ?? "20% off your next visit"}
                placeholder="20% off your next visit"
                maxLength={200}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-[#737373]">
                Shown to clients who qualify. Examples: "$20 off", "Free addon treatment", "25% off".
              </p>
            </div>
          </>
        )}
      </Section>

      {/* Hours */}
      <Section title="Business hours" subtitle="Only open days will accept bookings.">
        <div className="space-y-2">
          {DAY_NAMES.map((name, d) => {
            const h = hoursByDay.get(d);
            return (
              <div key={d} className="grid grid-cols-[120px_auto_1fr_1fr] items-center gap-3">
                <span className="text-sm font-medium">{name}</span>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" name={`hours_${d}_open`} defaultChecked={h?.is_open ?? false} />
                  Open
                </label>
                <input type="time" name={`hours_${d}_from`} defaultValue={h?.open_time?.slice(0, 5) ?? ""} className={inputCls + " mt-0"} />
                <input type="time" name={`hours_${d}_to`} defaultValue={h?.close_time?.slice(0, 5) ?? ""} className={inputCls + " mt-0"} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* Publish */}
      <Section title="Publish">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="is_published" defaultChecked={business.is_published} className="h-4 w-4" />
          <span className="text-sm font-medium">Publish my site to the public URL</span>
        </label>
      </Section>

      {/* Stock picker modal */}
      {pickerMode && (
        <StockPicker
          mode={pickerMode === "gallery" ? "multi" : "single"}
          defaultCategory={
            pickerMode === "hero" ? "hero" :
            pickerMode === "profile" ? "profile" :
            serviceCategory
          }
          selected={pickerMode === "gallery" ? gallery : []}
          onPick={onStockPick}
          onClose={() => setPickerMode(null)}
        />
      )}

      {/* Save */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-lg border border-[#E7E5E4] bg-white p-4 shadow-sm">
        <div className="text-sm">
          {msg && (
            <span className={msg.type === "ok" ? "flex items-center gap-1 text-green-700" : "text-red-600"}>
              {msg.type === "ok" && <Check size={14} />} {msg.text}
            </span>
          )}
        </div>
        <button
          disabled={pending}
          className="rounded-md bg-[#0A0A0A] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
