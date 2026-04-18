import Image from "next/image";
import { MapPin, Clock } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";
import { unsplash, SAMPLE_HOURS } from "@/lib/template-images";
import type { SampleBusiness, SampleService, SampleHour } from "@/lib/sample-data";

interface CleanTemplateProps {
  business?: SampleBusiness;
  services?: SampleService[];
  hours?: SampleHour[];
  theme?: TemplateTheme;
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

export function CleanTemplate({ business, services, hours, theme }: CleanTemplateProps) {
  const bg = theme?.bg ?? "#FFFFFF";
  const surface = theme?.surface ?? "#FFFFFF";
  const ink = theme?.ink ?? "#111111";
  const muted = theme?.muted ?? "#888888";
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
  const heroId = biz?.heroImageId ?? "1522337360426-a1af4b2b9f90";
  const profileId = biz?.profileImageId ?? "1519699047748-de8e457a634e";
  const galleryIds = biz?.galleryIds ?? [];

  const svcs = services ?? [];
  const hrs = hours ?? SAMPLE_HOURS;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bg, color: ink }}>

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
              <Image src={unsplash(profileId, 96)} alt={bizName} fill className="object-cover" sizes="48px" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight" style={{ fontFamily: displayFont }}>{bizName}</h1>
              <p className="text-xs" style={{ color: muted }}>{bizTagline}</p>
            </div>
          </div>
          <a
            href={`mailto:${bizEmail}`}
            style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius / 2 }}
            className="px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Book Now
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[1fr_320px]">

          {/* Left: Services */}
          <main>
            <h2 className="mb-1 text-xl font-semibold" style={{ fontFamily: displayFont }}>Select a service</h2>
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
                    href={`mailto:${bizEmail}?subject=Booking: ${svc.name}`}
                    className="shrink-0 px-4 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderRadius: radius / 2,
                      border: `1px solid ${border}`,
                    }}

                  >
                    Select
                  </a>
                </div>
              ))}
            </div>
          </main>

          {/* Right: Sidebar */}
          <aside className="flex flex-col gap-5">

            {/* Hero photo */}
            <div className="relative h-52 w-full overflow-hidden" style={{ borderRadius: radius }}>
              <Image src={unsplash(heroId, 640)} alt={bizName} fill className="object-cover" sizes="320px" />
            </div>

            {/* Hours card */}
            <div className="p-5" style={{ borderRadius: radius, border: `1px solid ${border}` }}>
              <h3 className="mb-3 text-sm font-semibold">Hours</h3>
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
              <h3 className="mb-2 text-sm font-semibold">Location</h3>
              <p className="flex items-start gap-1.5 text-xs" style={{ color: muted }}>
                <MapPin size={12} className="mt-0.5 shrink-0" />{bizLocation}
              </p>
            </div>

            {/* CTA */}
            <a
              href={`mailto:${bizEmail}`}
              style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius }}
              className="block w-full py-3.5 text-center text-sm font-medium transition-opacity hover:opacity-80"
            >
              Request a Booking
            </a>
          </aside>
        </div>

        {/* Gallery strip */}
        {galleryIds.length > 0 && (
          <section className="mt-12 pt-10" style={{ borderTop: `1px solid ${border}` }}>
            <h2 className="mb-5 text-lg font-semibold" style={{ fontFamily: displayFont }}>Recent Work</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {galleryIds.map((id, i) => (
                <div key={i} className="relative h-40 w-40 shrink-0 overflow-hidden" style={{ borderRadius: radius / 2 }}>
                  <Image
                    src={unsplash(id, 320)}
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
        <p>{bizName} · {bizLocation}</p>
        <p className="mt-1">Powered by OYRB</p>
      </footer>
    </div>
  );
}
