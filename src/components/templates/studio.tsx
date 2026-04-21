"use client";

import Image from "next/image";
import { MapPin, Phone, Link2, Clock } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";
import { unsplash, SAMPLE_HOURS, isStockImageUrl } from "@/lib/template-images";
import { PlatformCredit } from "@/components/templates/platform-credit";
import type { SampleBusiness, SampleService, SampleHour } from "@/lib/sample-data";

interface StudioTemplateProps {
  business?: SampleBusiness;
  services?: SampleService[];
  hours?: SampleHour[];
  theme?: TemplateTheme;
  content?: Record<string, string> | null;
  /** True when rendered inside the dashboard editor preview. Suppresses the
   *  platform-enforced "Stock photo" badge + footer disclaimer so the pro
   *  can see a clean design view. On PUBLISHED sites this is always false.
   *  Required by Terms §22 — do not expose as a user-editable option. */
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

export function StudioTemplate({ business, services, hours, theme, content, isEditorPreview }: StudioTemplateProps) {
  const c = (key: string, fallback: string): string => {
    const v = content?.[key];
    return typeof v === "string" && v.trim() ? v : fallback;
  };
  const bg = theme?.bg ?? "#F5F0EA";
  const surface = theme?.surface ?? "#FFFAF5";
  const ink = theme?.ink ?? "#2D1B0E";
  const muted = theme?.muted ?? "#7A5C45";
  const accent = theme?.accent ?? "#C17B5A";
  const accent2 = theme?.accent2 ?? accent;
  const border = theme?.border ?? "rgba(42,30,23,0.12)";
  const btnBg = theme?.btnBg ?? "#C17B5A";
  const btnText = theme?.btnText ?? "#FFFFFF";
  const radius = theme?.radius ?? 16;
  const displayFont = theme?.displayFont ?? '"Fraunces", Georgia, serif';

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
  const profileId = biz?.profileImageId ?? "1519699047748-de8e457a634e";

  const svcs = services ?? [];
  const hrs = hours ?? SAMPLE_HOURS;

  return (
    <div className="min-h-screen font-sans" data-oyrb-theme={theme?.id} style={{ backgroundColor: bg, color: ink }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 px-6 py-4"
        style={{ backgroundColor: `${bg}f5`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}` }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-semibold" style={{ fontFamily: displayFont }}>{bizName}</h1>
          {/* Top-right "Book Now" removed — the hero CTA + per-service buttons
              already handle booking, and the floating widget catches any
              #book hash links elsewhere on the page. */}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="relative h-72 w-full overflow-hidden md:h-96">
          <Image
            src={heroSrc}
            alt={bizName}
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, transparent 50%, ${bg})` }}
          />
        </div>

        {/* Profile + info card */}
        <div className="mx-auto -mt-16 max-w-5xl px-6">
          <div
            className="flex flex-col items-start gap-4 p-6 shadow-md md:flex-row md:items-center"
            style={{ backgroundColor: surface, borderRadius: radius }}
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden md:h-24 md:w-24" style={{ borderRadius: radius }}>
              <Image src={profileSrc || ""} alt={bizName} fill className="object-cover" sizes="96px" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold" style={{ fontFamily: displayFont }}>{bizName}</h2>
              <p className="mt-1 text-sm" style={{ color: muted }}>{bizTagline}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs" style={{ color: accent }}>
                <span className="flex items-center gap-1"><MapPin size={12} /> {bizLocation}</span>
                <span className="flex items-center gap-1"><Phone size={12} /> {bizPhone}</span>
                {bizInstagram && (
                  <a href={bizInstagram} className="flex items-center gap-1 transition-colors hover:opacity-70">
                    <Link2 size={12} /> Instagram
                  </a>
                )}
              </div>
            </div>
            <a
              href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
              style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius }}
              className="shrink-0 px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            >
              {c("hero_book_label", "Book Now")}
            </a>
          </div>
        </div>
      </section>

      {/* ── Bio ── */}
      {bizBio && (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: muted }}>{bizBio}</p>
        </section>
      )}

      {/* ── Services ── */}
      <section data-oyrb-services="studio" className="mx-auto max-w-5xl px-6 pb-16">
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: displayFont }}>{c("section_services_title", "Services")}</h2>
          <span className="h-0.5 flex-1" style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent2} 100%)` }} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {svcs.map((svc, i) => (
            <div
              key={svc.id}
              data-oyrb-service-item="true"
              className="overflow-hidden shadow-sm"
              style={{ backgroundColor: surface, borderRadius: radius }}
            >
              <div className="relative h-40 w-full overflow-hidden">
                <Image
                  src={galleryUrls[i % galleryUrls.length] ?? unsplash(heroId, 500)}
                  alt={svc.name}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{svc.name}</h3>
                  <span className="shrink-0 text-lg font-semibold" style={{ color: accent, fontFamily: displayFont }}>
                    {formatPrice(svc.price_cents)}
                  </span>
                </div>
                <p className="mt-1 text-xs" style={{ color: muted }}>
                  <Clock size={10} className="mr-1 inline" />
                  {formatDuration(svc.duration_minutes)}
                </p>
                {svc.description && (
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: muted }}>{svc.description}</p>
                )}
                <a
                  href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
                  style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius }}
                  className="mt-4 block w-full py-2 text-center text-sm font-medium transition-opacity hover:opacity-80"
                >
                  {c("service_book_label", "Book")}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gallery ── */}
      {galleryUrls.length > 0 && (
        <section className="py-16 px-6" style={{ borderTop: `1px solid ${border}` }}>
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-2xl font-semibold" style={{ fontFamily: displayFont }}>{c("section_gallery_title", "Portfolio")}</h2>
            <div className="columns-2 gap-3 md:columns-3">
              {galleryUrls.map((id, i) => (
                <div key={i} className="relative mb-3 overflow-hidden" style={{ borderRadius: radius / 2 }}>
                  <Image
                    src={id}
                    alt={`Portfolio ${i + 1}`}
                    width={400}
                    height={i % 3 === 0 ? 500 : 300}
                    className="w-full object-cover transition-transform duration-500 hover:scale-105"
                    style={{ height: i % 3 === 0 ? "260px" : "180px" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Hours ── */}
      <section className="py-16 px-6" style={{ borderTop: `1px solid ${border}` }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-2xl font-semibold" style={{ fontFamily: displayFont }}>{c("section_hours_title", "Hours")}</h2>
          <div className="grid max-w-md grid-cols-2 gap-y-3 gap-x-8 text-sm">
            {hrs.map((h) => (
              <>
                <span key={`${h.day}-day`} className="font-medium">{h.day}</span>
                <span key={`${h.day}-time`} style={{ color: h.open ? muted : `${muted}66` }}>
                  {h.open ? `${formatTime(h.open_time)} – ${formatTime(h.close_time)}` : "Closed"}
                </span>
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──
          The stock-photo disclaimer is platform-enforced (Terms §22) and
          non-removable by the user. Shown only on published sites and only
          when the site actually contains a stock photo. */}
      <footer className="py-8 px-6 text-center text-xs" style={{ borderTop: `1px solid ${border}`, color: muted }}>
        <p>{c("footer_text", `${bizName} · ${bizLocation}`)}</p>
        {!isEditorPreview && hasAnyStockImage({
          heroSrc,
          profileSrc,
          galleryUrls,
        }) && (
          <p className="mt-3 italic opacity-70 text-[10px]">
            Some images on this site may be stock photos used for illustrative purposes. Actual service results may vary.
          </p>
        )}
        {/* Platform attribution — NOT user-editable. See components/templates/platform-credit.tsx. */}
        <PlatformCredit color={muted} />
      </footer>
    </div>
  );
}

// ── Shared helper: does this site render any stock photos? ──────────────────
// Platform-enforced — do not expose as a user-editable flag. The footer
// disclaimer only renders when this returns true, matching Terms §22.
function hasAnyStockImage(sources: { heroSrc: string; profileSrc: string; galleryUrls: string[] }): boolean {
  if (isStockImageUrl(sources.heroSrc)) return true;
  if (isStockImageUrl(sources.profileSrc)) return true;
  return sources.galleryUrls.some(isStockImageUrl);
}