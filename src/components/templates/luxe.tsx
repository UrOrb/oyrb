"use client";

import Image from "next/image";
import { Link2, MapPin, Phone } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";
import { unsplash, SAMPLE_HOURS, isStockImageUrl } from "@/lib/template-images";
import { PlatformCredit } from "@/components/templates/platform-credit";
import type { SampleBusiness, SampleService, SampleHour } from "@/lib/sample-data";

interface LuxeTemplateProps {
  business?: SampleBusiness;
  services?: SampleService[];
  hours?: SampleHour[];
  theme?: TemplateTheme;
  content?: Record<string, string> | null;
  /** See Studio template for policy note. */
  isEditorPreview?: boolean;
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(0)}`; }
function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function LuxeTemplate({ business, services, hours, theme, content, isEditorPreview }: LuxeTemplateProps) {
  const c = (key: string, fallback: string): string => {
    const v = content?.[key];
    return typeof v === "string" && v.trim() ? v : fallback;
  };
  const bg = theme?.bg ?? "#FAFAF7";
  const surface = theme?.surface ?? "#FFFFFF";
  const ink = theme?.ink ?? "#0A0A0A";
  const muted = theme?.muted ?? "#737373";
  const accent = theme?.accent ?? "#B8896B";
  const accent2 = theme?.accent2 ?? accent;
  const border = theme?.border ?? "rgba(0,0,0,0.08)";
  const btnBg = theme?.btnBg ?? "#0A0A0A";
  const btnText = theme?.btnText ?? "#FFFFFF";
  const radius = theme?.radius ?? 0;
  const displayFont = theme?.displayFont ?? '"Fraunces", Georgia, serif';
  const displayWeight = theme?.displayWeight ?? 400;

  const biz = theme?.business;
  const bizName = business?.name ?? biz?.name ?? "Honey George Studio";
  const bizTagline = business?.tagline ?? biz?.tagline ?? "Where your beauty meets intention.";
  const bizBio = business?.bio ?? biz?.bio ?? "";
  const bizLocation = business?.location ?? biz?.location ?? "Atlanta, GA";
  const bizPhone = business?.phone ?? biz?.phone ?? "(404) 555-0192";
  const bizEmail = business?.email ?? "hello@example.com";
  const bizInstagram = business?.instagram_url ?? null;
  const heroId = biz?.heroImageId ?? "1508214751196-bcfd4ca60f91";
  const heroSrc = business?.hero_image_url || unsplash(heroId, 1600);
  const profileSrc = business?.profile_image_url || (biz?.profileImageId ? unsplash(biz.profileImageId, 400) : "");
  const galleryUrls: string[] = (business?.photos && business.photos.length > 0)
    ? business.photos
    : (biz?.galleryIds ?? []).map((id: string) => unsplash(id, 600));

  const svcs = services ?? [];
  const hrs = hours ?? SAMPLE_HOURS;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bg, color: ink }}>

      {/* ── Hero ── */}
      <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
        <Image
          src={heroSrc}
          alt={bizName}
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        {/* Centered name over hero */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/70">{bizLocation}</p>
          <h1
            className="text-5xl font-medium leading-[1.1] tracking-[-0.02em] text-white md:text-7xl lg:text-8xl"
            style={{ fontFamily: displayFont, fontWeight: displayWeight }}
          >
            {bizName}
          </h1>
          <p className="mt-3 text-lg italic text-white/80" style={{ fontFamily: displayFont }}>
            {bizTagline}
          </p>
          <a
            href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
            className="mt-8 inline-block border border-white px-10 py-3 text-sm font-medium uppercase tracking-[0.15em] text-white transition-all hover:bg-white hover:text-[#0A0A0A]"
            style={{ ...(radius > 0 ? { borderRadius: radius } : {}) }}
          >
            {c("hero_book_label", "Book an Appointment")}
          </a>
        </div>
      </section>

      {/* ── Bio strip ── */}
      <section className="py-14" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="mx-auto max-w-2xl px-6 text-center">
          {bizBio && <p className="text-base leading-relaxed" style={{ color: muted }}>{bizBio}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: muted }}>
            <span className="flex items-center gap-1.5"><MapPin size={14} /> {bizLocation}</span>
            <span className="flex items-center gap-1.5"><Phone size={14} /> {bizPhone}</span>
            {bizInstagram && (
              <a href={bizInstagram} className="flex items-center gap-1.5 transition-colors hover:opacity-80">
                <Link2 size={14} /> Instagram
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-12 flex items-center justify-center gap-3">
            <span className="h-px w-12" style={{ backgroundColor: accent2 }} />
            <h2
              className="text-center text-3xl font-medium tracking-[-0.02em] md:text-4xl"
              style={{ fontFamily: displayFont, fontWeight: displayWeight }}
            >
              {c("section_services_title", "Services")}
            </h2>
            <span className="h-px w-12" style={{ backgroundColor: accent2 }} />
          </div>

          <div className="flex flex-col">
            {svcs.map((svc, i) => (
              <div
                key={svc.id}
                className="group flex items-start gap-6 py-6"
                style={i < svcs.length - 1 ? { borderBottom: `1px solid ${border}` } : {}}
              >
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-lg font-medium">{svc.name}</h3>
                    <span
                      className="shrink-0 text-xl font-medium tabular-nums"
                      style={{ fontFamily: displayFont, color: accent }}
                    >
                      {formatPrice(svc.price_cents)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span
                      className="text-xs font-medium uppercase tracking-[0.1em]"
                      style={{ color: accent }}
                    >
                      {formatDuration(svc.duration_minutes)}
                    </span>
                    {svc.description && (
                      <span className="text-sm" style={{ color: muted }}>{svc.description}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
              className="inline-block border px-10 py-3 text-sm font-medium uppercase tracking-[0.15em] transition-colors"
              style={{
                borderColor: ink,
                color: ink,
                ...(radius > 0 ? { borderRadius: radius } : {}),
              }}
            >
              {c("sidebar_cta_label", "Request a Booking")}
            </a>
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      {galleryUrls.length > 0 && (
        <section className="py-20" style={{ borderTop: `1px solid ${border}` }}>
          <div className="mx-auto max-w-5xl px-6">
            <h2
              className="mb-10 text-center text-3xl font-medium tracking-[-0.02em]"
              style={{ fontFamily: displayFont, fontWeight: displayWeight }}
            >
              {c("section_gallery_title", "Gallery")}
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {galleryUrls.slice(0, 6).map((id, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden ${
                    i === 0 ? "col-span-2 aspect-[2/1] md:col-span-1 md:row-span-2 md:aspect-auto md:min-h-[400px]" : "aspect-square"
                  }`}
                  style={radius > 0 ? { borderRadius: radius / 2 } : {}}
                >
                  <Image
                    src={id}
                    alt={`${bizName} work ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Hours ── */}
      <section className="py-20" style={{ borderTop: `1px solid ${border}` }}>
        <div className="mx-auto max-w-xl px-6">
          <h2
            className="mb-10 text-center text-3xl font-medium tracking-[-0.02em]"
            style={{ fontFamily: displayFont, fontWeight: displayWeight }}
          >
            {c("section_hours_title", "Hours")}
          </h2>
          <div className="flex flex-col gap-3">
            {hrs.map((h) => (
              <div key={h.day} className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${border}` }}>
                <span className="text-sm font-medium">{h.day}</span>
                {h.open ? (
                  <span className="text-sm" style={{ color: muted }}>
                    {formatTime(h.open_time)} — {formatTime(h.close_time)}
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: `${muted}66` }}>Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 text-center text-xs" style={{ borderTop: `1px solid ${border}`, color: `${muted}99` }}>
        <p>{c("footer_text", `${bizName} · ${bizLocation}`)}</p>
        {!isEditorPreview && (isStockImageUrl(heroSrc) || isStockImageUrl(profileSrc) || galleryUrls.some(isStockImageUrl)) && (
          <p className="mt-3 italic opacity-70 text-[10px]">
            Some images on this site may be stock photos used for illustrative purposes. Actual service results may vary.
          </p>
        )}
        {/* Platform attribution — NOT user-editable. */}
        <PlatformCredit color={muted} />
      </footer>
    </div>
  );
}