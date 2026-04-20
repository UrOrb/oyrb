"use client";

import { useState, useTransition } from "react";
import { saveVisibilitySettings, presetToggles } from "./actions";
import type { VisibilityPreset } from "@/lib/directory";

type Toggles = {
  show_avatar: boolean;
  show_profession: boolean;
  show_city: boolean;
  show_specialty_tags: boolean;
  show_bio: boolean;
  show_booking_link: boolean;
  show_instagram: boolean;
  show_tiktok: boolean;
  show_full_site_link: boolean;
  show_gallery: boolean;
  show_accepting_clients: boolean;
  show_price_range: boolean;
  allow_search_engine_indexing: boolean;
};

type Content = {
  profession: string;
  city: string;
  state: string;
  specialties: string[];
  bio: string;
  instagram_handle: string;
  tiktok_handle: string;
  accepting_clients: boolean;
  price_range: "$" | "$$" | "$$$" | null;
};

type Props = {
  initial: Toggles & Content;
  currentlyListed: boolean;
};

export function VisibilityForm({ initial, currentlyListed }: Props) {
  const [form, setForm] = useState<Toggles & Content>(initial);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const applyPreset = (preset: VisibilityPreset) => {
    const bundle = presetToggles(preset);
    setForm((prev) => ({ ...prev, ...(bundle as Partial<Toggles>) }));
  };

  const submit = (goLive: boolean) => {
    setMsg(null);
    startTransition(async () => {
      const r = await saveVisibilitySettings({
        show_avatar: form.show_avatar,
        show_profession: form.show_profession,
        show_city: form.show_city,
        show_specialty_tags: form.show_specialty_tags,
        show_bio: form.show_bio,
        show_booking_link: form.show_booking_link,
        show_instagram: form.show_instagram,
        show_tiktok: form.show_tiktok,
        show_full_site_link: form.show_full_site_link,
        show_gallery: form.show_gallery,
        show_accepting_clients: form.show_accepting_clients,
        show_price_range: form.show_price_range,
        allow_search_engine_indexing: form.allow_search_engine_indexing,
        profession: form.profession.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        specialties: form.specialties.filter(Boolean),
        bio: form.bio.trim() || undefined,
        instagram_handle: form.instagram_handle.trim() || undefined,
        tiktok_handle: form.tiktok_handle.trim() || undefined,
        accepting_clients: form.accepting_clients,
        price_range: form.price_range,
        go_live: goLive,
      });
      if (r.ok) {
        setMsg({
          type: "ok",
          text: r.is_listed
            ? `Published. Your listing is live at oyrb.space/find/${r.slug}`
            : "Saved as draft.",
        });
      } else {
        setMsg({ type: "err", text: r.error });
      }
    });
  };

  const addSpecialty = () => {
    const tag = specialtyInput.trim();
    if (!tag || form.specialties.includes(tag) || form.specialties.length >= 8) return;
    setForm((f) => ({ ...f, specialties: [...f.specialties, tag] }));
    setSpecialtyInput("");
  };

  return (
    <div className="space-y-6">
      {/* Preset row */}
      <div>
        <p className="text-xs font-medium text-[#525252]">Quick presets</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <PresetButton label="Minimal — Just Find Me" onClick={() => applyPreset("minimal")} />
          <PresetButton label="Social Only" onClick={() => applyPreset("social")} />
          <PresetButton label="Full Profile" onClick={() => applyPreset("full")} />
        </div>
        <p className="mt-1 text-[11px] text-[#737373]">
          Presets set the toggles below — you can still customize each one.
        </p>
      </div>

      {/* Toggles */}
      <div>
        <p className="text-xs font-medium text-[#525252]">What should people see?</p>
        <div className="mt-2 space-y-1.5">
          <Toggle
            label="My business name (always on)"
            checked
            disabled
            help="Required for any listing — the directory can't surface you without one."
          />
          <Toggle
            label="Profile photo"
            checked={form.show_avatar}
            onChange={(v) => setForm((f) => ({ ...f, show_avatar: v }))}
            help="Uses the profile image on your OYRB site."
          />
          <Toggle
            label="Profession (e.g. Hair Stylist, MUA)"
            checked={form.show_profession}
            onChange={(v) => setForm((f) => ({ ...f, show_profession: v }))}
          />
          <Toggle
            label="My city"
            checked={form.show_city}
            onChange={(v) => setForm((f) => ({ ...f, show_city: v }))}
          />
          <Toggle
            label="Specialty tags"
            checked={form.show_specialty_tags}
            onChange={(v) => setForm((f) => ({ ...f, show_specialty_tags: v }))}
          />
          <Toggle
            label="Short bio (200 char max)"
            checked={form.show_bio}
            onChange={(v) => setForm((f) => ({ ...f, show_bio: v }))}
          />
          <Toggle
            label="My booking link"
            checked={form.show_booking_link}
            onChange={(v) => setForm((f) => ({ ...f, show_booking_link: v }))}
          />
          <Toggle
            label="Instagram handle"
            checked={form.show_instagram}
            onChange={(v) => setForm((f) => ({ ...f, show_instagram: v }))}
          />
          <Toggle
            label="TikTok handle"
            checked={form.show_tiktok}
            onChange={(v) => setForm((f) => ({ ...f, show_tiktok: v }))}
          />
          <Toggle
            label="Full OYRB website link"
            checked={form.show_full_site_link}
            onChange={(v) => setForm((f) => ({ ...f, show_full_site_link: v }))}
          />
          <Toggle
            label="Gallery preview (up to 4 images)"
            checked={form.show_gallery}
            onChange={(v) => setForm((f) => ({ ...f, show_gallery: v }))}
          />
          <Toggle
            label="Accepting-new-clients badge"
            checked={form.show_accepting_clients}
            onChange={(v) => setForm((f) => ({ ...f, show_accepting_clients: v }))}
          />
          <Toggle
            label="Price range ($ / $$ / $$$)"
            checked={form.show_price_range}
            onChange={(v) => setForm((f) => ({ ...f, show_price_range: v }))}
          />
        </div>
      </div>

      {/* Content inputs — shown for toggles that are enabled */}
      <div className="space-y-3 border-t border-[#E7E5E4] pt-5">
        <p className="text-xs font-medium text-[#525252]">Public content</p>
        {form.show_profession && (
          <TextField
            label="Profession"
            value={form.profession}
            onChange={(v) => setForm((f) => ({ ...f, profession: v }))}
            placeholder="Hair Stylist · Lash Artist · Barber"
            maxLength={60}
          />
        )}
        {(form.show_city || form.show_specialty_tags) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {form.show_city && (
              <TextField
                label="City"
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v }))}
                placeholder="Atlanta"
              />
            )}
            {form.show_city && (
              <TextField
                label="State"
                value={form.state}
                onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                placeholder="GA"
                maxLength={2}
              />
            )}
          </div>
        )}
        {form.show_specialty_tags && (
          <div>
            <label className="text-xs font-medium text-[#0A0A0A]">Specialties (up to 8)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                placeholder="Braids, silk press, lash lift..."
                className="flex-1 rounded-md border border-[#E7E5E4] px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={addSpecialty}
                className="rounded-md border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.specialties.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] bg-[#F5F5F4] px-2 py-0.5 text-[11px]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        specialties: f.specialties.filter((t) => t !== tag),
                      }))
                    }
                    aria-label={`Remove ${tag}`}
                    className="text-[#737373] hover:text-[#0A0A0A]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        {form.show_bio && (
          <div>
            <label className="text-xs font-medium text-[#0A0A0A]">Short bio (200 chars)</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, 200) }))}
              rows={3}
              placeholder="Soft glamour, weddings welcomed — by appointment only."
              className="mt-1 w-full rounded-md border border-[#E7E5E4] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[10px] text-[#737373]">
              {form.bio.length}/200. No emails, phone numbers, or street addresses — saving will fail if any are detected.
            </p>
          </div>
        )}
        {(form.show_instagram || form.show_tiktok) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {form.show_instagram && (
              <TextField
                label="Instagram @handle"
                value={form.instagram_handle}
                onChange={(v) => setForm((f) => ({ ...f, instagram_handle: v }))}
                placeholder="yourhandle"
              />
            )}
            {form.show_tiktok && (
              <TextField
                label="TikTok @handle"
                value={form.tiktok_handle}
                onChange={(v) => setForm((f) => ({ ...f, tiktok_handle: v }))}
                placeholder="yourhandle"
              />
            )}
          </div>
        )}
        {form.show_accepting_clients && (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.accepting_clients}
              onChange={(e) => setForm((f) => ({ ...f, accepting_clients: e.target.checked }))}
            />
            Currently accepting new clients
          </label>
        )}
        {form.show_price_range && (
          <div>
            <label className="text-xs font-medium text-[#0A0A0A]">Price range</label>
            <div className="mt-1 flex gap-2">
              {(["$", "$$", "$$$"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, price_range: f.price_range === p ? null : p }))}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    form.price_range === p
                      ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                      : "border-[#E7E5E4] bg-white text-[#525252]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Indexing — separate, explicit opt-in */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.allow_search_engine_indexing}
            onChange={(e) =>
              setForm((f) => ({ ...f, allow_search_engine_indexing: e.target.checked }))
            }
            className="mt-0.5"
          />
          <span>
            <span className="block font-semibold text-[#713F12]">
              Let search engines like Google show my listing
            </span>
            <span className="block text-[#92400E]">
              Leave off if you only want folks to find you via OYRB links. OYRB
              adds a <code>noindex</code> tag when this is off.
            </span>
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-[#E7E5E4] pt-4">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={pending}
          className="rounded-md border border-[#E7E5E4] bg-white px-4 py-1.5 text-xs font-medium hover:bg-[#F5F5F4] disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={pending}
          className="rounded-md bg-[#0A0A0A] px-4 py-1.5 text-xs font-medium text-white hover:opacity-85 disabled:opacity-50"
        >
          {pending ? "Working…" : currentlyListed ? "Save & keep live" : "Save & publish"}
        </button>
        {msg && (
          <span
            className={
              msg.type === "ok" ? "text-xs text-green-700" : "text-xs text-red-600"
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
  help,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block text-[#0A0A0A]">{label}</span>
        {help && <span className="block text-[11px] text-[#737373]">{help}</span>}
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0A0A0A]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1 w-full rounded-md border border-[#E7E5E4] px-3 py-1.5 text-sm"
      />
    </div>
  );
}

function PresetButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[#E7E5E4] bg-white px-3 py-1 text-xs font-medium text-[#525252] hover:bg-[#F5F5F4]"
    >
      {label}
    </button>
  );
}
