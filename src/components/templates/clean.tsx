"use client";

import Image from "next/image";
import { MapPin, Clock, Link2 } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";
import { unsplash, SAMPLE_HOURS, isStockImageUrl } from "@/lib/template-images";
import { StockBadge } from "@/components/templates/stock-badge";
import type { SampleBusiness, SampleService, SampleHour } from "@/lib/sample-data";

interface CleanTemplateProps {
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

export function CleanTemplate({ business, services, hours, theme, content, isEditorPreview }: CleanTemplateProps) {
  const c = (key: string, fallback: string): string => {
    const v = content?.[key];
    return typeof v === "string" && v.trim() ? v : fallback;
  };
  const bg = theme?.bg ?? "#FFFFFF";
  const surface = theme?.surface ?? "#FFFFFF";
  const ink = theme?.ink ?? "#111111";
  const muted = theme?.muted ?? "#888888";
  const accent = theme?.accent ?? "#B8896B";
  const accent2 = theme?.accent2 ?? accent;
  const border = theme?.border ?? "rgba(0,0,0,0.08)";
  const btnBg = theme?.btnBg ?? "#111111";
  const btnText = theme?.btnText ?? "#FFFFFF";
  const radius = theme?.radius ?? 12;
  const displayFont = theme?.displayFont ?? "inherit";

  const biz = theme?.business;
  const bizName = business?.name ?? biz?.name ?? "Honey George Studio";
  const bizTagline = business?.tagline ?? biz?.tagline ?? "Where your beauty meets intention.";
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
    <div className="min-h-screen font-sans" style={{ backgroundColor: bg, color: ink }}>

      {/* ── Accent color band ── */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent2} 100%)` }} />

      {/* ── Thin top bar ── */}
      <div className="px-6 py-2 text-center text-xs" style={{ backgroundColor: ink, color: `${bg}b3` }}>
        {bizLocation} · {bizPhone}
      </div>

      {/* ── Header ── */}
      <header className="px-6 py-5" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="relative h-12 w-12 overflow-hidden border-2"
              style={{ borderRadius: 999, borderColor: ink }}
            >
              <Image src={profileSrc || ""} alt={bizName} fill className="object-cover" sizes="48px" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight" style={{ fontFamily: displayFont }}>{bizName}</h1>
              <p className="text-xs" style={{ color: muted }}>{bizTagline}</p>
            </div>
          </div>
          <a
            href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
            style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius / 2 }}
            className="px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          >
            {c("top_book_label", "Book Now")}
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[1fr_320px]">

          {/* Left: Services */}
          <main>
            <h2 className="mb-1 text-xl font-semibold" style={{ fontFamily: displayFont }}>{c("section_services_title", "Select a service")}</h2>
            <p className="mb-6 text-sm" style={{ color: muted }}>
              {svcs.length} services available · {bizLocation}
            </p>

            <div className="flex flex-col" style={{ borderTop: `1px solid ${border}` }}>
              {svcs.map((svc) => (
                <div
                  key={svc.id}
                  className="group flex cursor-pointer items-center gap-4 py-4 -mx-3 px-3 transition-colors"
                  style={{ borderBottom: `1px solid ${border}`, borderRadius: radius / 2 }}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium">{svc.name}</h3>
                      <span className="shrink-0 font-semibold">{formatPrice(svc.price_cents)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs" style={{ color: muted }}>
                        <Clock size={11} />{formatDuration(svc.duration_minutes)}
                      </span>
                      {svc.description && (
                        <span className="text-xs" style={{ color: muted }}>{svc.description}</span>
                      )}
                    </div>
                  </div>
                  <a
                    href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
                    className="shrink-0 px-4 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderRadius: radius / 2,
                      border: `1px solid ${border}`,
                    }}

                  >
                    {c("service_book_label", "Select")}
                  </a>
                </div>
              ))}
            </div>
          </main>

          {/* Right: Sidebar */}
          <aside className="flex flex-col gap-5">

            {/* Hero photo */}
            <div className="relative h-52 w-full overflow-hidden" style={{ borderRadius: radius }}>
              <Image src={heroSrc} alt={bizName} fill className="object-cover" sizes="320px" />
            </div>

            {/* Hours card */}
            <div className="p-5" style={{ borderRadius: radius, border: `1px solid ${border}` }}>
              <h3 className="mb-3 text-sm font-semibold">{c("section_hours_title", "Hours")}</h3>
              <div className="flex flex-col gap-2">
                {hrs.map((h) => (
                  <div key={h.day} className="flex justify-between text-xs">
                    <span style={{ color: h.open ? ink : `${muted}66` }}>{h.day.slice(0, 3)}</span>
                    <span style={{ color: h.open ? muted : `${muted}66` }}>
                      {h.open ? `${formatTime(h.open_time)} – ${formatTime(h.close_time)}` : "Closed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location card */}
            <div className="p-5" style={{ borderRadius: radius, border: `1px solid ${border}` }}>
              <h3 className="mb-2 text-sm font-semibold">{c("section_location_title", "Location")}</h3>
              <p className="flex items-start gap-1.5 text-xs" style={{ color: muted }}>
                <MapPin size={12} className="mt-0.5 shrink-0" />{bizLocation}
              </p>
              {bizInstagram && (
                <a
                  href={bizInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                  style={{ color: muted }}
                >
                  <Link2 size={12} /> Instagram
                </a>
              )}
            </div>

            {/* CTA */}
            <a
              href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
              style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius }}
              className="block w-full py-3.5 text-center text-sm font-medium transition-opacity hover:opacity-80"
            >
              {c("sidebar_cta_label", "Request a Booking")}
            </a>
          </aside>
        </div>

        {/* Gallery strip */}
        {galleryUrls.length > 0 && (
          <section className="mt-12 pt-10" style={{ borderTop: `1px solid ${border}` }}>
            <h2 className="mb-5 text-lg font-semibold" style={{ fontFamily: displayFont }}>{c("section_gallery_title", "Recent Work")}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryUrls.map((id, i) => (
                <div key={i} className="relative h-40 w-40 shrink-0 overflow-hidden" style={{ borderRadius: radius / 2 }}>
                  {!isEditorPreview && isStockImageUrl(id) && <StockBadge position="bottom-right" />}
                  <Image
                    src={id}
                    alt={`Work ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="160px"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 px-6 py-8 text-center text-xs" style={{ borderTop: `1px solid ${border}`, color: muted }}>
        <p>{c("footer_text", `${bizName} · ${bizLocation}`)}</p>
        <p className="mt-1">{c("footer_credit", "Powered by OYRB")}</p>
        {!isEditorPreview && (isStockImageUrl(heroSrc) || isStockImageUrl(profileSrc) || galleryUrls.some(isStockImageUrl)) && (
          <p className="mt-3 italic opacity-70 text-[10px]">
            Some images on this site may be stock photos used for illustrative purposes. Actual service results may vary.
          </p>
        )}
      </footer>
    </div>
  );
}