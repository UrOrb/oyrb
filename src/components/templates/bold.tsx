"use client";

import Image from "next/image";
import { MapPin, Phone, Link2, Star, Clock } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";
import { unsplash, SAMPLE_HOURS, isStockImageUrl } from "@/lib/template-images";
import { PlatformCredit } from "@/components/templates/platform-credit";
import type { SampleBusiness, SampleService, SampleHour } from "@/lib/sample-data";

interface BoldTemplateProps {
  business?: SampleBusiness;
  services?: SampleService[];
  hours?: SampleHour[];
  theme?: TemplateTheme;
  content?: Record<string, string> | null;
  /** See Studio template for policy note. */
  isEditorPreview?: boolean;
}

function formatPrice(cents: number) { return `$${(cents / 100).toFixed(0)}+`; }
function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function BoldTemplate({ business, services, hours, theme, content, isEditorPreview }: BoldTemplateProps) {
  const c = (key: string, fallback: string): string => {
    const v = content?.[key];
    return typeof v === "string" && v.trim() ? v : fallback;
  };
  // Theme-aware colors — fall back to original bold palette
  const bg = theme?.bg ?? "#F8F8F8";
  const surface = theme?.surface ?? "#FFFFFF";
  const ink = theme?.ink ?? "#111111";
  const muted = theme?.muted ?? "#555555";
  const accent = theme?.accent ?? "#111111";
  const accent2 = theme?.accent2 ?? accent;
  const border = theme?.border ?? "rgba(0,0,0,0.10)";
  const btnBg = theme?.btnBg ?? "#111111";
  const btnText = theme?.btnText ?? "#FFFFFF";
  const radius = theme?.radius ?? 12;
  const displayFont = theme?.displayFont ?? "inherit";

  // Business data — use theme business or fallback
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

      {/* ── Dark hero cover ── */}
      <section className="relative h-80 w-full overflow-hidden md:h-96" style={{ backgroundColor: ink }}>
        <Image
          src={heroSrc}
          alt={bizName}
          fill
          className="object-cover opacity-60"
          priority
          sizes="100vw"
        />

        {/* Nav bar inside hero */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/70">{c("top_brand_label", "OYRB")}</span>
          <a
            href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
            style={{ backgroundColor: "white", color: ink, borderRadius: radius / 2 }}
            className="px-4 py-1.5 text-xs font-bold transition-opacity hover:opacity-90"
          >
            {c("top_book_label", "Book Now")}
          </a>
        </div>

        {/* Business info over cover */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
          <div className="flex items-end gap-4">
            <div
              className="relative h-16 w-16 shrink-0 overflow-hidden border-2 border-white md:h-20 md:w-20"
              style={{ borderRadius: radius }}
            >
              <Image src={profileSrc || ""} alt={bizName} fill className="object-cover" sizes="80px" />
            </div>
            <div>
              <span
                className="mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: accent2, color: ink }}
              >
                {c("hero_badge", "Now booking")}
              </span>
              <h1 className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: displayFont }}>
                {bizName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/70">
                <span className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={10} fill={accent2} style={{ color: accent2 }} />
                  ))}
                  <span className="ml-1">{c("hero_rating", "5.0 (48 reviews)")}</span>
                </span>
                <span className="flex items-center gap-1"><MapPin size={11} />{bizLocation}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick info bar ── */}
      <div className="px-6 py-3" style={{ borderBottom: `1px solid ${border}`, backgroundColor: surface }}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 text-xs" style={{ color: muted }}>
          <span className="flex items-center gap-1"><Phone size={11} />{bizPhone}</span>
          {bizInstagram && (
            <a href={bizInstagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition-opacity hover:opacity-70">
              <Link2 size={11} /> Instagram
            </a>
          )}
          <span className="ml-auto font-medium" style={{ color: ink }}>{bizTagline}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[1fr_280px]">

          {/* Left: Services + Gallery */}
          <main>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ fontFamily: displayFont }}>{c("section_services_title", "Services")}</h2>
              <span className="text-xs" style={{ color: muted }}>{svcs.length} available</span>
            </div>

            <div className="flex flex-col gap-3">
              {svcs.map((svc) => (
                <div
                  key={svc.id}
                  className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md"
                  style={{ borderRadius: radius, border: `1px solid ${border}`, backgroundColor: surface }}
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold leading-tight">{svc.name}</h3>
                        {svc.description && (
                          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: muted }}>
                            {svc.description}
                          </p>
                        )}
                        <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: muted }}>
                          <Clock size={11} />{formatDuration(svc.duration_minutes)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold">{formatPrice(svc.price_cents)}</p>
                        <a
                          href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
                          style={{ backgroundColor: accent, color: "#FFFFFF", borderRadius: radius / 2 }}
                          className="mt-1 block px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                        >
                          {c("service_book_label", "Book")}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Photo gallery */}
            {galleryUrls.length > 0 && (
              <section className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold" style={{ fontFamily: displayFont }}>{c("section_gallery_title", "Photos")}</h2>
                  <span className="text-xs" style={{ color: muted }}>{galleryUrls.length} photos</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {galleryUrls.slice(0, 6).map((id, i) => (
                    <div
                      key={i}
                      className={`relative overflow-hidden ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                      style={{
                        borderRadius: radius / 2,
                        aspectRatio: i === 0 ? "auto" : "1",
                        minHeight: i === 0 ? "200px" : "auto",
                      }}
                    >
                      <Image
                        src={id}
                        alt={`Photo ${i + 1}`}
                        fill={i === 0}
                        width={i !== 0 ? 200 : undefined}
                        height={i !== 0 ? 200 : undefined}
                        className={`object-cover transition-transform duration-500 hover:scale-105 ${i !== 0 ? "w-full aspect-square" : ""}`}
                        sizes={i === 0 ? "66vw" : "33vw"}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* Right: Sidebar */}
          <aside className="flex flex-col gap-4">

            {/* Book CTA */}
            <div className="p-5" style={{ borderRadius: radius, backgroundColor: btnBg, color: btnText }}>
              <p className="text-sm font-semibold">{bizName}</p>
              <p className="mt-1 text-xs opacity-60">{bizTagline}</p>
              <a
                href="#book"
            onClick={(e) => { e.preventDefault(); (window as unknown as { __oyrbOpenBooking?: () => void }).__oyrbOpenBooking?.(); }}
                style={{ borderRadius: radius / 2, backgroundColor: surface, color: ink }}
                className="mt-4 block w-full py-3 text-center text-sm font-bold transition-opacity hover:opacity-90"
              >
                {c("sidebar_cta_label", "Request a Booking")}
              </a>
            </div>

            {/* Hours */}
            <div className="p-5" style={{ borderRadius: radius, border: `1px solid ${border}`, backgroundColor: surface }}>
              <h3 className="mb-3 text-sm font-bold">{c("section_hours_title", "Hours")}</h3>
              <div className="flex flex-col gap-2">
                {hrs.map((h) => (
                  <div key={h.day} className="flex justify-between text-xs">
                    <span className="font-medium" style={{ color: h.open ? ink : `${muted}66` }}>{h.day.slice(0, 3)}</span>
                    <span style={{ color: h.open ? muted : `${muted}66` }}>
                      {h.open ? `${formatTime(h.open_time)} – ${formatTime(h.close_time)}` : "Closed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="p-5" style={{ borderRadius: radius, border: `1px solid ${border}`, backgroundColor: surface }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">{c("section_reviews_title", "Reviews")}</h3>
                <div className="flex items-center gap-1">
                  <Star size={12} fill="gold" className="text-yellow-400" />
                  <span className="text-xs font-semibold">5.0</span>
                </div>
              </div>
              {[
                { text: c("review_1_body",  "She's amazing! My hair has never looked better."), author: c("review_1_name", "Tasha M.") },
                { text: c("review_2_body",  "Booked same week, easy process, stunning results."), author: c("review_2_name", "Renee A.") },
              ].map((r) => (
                <div key={r.author} className="mb-3 pb-3 last:mb-0 last:pb-0" style={{ borderBottom: `1px solid ${border}` }}>
                  <p className="text-xs leading-relaxed" style={{ color: muted }}>&ldquo;{r.text}&rdquo;</p>
                  <p className="mt-1 text-xs font-semibold">{r.author}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-8 px-6 py-8 text-center text-xs" style={{ borderTop: `1px solid ${border}`, backgroundColor: surface, color: muted }}>
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