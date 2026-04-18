import Image from "next/image";
import { MapPin, Phone, Link2, Clock } from "lucide-react";
import type { TemplateTheme } from "@/lib/template-themes";
import { unsplash, SAMPLE_HOURS } from "@/lib/template-images";
import type { SampleBusiness, SampleService, SampleHour } from "@/lib/sample-data";

interface StudioTemplateProps {
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

export function StudioTemplate({ business, services, hours, theme }: StudioTemplateProps) {
  const bg = theme?.bg ?? "#F5F0EA";
  const surface = theme?.surface ?? "#FFFAF5";
  const ink = theme?.ink ?? "#2D1B0E";
  const muted = theme?.muted ?? "#7A5C45";
  const accent = theme?.accent ?? "#C17B5A";
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
  const heroId = biz?.heroImageId ?? "1522337360426-a1af4b2b9f90";
  const profileId = biz?.profileImageId ?? "1519699047748-de8e457a634e";
  const galleryIds = biz?.galleryIds ?? [];

  const svcs = services ?? [];
  const hrs = hours ?? SAMPLE_HOURS;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: bg, color: ink }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 px-6 py-4"
        style={{ backgroundColor: `${bg}f5`, backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}` }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-semibold" style={{ fontFamily: displayFont }}>{bizName}</h1>
          <a
            href={`mailto:${bizEmail}`}
            style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius }}
            className="px-5 py-2 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Book Now
          </a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative">
        <div className="relative h-72 w-full overflow-hidden md:h-96">
          <Image
            src={unsplash(heroId, 1400)}
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
              <Image src={unsplash(profileId, 192)} alt={bizName} fill className="object-cover" sizes="96px" />
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
              href={`mailto:${bizEmail}`}
              style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius }}
              className="shrink-0 px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            >
              Book Now
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
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-6 text-2xl font-semibold" style={{ fontFamily: displayFont }}>Services</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {svcs.map((svc, i) => (
            <div
              key={svc.id}
              className="overflow-hidden shadow-sm"
              style={{ backgroundColor: surface, borderRadius: radius }}
            >
              <div className="relative h-40 w-full overflow-hidden">
                <Image
                  src={unsplash(galleryIds[i % galleryIds.length] ?? heroId, 500)}
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
                  href={`mailto:${bizEmail}?subject=Booking Request: ${svc.name}`}
                  style={{ backgroundColor: btnBg, color: btnText, borderRadius: radius }}
                  className="mt-4 block w-full py-2 text-center text-sm font-medium transition-opacity hover:opacity-80"
                >
                  Book
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gallery ── */}
      {galleryIds.length > 0 && (
        <section className="py-16 px-6" style={{ borderTop: `1px solid ${border}` }}>
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-2xl font-semibold" style={{ fontFamily: displayFont }}>Portfolio</h2>
            <div className="columns-2 gap-3 md:columns-3">
              {galleryIds.map((id, i) => (
                <div key={i} className="mb-3 overflow-hidden" style={{ borderRadius: radius / 2 }}>
                  <Image
                    src={unsplash(id, 400)}
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
          <h2 className="mb-6 text-2xl font-semibold" style={{ fontFamily: displayFont }}>Hours</h2>
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

      {/* ── Footer ── */}
      <footer className="py-8 px-6 text-center text-xs" style={{ borderTop: `1px solid ${border}`, color: muted }}>
        <p>{bizName} · {bizLocation}</p>
        <p className="mt-1">Powered by OYRB</p>
      </footer>
    </div>
  );
}
